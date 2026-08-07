const pool = require('./pool');

async function seedPastYears() {
  console.log('--- Seeding Historical Procurement Submissions (FY 2025 & FY 2026) ---');

  try {
    // 1. Fetch non-admin offices
    const [offices] = await pool.query('SELECT * FROM offices WHERE is_admin = 0');
    if (offices.length === 0) {
      console.log('No offices found to seed.');
      process.exit(0);
    }

    // 2. Fetch Part I & Part II master items
    const [part1Items] = await pool.query('SELECT * FROM part1_items ORDER BY id ASC LIMIT 25');
    const [part2Items] = await pool.query('SELECT * FROM part2_items ORDER BY id ASC LIMIT 15');

    const years = [2025, 2026];
    let totalSubmissionsSeeded = 0;
    let totalEntriesSeeded = 0;

    for (const year of years) {
      for (let i = 0; i < offices.length; i++) {
        const off = offices[i];

        // Check if submission already exists for this office & year
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
        } else {
          // Insert submission header
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

        // Generate realistic quantities for Part I items
        let p1Total = 0;
        for (let k = 0; k < part1Items.length; k++) {
          const item = part1Items[k];
          // Simple deterministic pseudo-random quantity per office/year/item
          const baseQty = ((off.id * 7 + k * 3 + year) % 15) + 2;
          const unitPrice = parseFloat(item.unit_price) || 150.00;

          const jan = baseQty;
          const feb = (baseQty + 1) % 10;
          const mar = baseQty;
          const apr = (baseQty + 2) % 8;
          const may = baseQty;
          const jun = (baseQty + 1) % 12;
          const jul = baseQty;
          const aug = (baseQty + 3) % 9;
          const sep = baseQty;
          const oct = (baseQty + 2) % 10;
          const nov = baseQty;
          const decm = (baseQty + 1) % 7;

          const annualQty = jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + decm;
          p1Total += (annualQty * unitPrice);

          await pool.query(`
            INSERT INTO submission_entries (
              submission_id, item_id, item_part,
              jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
            ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              jan=VALUES(jan), feb=VALUES(feb), mar=VALUES(mar),
              apr=VALUES(apr), may=VALUES(may), jun=VALUES(jun),
              jul=VALUES(jul), aug=VALUES(aug), sep=VALUES(sep),
              oct=VALUES(oct), nov=VALUES(nov), decm=VALUES(decm),
              unit_price=VALUES(unit_price)
          `, [submissionId, item.id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unitPrice]);
          totalEntriesSeeded++;
        }

        // Generate realistic quantities for Part II items
        let p2Total = 0;
        for (let k = 0; k < part2Items.length; k++) {
          const item = part2Items[k];
          const baseQty = ((off.id * 5 + k * 4 + year) % 8) + 1;
          const unitPrice = 250.00 + (k * 45);

          const jan = baseQty;
          const feb = 0;
          const mar = baseQty;
          const apr = 0;
          const may = baseQty;
          const jun = 0;
          const jul = baseQty;
          const aug = 0;
          const sep = baseQty;
          const oct = 0;
          const nov = baseQty;
          const decm = 0;

          const annualQty = jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + decm;
          p2Total += (annualQty * unitPrice);

          await pool.query(`
            INSERT INTO submission_entries (
              submission_id, item_id, item_part,
              jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unit_price
            ) VALUES (?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              jan=VALUES(jan), feb=VALUES(feb), mar=VALUES(mar),
              apr=VALUES(apr), may=VALUES(may), jun=VALUES(jun),
              jul=VALUES(jul), aug=VALUES(aug), sep=VALUES(sep),
              oct=VALUES(oct), nov=VALUES(nov), decm=VALUES(decm),
              unit_price=VALUES(unit_price)
          `, [submissionId, item.id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, decm, unitPrice]);
          totalEntriesSeeded++;
        }

        // Calculate 10% provision and 10% freight
        const p1Prov = p1Total * 0.10;
        const p1Freight = p1Total * 0.10;
        const p1Grand = p1Total + p1Prov + p1Freight;

        const p2Prov = p2Total * 0.10;
        const p2Freight = p2Total * 0.10;
        const p2Grand = p2Total + p2Prov + p2Freight;

        const overallGrand = p1Grand + p2Grand;

        // Update submission calculated totals
        await pool.query(`
          UPDATE submissions SET
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

    console.log(`✅ Successfully seeded historical data!`);
    console.log(`Submissions Added: ${totalSubmissionsSeeded}`);
    console.log(`Entries Processed:  ${totalEntriesSeeded}`);
    console.log(`Fiscal Years Seeded: 2025, 2026`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding past years:', err);
    process.exit(1);
  }
}

seedPastYears();
