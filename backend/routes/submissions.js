const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Helper to get active fiscal year from request query/body or default to calendar year
const getReqYear = (req) => {
  const y = parseInt(req.query?.year || req.body?.year || req.body?.fiscal_year, 10);
  return (y && y >= 2020 && y <= 2100) ? y : new Date().getFullYear();
};

// Get own submission details + quantity entries
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    const year = getReqYear(req);

    // Get or create submission for office
    let [submissions] = await pool.query(
      'SELECT * FROM submissions WHERE office_id = ? AND fiscal_year = ? LIMIT 1',
      [officeId, year]
    );

    if (submissions.length === 0) {
      const [result] = await pool.query(
        `INSERT INTO submissions (
          office_id, fiscal_year, department_bureau, status
        ) VALUES (?, ?, ?, 'draft')`,
        [officeId, year, req.user.office_name]
      );
      [submissions] = await pool.query('SELECT * FROM submissions WHERE id = ?', [result.insertId]);
    }

    const submission = submissions[0];

    // Fetch entries
    const [entries] = await pool.query(
      'SELECT * FROM submission_entries WHERE submission_id = ?',
      [submission.id]
    );

    // Key entries by `${item_part}_${item_id}`
    const entriesMap = {};
    entries.forEach(e => {
      entriesMap[`${e.item_part}_${e.item_id}`] = e;
    });

    res.json({
      submission,
      entriesMap
    });
  } catch (error) {
    console.error('Error fetching office submission:', error);
    res.status(500).json({ message: 'Error fetching submission' });
  }
});

// Save draft submission (header fields, items, summary calculations)
router.post('/save', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const officeId = req.user.id;
    const {
      headerInfo,
      entries, // Array of { item_id, item_part, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price }
      part1Summary,
      part2Summary,
      overallGrandTotal,
      signatories
    } = req.body;

    await connection.beginTransaction();

    // Check submission status
    const year = getReqYear(req);
    const [submissions] = await connection.query(
      'SELECT * FROM submissions WHERE office_id = ? AND fiscal_year = ? LIMIT 1',
      [officeId, year]
    );

    if (submissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Submission record not found' });
    }

    const submission = submissions[0];

    if (submission.status !== 'draft' && submission.status !== 'rejected') {
      await connection.rollback();
      return res.status(403).json({ message: 'Submission is locked and cannot be edited.' });
    }

    // Update submission header, summaries, and signatories
    await connection.query(
      `UPDATE submissions SET
        department_bureau = ?,
        agency_code_uacs = ?,
        contact_person = ?,
        region = ?,
        org_type = ?,
        position = ?,
        address = ?,
        email = ?,
        telephone_mobile = ?,
        
        part1_total_a = ?,
        part1_provision_b = ?,
        part1_freight_c = ?,
        part1_grand_total_d = ?,
        part1_budget_text_e = ?,
        
        part2_total_a = ?,
        part2_provision_b = ?,
        part2_freight_c = ?,
        part2_grand_total_d = ?,
        part2_budget_text_e = ?,
        
        overall_grand_total = ?,
        
        prepared_by_name = ?,
        certified_by_name = ?,
        approved_by_name = ?,
        date_prepared = ?
      WHERE id = ?`,
      [
        headerInfo?.department_bureau || req.user.office_name,
        headerInfo?.agency_code_uacs || '',
        headerInfo?.contact_person || '',
        headerInfo?.region || '',
        headerInfo?.org_type || '',
        headerInfo?.position || '',
        headerInfo?.address || '',
        headerInfo?.email || '',
        headerInfo?.telephone_mobile || '',

        part1Summary?.total_a || 0,
        part1Summary?.provision_b || 0,
        part1Summary?.freight_c || 0,
        part1Summary?.grand_total_d || 0,
        part1Summary?.budget_text_e || '',

        part2Summary?.total_a || 0,
        part2Summary?.provision_b || 0,
        part2Summary?.freight_c || 0,
        part2Summary?.grand_total_d || 0,
        part2Summary?.budget_text_e || '',

        overallGrandTotal || 0,

        signatories?.prepared_by_name || '',
        signatories?.certified_by_name || '',
        signatories?.approved_by_name || '',
        signatories?.date_prepared ? new Date(signatories.date_prepared) : null,

        submission.id
      ]
    );

    // Upsert quantity entries
    if (entries && Array.isArray(entries)) {
      for (const entry of entries) {
        const {
          item_id, item_part,
          jan=0, feb=0, mar=0, apr=0, may=0, jun=0,
          jul=0, aug=0, sep=0, oct=0, nov=0, decm=0,
          unit_price=0
        } = entry;

        await connection.query(
          `INSERT INTO submission_entries (
            submission_id, item_id, item_part,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            jan=VALUES(jan), feb=VALUES(feb), mar=VALUES(mar),
            apr=VALUES(apr), may=VALUES(may), jun=VALUES(jun),
            jul=VALUES(jul), aug=VALUES(aug), sep=VALUES(sep),
            oct=VALUES(oct), nov=VALUES(nov), decm=VALUES(decm),
            unit_price=VALUES(unit_price)`,
          [
            submission.id, item_id, item_part,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
          ]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Draft saved successfully!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving submission draft:', error);
    res.status(500).json({ message: 'Error saving draft' });
  } finally {
    connection.release();
  }
});

// Submit submission for approval
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    const year = getReqYear(req);

    const [submissions] = await pool.query(
      'SELECT * FROM submissions WHERE office_id = ? AND fiscal_year = ? LIMIT 1',
      [officeId, year]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'Submission record not found' });
    }

    const submission = submissions[0];

    if (submission.status !== 'draft' && submission.status !== 'rejected') {
      return res.status(400).json({ message: 'Submission is already submitted or approved.' });
    }

    await pool.query(
      `UPDATE submissions SET status = 'submitted', submitted_at = NOW() WHERE id = ?`,
      [submission.id]
    );

    // Notify all Admin accounts
    try {
      const [admins] = await pool.query('SELECT id FROM offices WHERE is_admin = 1');
      for (const admin of admins) {
        await pool.query(
          `INSERT INTO notifications (office_id, title, message, type, target_id, is_read) VALUES (?, ?, ?, 'submission', ?, 0)`,
          [
            admin.id,
            `New Submission: ${req.user.office_name}`,
            `${req.user.office_name} submitted their APP-CSE form for FY ${year} for approval.`,
            submission.id
          ]
        );
      }
    } catch (e) {
      console.error('Failed to send admin notification:', e);
    }

    res.json({ message: 'APP-CSE submission submitted successfully for approval!' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ message: 'Error submitting form' });
  }
});

// Submit Additional Procurement Request (when form status is 'submitted' or 'approved')
router.post('/additional', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const officeId = req.user.id;
    const { reason_notes, entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'At least one additional item with quantity > 0 is required.' });
    }

    const year = getReqYear(req);
    const [submissions] = await connection.query(
      'SELECT id, status FROM submissions WHERE office_id = ? AND fiscal_year = ? LIMIT 1',
      [officeId, year]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'Submission record not found' });
    }

    const submission = submissions[0];

    await connection.beginTransaction();

    const [reqResult] = await connection.query(
      `INSERT INTO additional_requests (
        submission_id, office_id, office_name, reason_notes, status
      ) VALUES (?, ?, ?, ?, 'pending')`,
      [submission.id, officeId, req.user.office_name, reason_notes || '']
    );

    const requestId = reqResult.insertId;

    for (const entry of entries) {
      const {
        item_id, item_part,
        jan=0, feb=0, mar=0, apr=0, may=0, jun=0,
        jul=0, aug=0, sep=0, oct=0, nov=0, decm=0,
        unit_price=0
      } = entry;

      const total_qty = jan+feb+mar+apr+may+jun+jul+aug+sep+oct+nov+decm;
      const total_amount = total_qty * parseFloat(unit_price || 0);

      if (total_qty > 0) {
        await connection.query(
          `INSERT INTO additional_request_items (
            request_id, item_id, item_part,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm,
            unit_price, total_qty, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            requestId, item_id, item_part,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm,
            unit_price, total_qty, total_amount
          ]
        );
      }
    }

    await connection.commit();

    // Notify all Admin accounts
    try {
      const [admins] = await pool.query('SELECT id FROM offices WHERE is_admin = 1');
      for (const admin of admins) {
        await pool.query(
          `INSERT INTO notifications (office_id, title, message, type, target_id, is_read) VALUES (?, ?, ?, 'additional', ?, 0)`,
          [
            admin.id,
            `Additional Request: ${req.user.office_name}`,
            `${req.user.office_name} requested additional procurement items.`,
            requestId
          ]
        );
      }
    } catch (e) {
      console.error('Failed to send admin notification for additional request:', e);
    }

    res.json({
      message: 'Additional procurement request submitted successfully! Supply Office (Admin) has been notified for review.',
      request_id: requestId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting additional request:', error);
    res.status(500).json({ message: 'Error submitting additional request' });
  } finally {
    connection.release();
  }
});

// Get office's own additional request history
router.get('/additional/mine', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    const [requests] = await pool.query(
      `SELECT * FROM additional_requests WHERE office_id = ? ORDER BY created_at DESC`,
      [officeId]
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
    console.error('Error fetching additional requests:', error);
    res.status(500).json({ message: 'Error fetching additional requests' });
  }
});

module.exports = router;
