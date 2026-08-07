const pool = require('./pool');

async function remove2027() {
  console.log('--- Removing FY 2027 records from Database ---');
  try {
    const [subs] = await pool.query('SELECT id FROM submissions WHERE fiscal_year >= 2027');
    if (subs.length > 0) {
      const ids = subs.map(s => s.id);
      await pool.query('DELETE FROM submission_entries WHERE submission_id IN (?)', [ids]);
      const [delRes] = await pool.query('DELETE FROM submissions WHERE fiscal_year >= 2027');
      console.log(`Deleted ${delRes.affectedRows} submission headers with year >= 2027.`);
    } else {
      console.log('No FY 2027 submissions found.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error removing 2027:', err);
    process.exit(1);
  }
}

remove2027();
