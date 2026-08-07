const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const path = require('path');
const pool = require('../db/pool');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// List all offices and submission statuses (optionally filtered by year)
router.get('/submissions', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const [rows] = await pool.query(`
      SELECT 
        o.id as office_id,
        o.office_name,
        o.department,
        o.contact_person,
        o.email,
        s.id as submission_id,
        s.fiscal_year,
        s.status,
        s.submitted_at,
        s.approved_at,
        s.part1_grand_total_d,
        s.part2_grand_total_d,
        s.overall_grand_total
      FROM offices o
      LEFT JOIN submissions s ON o.id = s.office_id AND s.fiscal_year = ?
      WHERE o.is_admin = 0
      ORDER BY o.office_name ASC
    `, [year]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching admin submissions:', error);
    res.status(500).json({ message: 'Error fetching submissions list' });
  }
});

// Get all distinct fiscal years recorded in submissions
router.get('/fiscal-years', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT fiscal_year FROM submissions ORDER BY fiscal_year DESC'
    );
    res.json(rows.map(r => r.fiscal_year));
  } catch (error) {
    console.error('Error fetching fiscal years:', error);
    res.status(500).json({ message: 'Error fetching fiscal years' });
  }
});

// Get consolidated view — all Part I & Part II items with totals across all offices for a given year
router.get('/consolidated/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (!year) return res.status(400).json({ message: 'Invalid fiscal year' });

    // Get all offices with a submission for this year
    const [offices] = await pool.query(
      `SELECT o.id as office_id, o.office_name, s.id as submission_id, s.status,
              s.part1_grand_total_d, s.part2_grand_total_d, s.overall_grand_total
       FROM offices o
       JOIN submissions s ON o.id = s.office_id AND s.fiscal_year = ?
       WHERE o.is_admin = 0
       ORDER BY o.office_name ASC`,
      [year]
    );

    const submissionIds = offices.map(o => o.submission_id).filter(Boolean);

    // Get all Part I and Part II master items
    const [part1Items] = await pool.query('SELECT * FROM part1_items ORDER BY item_no ASC');
    const [part2Items] = await pool.query('SELECT * FROM part2_items ORDER BY item_no ASC');

    // Get all submission entries for these submissions
    let allEntries = [];
    if (submissionIds.length > 0) {
      const placeholders = submissionIds.map(() => '?').join(',');
      const [entries] = await pool.query(
        `SELECT se.*, s.office_id
         FROM submission_entries se
         JOIN submissions s ON se.submission_id = s.id
         WHERE se.submission_id IN (${placeholders})`,
        submissionIds
      );
      allEntries = entries;
    }

    // Build a map: item_part_itemId -> { officeId -> entry }
    const entriesByItem = {};
    allEntries.forEach(e => {
      const key = `${e.item_part}_${e.item_id}`;
      if (!entriesByItem[key]) entriesByItem[key] = {};
      entriesByItem[key][e.office_id] = e;
    });

    // Helper: aggregate qty fields across all offices for a given item key
    const aggregateItem = (itemKey) => {
      const officeMap = entriesByItem[itemKey] || {};
      const agg = { jan:0, feb:0, mar:0, apr:0, may:0, jun:0, jul:0, aug:0, sep:0, oct:0, nov:0, decm:0 };
      const perOffice = {};
      Object.entries(officeMap).forEach(([officeId, e]) => {
        ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','decm'].forEach(m => {
          agg[m] += (e[m] || 0);
        });
        const totalQty = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','decm'].reduce((s, m) => s + (e[m] || 0), 0);
        perOffice[officeId] = { ...e, totalQty };
      });
      const totalQty = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','decm'].reduce((s, m) => s + agg[m], 0);
      return { agg, totalQty, perOffice };
    };

    // Build consolidated Part I
    const consolidatedPart1 = part1Items.map(item => {
      const itemKey = `1_${item.id}`;
      const { agg, totalQty, perOffice } = aggregateItem(itemKey);
      const unitPrice = parseFloat(item.unit_price || 0);
      const totalAmount = totalQty * unitPrice;
      return {
        ...item,
        item_part: 1,
        agg,
        totalQty,
        totalAmount,
        unitPrice,
        perOffice
      };
    });

    // Build consolidated Part II — unit price may vary per office, use average or max
    const consolidatedPart2 = part2Items.map(item => {
      const itemKey = `2_${item.id}`;
      const { agg, totalQty, perOffice } = aggregateItem(itemKey);
      // Use the first found unit_price from any office entry (or item default)
      let unitPrice = parseFloat(item.unit_price || 0);
      const officeEntries = Object.values(entriesByItem[itemKey] || {});
      if (officeEntries.length > 0) {
        const prices = officeEntries.map(e => parseFloat(e.unit_price || 0)).filter(p => p > 0);
        if (prices.length > 0) unitPrice = Math.max(...prices);
      }
      const totalAmount = totalQty * unitPrice;
      return {
        ...item,
        item_part: 2,
        agg,
        totalQty,
        totalAmount,
        unitPrice,
        perOffice
      };
    });

    // Compute grand totals
    const part1GrandTotal = consolidatedPart1.reduce((s, i) => s + i.totalAmount, 0);
    const part2GrandTotal = consolidatedPart2.reduce((s, i) => s + i.totalAmount, 0);
    const overallGrandTotal = part1GrandTotal + part2GrandTotal;

    res.json({
      year,
      offices,
      part1: consolidatedPart1,
      part2: consolidatedPart2,
      part1GrandTotal,
      part2GrandTotal,
      overallGrandTotal
    });
  } catch (error) {
    console.error('Error fetching consolidated view:', error);
    res.status(500).json({ message: 'Error fetching consolidated data' });
  }
});

// Copy all submission entries from one fiscal year to another (as draft)
router.post('/copy-year', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { from_year, to_year } = req.body;
    if (!from_year || !to_year || from_year === to_year) {
      return res.status(400).json({ message: 'Valid and distinct from_year and to_year are required.' });
    }

    await connection.beginTransaction();

    // Get all submissions for from_year
    const [sourceSubmissions] = await connection.query(
      `SELECT s.*, o.office_name FROM submissions s
       JOIN offices o ON s.office_id = o.id
       WHERE s.fiscal_year = ? AND o.is_admin = 0`,
      [from_year]
    );

    if (sourceSubmissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: `No submissions found for fiscal year ${from_year}.` });
    }

    let copied = 0;
    let skipped = 0;

    for (const src of sourceSubmissions) {
      // Check if the office already has a submission for to_year
      const [existing] = await connection.query(
        'SELECT id FROM submissions WHERE office_id = ? AND fiscal_year = ?',
        [src.office_id, to_year]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Create new draft submission for to_year
      const [newSub] = await connection.query(
        `INSERT INTO submissions (
          office_id, fiscal_year, department_bureau, agency_code_uacs, region, org_type,
          address, contact_person, position, email, telephone_mobile,
          prepared_by_name, certified_by_name, approved_by_name,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          src.office_id, to_year,
          src.department_bureau, src.agency_code_uacs, src.region, src.org_type,
          src.address, src.contact_person, src.position, src.email, src.telephone_mobile,
          src.prepared_by_name, src.certified_by_name, src.approved_by_name
        ]
      );

      const newSubId = newSub.insertId;

      // Copy all submission_entries from old submission to new
      const [entries] = await connection.query(
        'SELECT * FROM submission_entries WHERE submission_id = ?',
        [src.id]
      );

      for (const e of entries) {
        await connection.query(
          `INSERT INTO submission_entries (
            submission_id, item_id, item_part,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newSubId, e.item_id, e.item_part,
            e.jan, e.feb, e.mar, e.apr, e.may, e.jun,
            e.jul, e.aug, e.sep, e.oct, e.nov, e.decm, e.unit_price
          ]
        );
      }

      copied++;
    }

    await connection.commit();

    res.json({
      message: `Copy complete! ${copied} office submission(s) copied to FY ${to_year} as draft. ${skipped > 0 ? `${skipped} skipped (already had a submission for FY ${to_year}).` : ''}`,
      copied,
      skipped
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error copying year submissions:', error);
    res.status(500).json({ message: 'Error copying submissions to new fiscal year' });
  } finally {
    connection.release();
  }
});

// View specific office submission details
router.get('/submission/:id', async (req, res) => {
  try {
    const submissionId = req.params.id;

    const [submissions] = await pool.query(
      `SELECT s.*, o.office_name 
       FROM submissions s 
       JOIN offices o ON s.office_id = o.id 
       WHERE s.id = ?`,
      [submissionId]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = submissions[0];

    const [entries] = await pool.query(
      'SELECT * FROM submission_entries WHERE submission_id = ?',
      [submissionId]
    );

    const entriesMap = {};
    entries.forEach(e => {
      entriesMap[`${e.item_part}_${e.item_id}`] = e;
    });

    res.json({
      submission,
      entriesMap
    });
  } catch (error) {
    console.error('Error fetching specific submission:', error);
    res.status(500).json({ message: 'Error fetching submission details' });
  }
});

// Approve, Reject, or Reset submission status
router.post('/approve/:id', async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { action, remarks } = req.body; // 'approve', 'reject', or 'reset'

    let newStatus = 'approved';
    let approvedAt = new Date();

    if (action === 'reset') {
      newStatus = 'draft';
      approvedAt = null;
    } else if (action === 'reject') {
      newStatus = 'rejected';
      approvedAt = null;
    }

    await pool.query(
      'UPDATE submissions SET status = ?, approved_at = ? WHERE id = ?',
      [newStatus, approvedAt, submissionId]
    );

    // Send notification to office
    const [subRows] = await pool.query(
      'SELECT office_id, fiscal_year FROM submissions WHERE id = ?',
      [submissionId]
    );

    if (subRows.length > 0) {
      const { office_id, fiscal_year } = subRows[0];
      let notifTitle = '';
      let notifMessage = '';
      let notifType = 'info';

      if (action === 'approve') {
        notifTitle = 'APP-CSE Submission Approved!';
        notifMessage = `Your APP-CSE submission for FY ${fiscal_year} has been approved by the Supply Office (Admin).`;
        notifType = 'approved';
      } else if (action === 'reject') {
        notifTitle = 'APP-CSE Submission Returned / Rejected';
        notifMessage = `Your APP-CSE submission for FY ${fiscal_year} has been returned by Admin for revisions.${remarks ? ` Feedback: "${remarks}"` : ''}`;
        notifType = 'rejected';
      } else if (action === 'reset') {
        notifTitle = 'APP-CSE Submission Status Reset';
        notifMessage = `Your APP-CSE submission status for FY ${fiscal_year} was reset to draft by Admin.`;
        notifType = 'info';
      }

      if (notifTitle) {
        await pool.query(
          `INSERT INTO notifications (office_id, title, message, type, target_id, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
          [office_id, notifTitle, notifMessage, notifType, submissionId]
        );
      }
    }

    res.json({ message: `Submission status updated to ${newStatus}` });
  } catch (error) {
    console.error('Error updating submission status:', error);
    res.status(500).json({ message: 'Error updating submission status' });
  }
});

// GET all office accounts list
router.get('/offices-list', async (req, res) => {
  try {
    const [offices] = await pool.query(
      'SELECT id, office_name, is_admin, department, contact_person, email, telephone, created_at FROM offices ORDER BY is_admin DESC, office_name ASC'
    );
    res.json(offices);
  } catch (error) {
    console.error('Error fetching offices list:', error);
    res.status(500).json({ message: 'Error fetching office accounts' });
  }
});

// Create new office account
router.post('/offices', async (req, res) => {
  try {
    const { office_name, department, contact_person, position, email, telephone, password } = req.body;

    if (!office_name || !office_name.trim()) {
      return res.status(400).json({ message: 'Office name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required for office account creation' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'Password is required for office account creation' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email is already used by another office
    const [existingEmail] = await pool.query(
      'SELECT id, office_name FROM offices WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({
        message: `The email address "${email}" is already used by ${existingEmail[0].office_name}. Please enter a unique email address.`
      });
    }

    const password_hash = await bcrypt.hash(password.trim(), 10);

    const [result] = await pool.query(
      `INSERT INTO offices (
        office_name, password_hash, is_admin, department, contact_person, position, email, telephone
      ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
      [office_name.trim(), password_hash, department || '', contact_person || '', position || '', cleanEmail, telephone || '']
    );

    // Create initial submission for office
    await pool.query(
      `INSERT INTO submissions (
        office_id, fiscal_year, department_bureau, status
      ) VALUES (?, 2027, ?, 'draft')`,
      [result.insertId, office_name.trim()]
    );

    res.json({
      message: 'Office account created successfully!',
      office_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating office account:', error);
    res.status(500).json({ message: 'Error creating office account' });
  }
});

// Update office account details (and optional password)
router.put('/office/:id', async (req, res) => {
  try {
    const officeId = req.params.id;
    const { office_name, department, contact_person, position, email, telephone, password } = req.body;

    if (!office_name || !office_name.trim()) {
      return res.status(400).json({ message: 'Office name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check email uniqueness excluding current office
    const [existingEmail] = await pool.query(
      'SELECT id, office_name FROM offices WHERE LOWER(email) = ? AND id != ?',
      [cleanEmail, officeId]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({
        message: `The email address "${email}" is already used by ${existingEmail[0].office_name}.`
      });
    }

    await pool.query(
      `UPDATE offices SET
        office_name = ?,
        department = ?,
        contact_person = ?,
        position = ?,
        email = ?,
        telephone = ?
      WHERE id = ?`,
      [office_name.trim(), department || '', contact_person || '', position || '', cleanEmail, telephone || '', officeId]
    );

    if (password && password.trim()) {
      const password_hash = await bcrypt.hash(password.trim(), 10);
      await pool.query('UPDATE offices SET password_hash = ? WHERE id = ?', [password_hash, officeId]);
    }

    res.json({ message: `Office "${office_name}" updated successfully!` });
  } catch (error) {
    console.error('Error updating office account:', error);
    res.status(500).json({ message: 'Error updating office account' });
  }
});


// GET pending password reset requests for Admin notification bell
router.get('/reset-requests', async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT r.*, o.email as office_email 
       FROM password_reset_requests r 
       JOIN offices o ON r.office_id = o.id 
       WHERE r.status = 'pending' 
       ORDER BY r.requested_at DESC`
    );
    res.json(requests);
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    res.status(500).json({ message: 'Error fetching reset requests' });
  }
});

// Approve password reset request and email new password to office
router.post('/approve-reset-request', async (req, res) => {
  try {
    const { request_id } = req.body;
    if (!request_id) return res.status(400).json({ message: 'Request ID is required' });

    const [requests] = await pool.query(
      `SELECT r.*, o.email as office_email, o.office_name as current_office_name 
       FROM password_reset_requests r 
       JOIN offices o ON r.office_id = o.id 
       WHERE r.id = ?`,
      [request_id]
    );

    if (requests.length === 0) return res.status(404).json({ message: 'Reset request not found' });

    const request = requests[0];
    const recipientEmail = request.office_email || request.email;

    // Generate new raw password
    const prefix = request.current_office_name.substring(0, 6).toUpperCase().replace(/[^A-Z]/g, 'OFFICE');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const rawPassword = `${prefix}-${randomSuffix}`;
    const newHash = await bcrypt.hash(rawPassword, 10);

    // Update office password
    await pool.query('UPDATE offices SET password_hash = ? WHERE id = ?', [newHash, request.office_id]);

    // Update request status
    await pool.query(
      'UPDATE password_reset_requests SET status = "approved", resolved_at = NOW() WHERE id = ?',
      [request_id]
    );

    // Attempt to send email via nodemailer
    let emailStatus = 'Password updated in database';
    try {
      const nodemailer = require('nodemailer');
      const senderUser = process.env.SMTP_USER || 'marsogphi@gmail.com';
      const senderPass = process.env.SMTP_PASS;

      let transporter;
      if (senderPass) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: senderUser,
            pass: senderPass
          }
        });
      } else {
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false
        });
      }

      await transporter.sendMail({
        from: `"Supply Office Admin" <${senderUser}>`,
        to: recipientEmail,
        subject: 'APP-CSE 2027 System - Password Reset Approved',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 520px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">APP-CSE 2027 System</h2>
            <p style="font-size: 15px; color: #334155;">Hello <strong>${request.current_office_name}</strong>,</p>
            <p style="font-size: 14px; color: #475569;">Your request for a password reset has been approved by Supply Office Admin.</p>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <span style="font-size: 13px; color: #64748b; display: block; margin-bottom: 6px; font-weight: 600;">YOUR NEW LOGIN PASSWORD:</span>
              <strong style="font-size: 24px; font-family: monospace; color: #0f172a; letter-spacing: 2px;">${rawPassword}</strong>
            </div>
            <p style="font-size: 13px; color: #64748b;">Please use this new password to log in. You can also change your password anytime under your profile menu.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Supply Office Admin — APP-CSE 2027 System</p>
          </div>
        `
      });
      emailStatus = `Real-time email sent to ${recipientEmail}`;
    } catch (mailErr) {
      console.error('Nodemailer dispatch error:', mailErr.message);
      emailStatus = `Password reset & email prepared for ${recipientEmail}`;
    }

    res.json({
      message: `Password reset approved for ${request.current_office_name}! ${emailStatus}`,
      rawPassword,
      recipientEmail
    });
  } catch (error) {
    console.error('Error approving reset request:', error);
    res.status(500).json({ message: 'Error approving password reset request' });
  }
});



// Export submission to official APP-CSE 2027 Excel Template format
router.get('/export/:id', async (req, res) => {
  try {
    const submissionId = req.params.id;
    const onlyWithValues = req.query.onlyWithValues === 'true';

    const [submissions] = await pool.query(
      `SELECT s.*, o.office_name FROM submissions s JOIN offices o ON s.office_id = o.id WHERE s.id = ?`,
      [submissionId]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const sub = submissions[0];

    // Load master items & quantity entries
    const [part1Items] = await pool.query('SELECT * FROM part1_items ORDER BY item_no ASC');
    const [part2Items] = await pool.query('SELECT * FROM part2_items ORDER BY item_no ASC');
    const [entries] = await pool.query('SELECT * FROM submission_entries WHERE submission_id = ?', [submissionId]);

    const entriesMap = {};
    entries.forEach(e => {
      entriesMap[`${e.item_part}_${e.item_id}`] = e;
    });

    // Create workbook using exceljs
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('APP-CSE 2027');

    // Title Block
    sheet.addRow(['APP-CSE 2027 FORM']);
    sheet.addRow(['ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2027 FORM']);
    sheet.addRow([]);

    // Agency Header Block
    sheet.addRow(['Department/Bureau/Office:', sub.department_bureau || sub.office_name, '', 'Agency Code/UACS:', sub.agency_code_uacs || '', '', '', '', '', 'Contact Person:', sub.contact_person || '']);
    sheet.addRow(['Region:', sub.region || '', '', 'Organization Type:', sub.org_type || '', '', '', '', '', 'Position:', sub.position || '']);
    sheet.addRow(['Address:', sub.address || '', '', 'E-mail :', sub.email || '']);
    sheet.addRow(['', '', '', 'Telephone/Mobile Nos: ', sub.telephone_mobile || '']);
    sheet.addRow([]);

    // Column Headers (27 Columns)
    const headerRow1 = [
      'Item No', 'Item Code', 'Item Description / Specifications', 'Unit of Measure',
      'Monthly Quantity Requirement', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Total Qty for Year', 'Unit Price', 'Total Amount'
    ];
    const headerRow2 = [
      '', '', '', '',
      'Jan', 'Feb', 'Mar', 'Q1 Qty', 'Q1 Amount',
      'Apr', 'May', 'June', 'Q2 Qty', 'Q2 Amount',
      'Jul', 'Aug', 'Sept', 'Q3 Qty', 'Q3 Amount',
      'Oct', 'Nov', 'Dec', 'Q4 Qty', 'Q4 Amount',
      '', '', ''
    ];

    sheet.addRow(headerRow1);
    sheet.addRow(headerRow2);

    let part1Subtotal = 0;

    // PART I ITEMS
    sheet.addRow(['PART I. AVAILABLE AT PS-DBM (Common-Use Supplies and Equipment)']);

    part1Items.forEach(item => {
      const entry = entriesMap[`1_${item.id}`] || {};
      const jan = entry.jan || 0, feb = entry.feb || 0, mar = entry.mar || 0;
      const apr = entry.apr || 0, may = entry.may || 0, jun = entry.jun || 0;
      const jul = entry.jul || 0, aug = entry.aug || 0, sep = entry.sep || 0;
      const oct = entry.oct || 0, nov = entry.nov || 0, decm = entry.decm || 0;

      const q1Qty = jan + feb + mar;
      const q2Qty = apr + may + jun;
      const q3Qty = jul + aug + sep;
      const q4Qty = oct + nov + decm;
      const totalQty = q1Qty + q2Qty + q3Qty + q4Qty;
      const unitPrice = parseFloat(item.unit_price || 0);

      const q1Amt = q1Qty * unitPrice;
      const q2Amt = q2Qty * unitPrice;
      const q3Amt = q3Qty * unitPrice;
      const q4Amt = q4Qty * unitPrice;
      const totalAmt = totalQty * unitPrice;

      if (onlyWithValues && totalQty === 0) return;

      part1Subtotal += totalAmt;

      sheet.addRow([
        item.item_no, item.product_code, item.specification, item.unit,
        jan, feb, mar, q1Qty, q1Amt,
        apr, may, jun, q2Qty, q2Amt,
        jul, aug, sep, q3Qty, q3Amt,
        oct, nov, decm, q4Qty, q4Amt,
        totalQty, unitPrice, totalAmt
      ]);
    });

    const part1Provision = part1Subtotal * 0.10;
    const part1Freight = parseFloat(sub.part1_freight_c || 0);
    const part1GrandTotal = part1Subtotal + part1Provision + part1Freight;

    sheet.addRow([]);
    sheet.addRow(['', '', 'A. TOTAL PART I (Sum of all Part I Items)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part1Subtotal]);
    sheet.addRow(['', '', 'B. ADDITIONAL PROVISION FOR INFLATION (10% of Part I Total)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part1Provision]);
    sheet.addRow(['', '', 'C. ESTIMATED FREIGHT AND HANDLING COST (If applicable)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part1Freight]);
    sheet.addRow(['', '', 'D. GRAND TOTAL PART I (A + B + C)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part1GrandTotal]);
    sheet.addRow([]);

    let part2Subtotal = 0;

    // PART II ITEMS
    sheet.addRow(['PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM (Other Supplies and Equipment)']);

    part2Items.forEach(item => {
      const entry = entriesMap[`2_${item.id}`] || {};
      const jan = entry.jan || 0, feb = entry.feb || 0, mar = entry.mar || 0;
      const apr = entry.apr || 0, may = entry.may || 0, jun = entry.jun || 0;
      const jul = entry.jul || 0, aug = entry.aug || 0, sep = entry.sep || 0;
      const oct = entry.oct || 0, nov = entry.nov || 0, decm = entry.decm || 0;

      const q1Qty = jan + feb + mar;
      const q2Qty = apr + may + jun;
      const q3Qty = jul + aug + sep;
      const q4Qty = oct + nov + decm;
      const totalQty = q1Qty + q2Qty + q3Qty + q4Qty;
      const unitPrice = parseFloat(entry.unit_price || 0);

      const q1Amt = q1Qty * unitPrice;
      const q2Amt = q2Qty * unitPrice;
      const q3Amt = q3Qty * unitPrice;
      const q4Amt = q4Qty * unitPrice;
      const totalAmt = totalQty * unitPrice;

      if (onlyWithValues && totalQty === 0) return;

      part2Subtotal += totalAmt;

      sheet.addRow([
        item.item_no, item.product_code, item.specification, item.unit,
        jan, feb, mar, q1Qty, q1Amt,
        apr, may, jun, q2Qty, q2Amt,
        jul, aug, sep, q3Qty, q3Amt,
        oct, nov, decm, q4Qty, q4Amt,
        totalQty, unitPrice, totalAmt
      ]);
    });

    const part2Provision = part2Subtotal * 0.10;
    const part2Freight = parseFloat(sub.part2_freight_c || 0);
    const part2GrandTotal = part2Subtotal + part2Provision + part2Freight;

    sheet.addRow([]);
    sheet.addRow(['', '', 'A. TOTAL PART II (Sum of all Part II Items)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part2Subtotal]);
    sheet.addRow(['', '', 'B. ADDITIONAL PROVISION FOR INFLATION (10% of Part II Total)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part2Provision]);
    sheet.addRow(['', '', 'C. ESTIMATED FREIGHT AND HANDLING COST (If applicable)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part2Freight]);
    sheet.addRow(['', '', 'D. GRAND TOTAL PART II (A + B + C)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', part2GrandTotal]);
    sheet.addRow([]);

    const overallGrandTotal = part1GrandTotal + part2GrandTotal;
    sheet.addRow(['', '', 'OVERALL COMBINED GRAND TOTAL (PART I + PART II)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', overallGrandTotal]);
    sheet.addRow([]);

    // Signatures Block
    sheet.addRow(['Prepared By:', sub.prepared_by_name || '__________________________', '', 'Certified Funds Available / Certified Correct:', sub.certified_by_name || '__________________________', '', 'Approved By:', sub.approved_by_name || '__________________________']);
    sheet.addRow(['Date:', sub.date_prepared ? new Date(sub.date_prepared).toLocaleDateString() : '__________________________']);

    // Send spreadsheet download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=APP_CSE_2027_${sub.office_name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ message: 'Error exporting Excel file' });
  }
});

// Get all pending and reviewed additional requests for Admin Notification & Review
router.get('/additional-requests', async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT r.*, s.status as submission_status, o.email as office_email
       FROM additional_requests r
       JOIN submissions s ON r.submission_id = s.id
       JOIN offices o ON r.office_id = o.id
       ORDER BY r.created_at DESC`
    );

    for (let reqItem of requests) {
      const [items] = await pool.query(
        `SELECT ari.*, 
                p1.specification as p1_spec, p1.item_no as p1_no, p1.unit as p1_unit,
                p2.specification as p2_spec, p2.item_no as p2_no, p2.unit as p2_unit
         FROM additional_request_items ari
         LEFT JOIN part1_items p1 ON ari.item_part = 1 AND ari.item_id = p1.id
         LEFT JOIN part2_items p2 ON ari.item_part = 2 AND ari.item_id = p2.id
         WHERE ari.request_id = ?`,
        [reqItem.id]
      );
      reqItem.items = items;
    }

    res.json(requests);
  } catch (error) {
    console.error('Error fetching admin additional requests:', error);
    res.status(500).json({ message: 'Error fetching additional requests' });
  }
});

// Admin Review (Approve/Reject) & optional Insert into Submitted Form
router.post('/additional-request/review', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { request_id, action, feedback_notes, insert_to_form } = req.body;
    if (!request_id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Request ID and valid action (approve/reject) are required.' });
    }

    await connection.beginTransaction();

    const [requests] = await connection.query(
      'SELECT * FROM additional_requests WHERE id = ?',
      [request_id]
    );

    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Additional request not found' });
    }

    const addReq = requests[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update additional_requests status & feedback
    await connection.query(
      `UPDATE additional_requests SET status = ?, admin_feedback = ?, reviewed_at = NOW() WHERE id = ?`,
      [newStatus, feedback_notes || '', request_id]
    );

    // If APPROVED and insert_to_form is true: Merge items into existing submission_entries!
    if (action === 'approve' && insert_to_form) {
      const [reqItems] = await connection.query(
        `SELECT * FROM additional_request_items WHERE request_id = ?`,
        [request_id]
      );

      for (const item of reqItems) {
        const [existing] = await connection.query(
          `SELECT * FROM submission_entries WHERE submission_id = ? AND item_id = ? AND item_part = ?`,
          [addReq.submission_id, item.item_id, item.item_part]
        );

        if (existing.length > 0) {
          const ex = existing[0];
          await connection.query(
            `UPDATE submission_entries SET
              jan = jan + ?, feb = feb + ?, mar = mar + ?,
              apr = apr + ?, may = may + ?, jun = jun + ?,
              jul = jul + ?, aug = aug + ?, sep = sep + ?,
              oct = oct + ?, nov = nov + ?, decm = decm + ?,
              unit_price = COALESCE(NULLIF(?, 0), unit_price)
            WHERE id = ?`,
            [
              item.jan, item.feb, item.mar,
              item.apr, item.may, item.jun,
              item.jul, item.aug, item.sep,
              item.oct, item.nov, item.decm,
              item.unit_price,
              ex.id
            ]
          );
        } else {
          await connection.query(
            `INSERT INTO submission_entries (
              submission_id, item_id, item_part,
              jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              addReq.submission_id, item.item_id, item.item_part,
              item.jan, item.feb, item.mar, item.apr, item.may, item.jun,
              item.jul, item.aug, item.sep, item.oct, item.nov, item.decm,
              item.unit_price
            ]
          );
        }
      }

      // Recalculate submission totals
      const [allEntries] = await connection.query(
        `SELECT * FROM submission_entries WHERE submission_id = ?`,
        [addReq.submission_id]
      );

      const [p1ItemsList] = await connection.query(`SELECT id, unit_price FROM part1_items`);
      const p1Prices = {};
      p1ItemsList.forEach(p => p1Prices[p.id] = parseFloat(p.unit_price || 0));

      let p1Sum = 0;
      let p2Sum = 0;

      allEntries.forEach(e => {
        const qty = e.jan + e.feb + e.mar + e.apr + e.may + e.jun + e.jul + e.aug + e.sep + e.oct + e.nov + e.decm;
        if (e.item_part === 1) {
          const price = p1Prices[e.item_id] || 0;
          p1Sum += qty * price;
        } else {
          const price = parseFloat(e.unit_price || 0);
          p2Sum += qty * price;
        }
      });

      const p1Prov = p1Sum * 0.10;
      const p1Grand = p1Sum + p1Prov;

      const p2Prov = p2Sum * 0.10;
      const p2Grand = p2Sum + p2Prov;

      const overall = p1Grand + p2Grand;

      await connection.query(
        `UPDATE submissions SET
          part1_total_a = ?, part1_provision_b = ?, part1_grand_total_d = ?,
          part2_total_a = ?, part2_provision_b = ?, part2_grand_total_d = ?,
          overall_grand_total = ?
        WHERE id = ?`,
        [p1Sum, p1Prov, p1Grand, p2Sum, p2Prov, p2Grand, overall, addReq.submission_id]
      );
    }

    // Insert Notification for Office Account
    const notifTitle = action === 'approve' 
      ? 'Additional Procurement Request Approved!' 
      : 'Additional Procurement Request Status Update';

    const notifMsg = action === 'approve'
      ? `Your additional procurement request for "${addReq.office_name}" was APPROVED by Supply Office Admin.${insert_to_form ? ' Items have been inserted directly into your APP-CSE 2027 form.' : ''} ${feedback_notes ? `Note: ${feedback_notes}` : ''}`
      : `Your additional procurement request for "${addReq.office_name}" was REJECTED by Supply Office Admin. ${feedback_notes ? `Reason: ${feedback_notes}` : ''}`;

    await connection.query(
      `INSERT INTO office_notifications (office_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [addReq.office_id, notifTitle, notifMsg, action === 'approve' ? 'success' : 'danger']
    );

    await connection.commit();

    res.json({
      message: `Additional request ${action === 'approve' ? 'approved' : 'rejected'} successfully! Office has been notified.`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error reviewing additional request:', error);
    res.status(500).json({ message: 'Error reviewing additional request' });
  } finally {
    connection.release();
  }
});

// ==========================================
// ITEM & CATEGORY MANAGEMENT ENDPOINTS (PART 1 & PART 2)
// ==========================================

// GET full catalog (items & categories for Part 1 and Part 2)
router.get('/catalog', async (req, res) => {
  try {
    const [part1Items] = await pool.query('SELECT * FROM part1_items ORDER BY category ASC, item_no ASC');
    const [part2Items] = await pool.query('SELECT * FROM part2_items ORDER BY category ASC, item_no ASC');

    const [p1CatRes] = await pool.query('SELECT DISTINCT category FROM part1_items WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
    const [p2CatRes] = await pool.query('SELECT DISTINCT category FROM part2_items WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');

    const part1Categories = p1CatRes.map(c => c.category);
    const part2Categories = p2CatRes.map(c => c.category);

    res.json({
      part1: part1Items,
      part2: part2Items,
      part1Categories,
      part2Categories
    });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ message: 'Failed to fetch catalog items' });
  }
});

// POST add new item (Part 1 or Part 2)
router.post('/catalog/item', async (req, res) => {
  try {
    const { part, product_code, specification, unit, category, unit_price } = req.body;

    const targetPart = parseInt(part, 10) === 2 ? 2 : 1;
    const tableName = targetPart === 2 ? 'part2_items' : 'part1_items';

    if (!specification || !specification.trim()) {
      return res.status(400).json({ message: 'Item specification / description is required' });
    }

    if (!unit || !unit.trim()) {
      return res.status(400).json({ message: 'Unit of measure is required' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Category is required' });
    }

    // Get max item_no
    const [maxRes] = await pool.query(`SELECT COALESCE(MAX(item_no), 0) as max_no FROM ${tableName}`);
    const nextItemNo = (maxRes[0].max_no || 0) + 1;

    const priceVal = parseFloat(unit_price || 0);
    const cleanCode = (product_code || '').trim() || `ITEM-${nextItemNo}`;

    if (targetPart === 1) {
      const [result] = await pool.query(
        `INSERT INTO part1_items (item_no, product_code, specification, unit, category, unit_price, part) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [nextItemNo, cleanCode, specification.trim(), unit.trim(), category.trim(), priceVal]
      );
      res.json({ message: `Item added successfully to Part 1!`, item_id: result.insertId });
    } else {
      const [result] = await pool.query(
        `INSERT INTO part2_items (item_no, product_code, specification, unit, category, unit_price, part) VALUES (?, ?, ?, ?, ?, ?, 2)`,
        [nextItemNo, cleanCode, specification.trim(), unit.trim(), category.trim(), priceVal]
      );
      res.json({ message: `Item added successfully to Part 2!`, item_id: result.insertId });
    }
  } catch (error) {
    console.error('Error adding catalog item:', error);
    res.status(500).json({ message: 'Failed to add item to catalog' });
  }
});

// PUT update existing item details & unit price
router.put('/catalog/item/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const { part, product_code, specification, unit, category, unit_price, update_draft_entries } = req.body;

    const targetPart = parseInt(part, 10) === 2 ? 2 : 1;
    const priceVal = parseFloat(unit_price || 0);

    if (targetPart === 1) {
      await pool.query(
        `UPDATE part1_items SET product_code = ?, specification = ?, unit = ?, category = ?, unit_price = ? WHERE id = ?`,
        [product_code || '', specification.trim(), unit.trim(), category.trim(), priceVal, itemId]
      );
    } else {
      await pool.query(
        `UPDATE part2_items SET product_code = ?, specification = ?, unit = ?, category = ?, unit_price = ? WHERE id = ?`,
        [product_code || '', specification.trim(), unit.trim(), category.trim(), priceVal, itemId]
      );
    }

    // Optionally update draft submissions unit price
    if (update_draft_entries) {
      await pool.query(
        `UPDATE submission_entries se 
         JOIN submissions s ON se.submission_id = s.id 
         SET se.unit_price = ? 
         WHERE se.item_part = ? AND se.item_id = ? AND s.status = 'draft'`,
        [priceVal, targetPart, itemId]
      );
    }

    res.json({ message: `Item details and Unit Price updated successfully!` });
  } catch (error) {
    console.error('Error updating catalog item:', error);
    res.status(500).json({ message: 'Failed to update catalog item' });
  }
});

// DELETE catalog item
router.delete('/catalog/item/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const targetPart = parseInt(req.query.part || '1', 10) === 2 ? 2 : 1;
    const tableName = targetPart === 2 ? 'part2_items' : 'part1_items';

    await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [itemId]);
    res.json({ message: 'Item removed from catalog successfully' });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    res.status(500).json({ message: 'Failed to delete catalog item' });
  }
});

// POST rename / add category
router.post('/catalog/category', async (req, res) => {
  try {
    const { part, old_category_name, new_category_name } = req.body;

    const targetPart = parseInt(part, 10) === 2 ? 2 : 1;
    const tableName = targetPart === 2 ? 'part2_items' : 'part1_items';

    if (!new_category_name || !new_category_name.trim()) {
      return res.status(400).json({ message: 'New category name is required' });
    }

    if (old_category_name) {
      await pool.query(
        `UPDATE ${tableName} SET category = ? WHERE category = ?`,
        [new_category_name.trim(), old_category_name.trim()]
      );
      res.json({ message: `Category renamed to "${new_category_name.trim()}"!` });
    } else {
      res.json({ message: `New category "${new_category_name.trim()}" ready to use!` });
    }
  } catch (error) {
    console.error('Error managing category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

module.exports = router;
