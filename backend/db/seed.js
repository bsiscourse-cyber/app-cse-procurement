const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seed() {
  console.log('--- Starting APP-CSE 2027 Database Seeding ---');

  const isRemote = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ssl: isRemote ? { rejectUnauthorized: false } : false
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  console.log('Running database schema migration...');
  await connection.query(schemaSql);
  await connection.query('USE appcse_db;');

  // Read unpacked Excel XML or parse Excel file directly
  // We extracted the XML previously into scratch/excel_unpacked/
  const unpackedDir = path.join(__dirname, '../../scratch/excel_unpacked');
  const sharedStringsPath = path.join(unpackedDir, 'xl/sharedStrings.xml');
  const sheetPath = path.join(unpackedDir, 'xl/worksheets/sheet1.xml');

  const sharedStringsXml = fs.readFileSync(sharedStringsPath, 'utf-8');
  const sheetXml = fs.readFileSync(sheetPath, 'utf-8');

  // Extract shared strings
  const strings = [];
  const stringMatches = sharedStringsXml.matchAll(/<si>(.*?)<\/si>/gs);
  for (const match of stringMatches) {
    const content = match[1];
    const textMatches = content.matchAll(/<t[^>]*>(.*?)<\/t>/gs);
    let str = '';
    for (const tm of textMatches) {
      str += tm[1];
    }
    strings.push(str);
  }

  // Extract rows
  const rowsMatches = sheetXml.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs);
  const rowData = {};

  for (const rm of rowsMatches) {
    const rowNum = parseInt(rm[1]);
    const cellsContent = rm[2];
    const cellMatches = cellsContent.matchAll(/<c r="([A-Z]+\d+)"([^>]*)>(.*?)<\/c>/gs);
    const cells = {};
    for (const cm of cellMatches) {
      const ref = cm[1];
      const attrs = cm[2];
      const body = cm[3];
      const col = ref.replace(/\d+/, '');
      
      let val = '';
      const vMatch = body.match(/<v>(.*?)<\/v>/);
      if (vMatch) {
        val = vMatch[1];
        if (attrs.includes('t="s"')) {
          val = strings[parseInt(val)] || val;
        }
      }
      cells[col] = val;
    }
    rowData[rowNum] = cells;
  }

  // Clear existing master items
  await connection.query('DELETE FROM part1_items;');
  await connection.query('DELETE FROM part2_items;');

  let part1Items = [];
  let part2Items = [];
  let currentPart = 1;
  let currentCategory = 'GENERAL SUPPLIES';

  for (let r = 32; r <= 463; r++) {
    if (!rowData[r]) continue;
    const row = rowData[r];
    const colA = (row.A || '').trim();

    if (colA.includes('PART II.')) {
      currentPart = 2;
      currentCategory = 'OTHER REGULARLY PURCHASED ITEMS';
      continue;
    }

    // Check if category header row (Col A has text, Col B & C empty)
    if (colA && isNaN(colA) && !row.B && !row.C) {
      // Clean category title
      currentCategory = colA.replace(/^(PART I\.|PART II\.)\s*/, '').trim();
      continue;
    }

    // Check if item row (Col A has numeric item number, Col B has product code, Col C has spec)
    if (colA && !isNaN(colA) && row.B && row.C) {
      const itemNo = parseInt(colA);
      const productCode = (row.B || '').trim();
      const specification = (row.C || '').trim();
      const unit = (row.D || '').trim();
      const unitPrice = parseFloat(row.Z || '0.00');

      if (currentPart === 1) {
        part1Items.push([itemNo, productCode, specification, unit, currentCategory, unitPrice, 1]);
      } else {
        part2Items.push([itemNo, productCode, specification, unit, currentCategory, 2]);
      }
    }
  }

  console.log(`Extracted ${part1Items.length} Part I items and ${part2Items.length} Part II items.`);

  // Insert Part I items
  if (part1Items.length > 0) {
    const p1Sql = 'INSERT INTO part1_items (item_no, product_code, specification, unit, category, unit_price, part) VALUES ?';
    await connection.query(p1Sql, [part1Items]);
  }

  // Insert Part II items
  if (part2Items.length > 0) {
    const p2Sql = 'INSERT INTO part2_items (item_no, product_code, specification, unit, category, part) VALUES ?';
    await connection.query(p2Sql, [part2Items]);
  }

  // Seed Default Accounts
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const budgetPasswordHash = await bcrypt.hash('BUDGET-2027', 10);

  const hrPasswordHash = await bcrypt.hash('HR-2027', 10);
  const accountingPasswordHash = await bcrypt.hash('ACCOUNTING-2027', 10);

  // Clear offices table
  await connection.query('DELETE FROM offices;');

  const officeSql = `
    INSERT INTO offices (office_name, password_hash, is_admin, department, contact_person, position, email, telephone) VALUES
    ('Supply Office (Admin)', ?, 1, 'Administrative Division', 'Supply Officer', 'Head of Supply', 'supply@agency.gov.ph', '02-8123-4567'),
    ('Budget Office', ?, 0, 'Finance Department', 'Juan Dela Cruz', 'Chief Budget Officer', 'budget@agency.gov.ph', '02-8123-4568'),
    ('HR Office', ?, 0, 'Administrative Division', 'Maria Santos', 'HR Director', 'hr@agency.gov.ph', '02-8123-4569'),
    ('Accounting Office', ?, 0, 'Finance Department', 'Pedro Penduko', 'Chief Accountant', 'accounting@agency.gov.ph', '02-8123-4570');
  `;

  await connection.query(officeSql, [adminPasswordHash, budgetPasswordHash, hrPasswordHash, accountingPasswordHash]);

  console.log('Seeding initial submission headers for default office accounts...');
  const [offices] = await connection.query('SELECT id, office_name FROM offices WHERE is_admin = 0;');
  
  for (const off of offices) {
    await connection.query(`
      INSERT INTO submissions (
        office_id, fiscal_year, department_bureau, agency_code_uacs, contact_person, region, org_type, position, address, email, telephone_mobile, status
      ) VALUES (?, 2027, ?, 'A100-2027', 'Contact Person', 'NCR', 'NGA', 'Officer', 'Main Campus Address', ?, '02-8000-0000', 'draft');
    `, [off.id, off.office_name, `${off.office_name.toLowerCase().replace(/\s+/g, '')}@agency.gov.ph`]);
  }

  console.log('✅ Seeding completed successfully!');
  console.log('\n--- Default Credentials ---');
  console.log('Admin Password:     ADMIN-SUPPLY-2027');
  console.log('Budget Office Pass: BUDGET-2027');
  console.log('HR Office Pass:     HR-2027');
  console.log('Accounting Pass:    ACCOUNTING-2027');

  await connection.end();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
