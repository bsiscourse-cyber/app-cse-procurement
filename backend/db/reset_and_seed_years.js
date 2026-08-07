const pool = require('./pool');

async function resetAndSeedYears() {
  console.log('--- Adjusting Fiscal Years: 2024 & 2025 (Historical) | 2026 (Active Empty Drafts) ---');

  try {
    // 1. Fetch non-admin offices
    const [offices] = await pool.query('SELECT * FROM offices WHERE is_admin = 0');
    if (offices.length === 0) {
      console.log('No offices found.');
      process.exit(0);
    }

    // 2. Fetch Part I & Part II master items for historical seeding
    const [part1Items] = await pool.query('SELECT * FROM part1_items ORDER BY id ASC LIMIT 25');
    const [part2Items] = await pool.query('SELECT * FROM part2_items ORDER BY id ASC LIMIT 15');

    // 3. Clear any existing 2027 submissions and entries
    const [sub2027] = await pool.query('SELECT id FROM submissions WHERE fiscal_year >= 2027');
    if (sub2027.length > 0) {
      const ids2027 = sub2027.map(s => s.id);
      await pool.query('DELETE FROM submission_entries WHERE submission_id IN (?)', [ids2027]);
      await pool.query('DELETE FROM submissions WHERE fiscal_year >= 2027');
    }

    // 4. Seed Historical Data for FY 2024 and FY 2025
    const pastYears = [2024, 2025];
    let totalSubmissionsSeeded = 0;
    let totalEntriesSeeded = 0;

    for (const year of pastYears) {
      for (let i = 0; i < offices.length; i++) {
        const off = offices[i];

        const [existing] = await pool.query(
          'SELECT id FROM submissions WHERE office_id = ? AND fiscal_year = ?',
          [off.id, year]
        );

        let submissionId;
        const submittedDate = new Date(`${year}-01-${10 + (i % 15)} 10:30:00`);
        const approvedDate = new Date(`${year}-01-${18 + (i % 10)} 14:15:00`);
        const status = (i % 5 === 0) ? 'submitted' : 'approved';

        if (existing.length > 0) {
          submissionId = existing[0].id;
          await pool.query(
            'UPDATE submissions SET status = ?, submitted_at = ?, approved_at = ? WHERE id = ?',
            [status, submittedDate, status === 'approved' ? approvedDate : null, submissionId]
          );
        } else {
          const [res] = await pool.query(`
            INSERT INTO submissions (
              office_id, fiscal_year, department_bureau, agency_code_uacs,
              contact_person, region, org_type, position, address, email, telephone_mobile,
              status, submitted_at, approved_at,
              prepared_by_name, certified_by_name, approved_by_name, date_prepared
            ) VALUES (?, ?, ?, ?, ?, 'Region IX', 'SUC', ?, ?, ?, ?, ?, ?, ?, ?, 'Dr. Campus Admin', 'Dr. Campus Director', ?)
          `, [
            off.id,
            year,
            off.office_name,
            `A100-${year}`,
            off.contact_person || 'Office Head',
            off.position || 'Department Officer',
            'JRMSU Tampilisan Campus, Zamboanga del Norte',
            off.email || `office${off.id}@jrmsu.edu.ph`,
            off.telephone || '065-999-0000',
            status,
            submittedDate,
            status === 'approved' ? approvedDate : null,
            off.contact_person || 'Office Head',
            `${year}-01-05`
          ]);
          submissionId = res.insertId;
          totalSubmissionsSeeded++;
        }

        // Prepare bulk entries for historical year
        const entriesRows = [];
        let p1Total = 0;
        for (let k = 0; k < part1Items.length; k++) {
          const item = part1Items[k];
          const baseQty = ((off.id * 7 + k * 3 + year) % 15) + 2;
          const unitPrice = parseFloat(item.unit_price) || 150.00;

          const jan = baseQty, feb = (baseQty + 1) % 10, mar = baseQty, apr = (baseQty + 2) % 8, may = baseQty, jun = (baseQty + 1) % 12;
          const jul = baseQty, aug = (baseQty + 3) % 9, sep = baseQty, oct = (baseQty + 2) % 10, nov = baseQty, decm = (baseQty + 1) % 7;

          const annualQty = jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + decm;
          p1Total += (annualQty * unitPrice);

          entriesRows.push([submissionId, item.id, 1, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unitPrice]);
        }

        let p2Total = 0;
        for (let k = 0; k < part2Items.length; k++) {
          const item = part2Items[k];
          const baseQty = ((off.id * 5 + k * 4 + year) % 8) + 1;
          const unitPrice = 250.00 + (k * 45);

          const jan = baseQty, feb = 0, mar = baseQty, apr = 0, may = baseQty, jun = 0;
          const jul = baseQty, aug = 0, sep = baseQty, oct = 0, nov = baseQty, decm = 0;

          const annualQty = jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + decm;
          p2Total += (annualQty * unitPrice);

          entriesRows.push([submissionId, item.id, 2, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unitPrice]);
        }

        if (entriesRows.length > 0) {
          await pool.query(`
            INSERT INTO submission_entries (
              submission_id, item_id, item_part,
              jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
              jan=VALUES(jan), feb=VALUES(feb), mar=VALUES(mar),
              apr=VALUES(apr), may=VALUES(may), jun=VALUES(jun),
              jul=VALUES(jul), aug=VALUES(aug), sep=VALUES(sep),
              oct=VALUES(oct), nov=VALUES(nov), decm=VALUES(decm),
              unit_price=VALUES(unit_price)
          `, [entriesRows]);
          totalEntriesSeeded += entriesRows.length;
        }

        const p1Prov = p1Total * 0.10, p1Freight = p1Total * 0.10, p1Grand = p1Total + p1Prov + p1Freight;
        const p2Prov = p2Total * 0.10, p2Freight = p2Total * 0.10, p2Grand = p2Total + p2Prov + p2Freight;
        const overallGrand = p1Grand + p2Grand;

        await pool.query(`
          UPDATE submissions SET
            part1_total_a = ?, part1_provision_b = ?, part1_freight_c = ?, part1_grand_total_d = ?, part1_budget_text_e = ?,
            part2_total_a = ?, part2_provision_b = ?, part2_freight_c = ?, part2_grand_total_d = ?, part2_budget_text_e = ?,
            overall_grand_total = ?
          WHERE id = ?
        `, [
          p1Total, p1Prov, p1Freight, p1Grand, `APPROVED FY ${year} PART I BUDGET`,
          p2Total, p2Prov, p2Freight, p2Grand, `APPROVED FY ${year} PART II BUDGET`,
          overallGrand,
          submissionId
        ]);
      }
    }

    // 5. Setup Active Current Year 2026: EMPTY DRAFTS FOR ALL OFFICES
    console.log('Setting up active FY 2026 empty draft forms for all offices...');
    for (const off of offices) {
      const [sub2026] = await pool.query(
        'SELECT id FROM submissions WHERE office_id = ? AND fiscal_year = 2026',
        [off.id]
      );

      if (sub2026.length > 0) {
        // Clear any old entries so 2026 form is empty draft
        await pool.query('DELETE FROM submission_entries WHERE submission_id = ?', [sub2026[0].id]);
        await pool.query(`
          UPDATE submissions SET
            status = 'draft',
            submitted_at = NULL,
            approved_at = NULL,
            part1_total_a = 0, part1_provision_b = 0, part1_freight_c = 0, part1_grand_total_d = 0, part1_budget_text_e = '',
            part2_total_a = 0, part2_provision_b = 0, part2_freight_c = 0, part2_grand_total_d = 0, part2_budget_text_e = '',
            overall_grand_total = 0
          WHERE id = ?
        `, [sub2026[0].id]);
      } else {
        await pool.query(`
          INSERT INTO submissions (
            office_id, fiscal_year, department_bureau, agency_code_uacs, contact_person, region, org_type, position, address, email, telephone_mobile, status
          ) VALUES (?, 2026, ?, 'A100-2026', ?, 'Region IX', 'SUC', ?, 'JRMSU Tampilisan Campus, Zamboanga del Norte', ?, ?, 'draft')
        `, [off.id, off.office_name, off.contact_person || 'Officer', off.position || 'Head', off.email || '', off.telephone || '']);
      }
    }

    console.log('✅ Fiscal Year Adjustment Complete!');
    console.log('FY 2024: Historical Approved Data');
    console.log('FY 2025: Historical Approved Data');
    console.log('FY 2026: Active Current Year (Clean Empty Drafts ready for input)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting fiscal years:', err);
    process.exit(1);
  }
}

resetAndSeedYears();
