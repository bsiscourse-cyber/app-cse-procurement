const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

const staffList = [
  {
    office_name: 'Office of the Campus Director',
    contact_person: 'Dr. Dana Faye T. Salundaguit',
    position: 'Campus Director',
    department: 'Executive Office',
    email: 'salundaguit.danafaye@jrmsu.edu.ph',
    telephone: '065-999-0001',
    password: 'SALUNDAGUIT-2027'
  },
  {
    office_name: 'Administrative Office',
    contact_person: 'Benjie B. Camilo',
    position: 'Administrative Officer',
    department: 'Administrative Division',
    email: 'camilo.benjie@jrmsu.edu.ph',
    telephone: '065-999-0002',
    password: 'CAMILO-2027'
  },
  {
    office_name: 'College of Agriculture and Forestry (CAF)',
    contact_person: 'Dr. Isaias B. Catian',
    position: 'Dean, CAF / TESDA Manager',
    department: 'Academic Affairs',
    email: 'catian.isaias@jrmsu.edu.ph',
    telephone: '065-999-0003',
    password: 'CATIAN-2027'
  },
  {
    office_name: 'College of Teacher Education (CTED)',
    contact_person: 'Dr. Jose D. Delas Peñas',
    position: 'Associate Dean, CTED',
    department: 'Academic Affairs',
    email: 'delaspenas.jose@jrmsu.edu.ph',
    telephone: '065-999-0004',
    password: 'DELASPENAS-2027'
  },
  {
    office_name: 'School of Arts and Sciences (SAS)',
    contact_person: 'Dr. Gemarie E. Baquiller',
    position: 'Associate Dean, SAS',
    department: 'Academic Affairs',
    email: 'baquiller.gemarie@jrmsu.edu.ph',
    telephone: '065-999-0005',
    password: 'BAQUILLER-2027'
  },
  {
    office_name: 'College of Law and Maritime Studies (CLAMS)',
    contact_person: 'Dr. Romeo C. Lopez',
    position: 'Associate Dean, CLAMS',
    department: 'Academic Affairs',
    email: 'lopez.romeo@jrmsu.edu.ph',
    telephone: '065-999-0006',
    password: 'LOPEZ-2027'
  },
  {
    office_name: 'College of Business Administration (CBA)',
    contact_person: 'Charo D. Aranda',
    position: 'Associate Dean, CBA',
    department: 'Academic Affairs',
    email: 'aranda.charo@jrmsu.edu.ph',
    telephone: '065-999-0007',
    password: 'ARANDA-2027'
  },
  {
    office_name: 'School of Criminal Justice Education (SCJE)',
    contact_person: 'Dr. Roxanne M. Pascua',
    position: 'Associate Dean, SCJE',
    department: 'Academic Affairs',
    email: 'pascua.roxanne@jrmsu.edu.ph',
    telephone: '065-999-0008',
    password: 'PASCUA-2027'
  },
  {
    office_name: 'School of Engineering (SOE)',
    contact_person: 'Reca S. Bautista',
    position: 'Associate Dean, SOE',
    department: 'Academic Affairs',
    email: 'bautista.reca@jrmsu.edu.ph',
    telephone: '065-999-0009',
    password: 'BAUTISTA-2027'
  },
  {
    office_name: 'Associate Dean - CAF',
    contact_person: 'Cristopher P. Tagupa',
    position: 'Associate Dean, CAF',
    department: 'Academic Affairs',
    email: 'tagupa.cristopher@jrmsu.edu.ph',
    telephone: '065-999-0010',
    password: 'TAGUPA-2027'
  },
  {
    office_name: 'College of Computer Studies (CCS)',
    contact_person: 'Erson A. Rodriguez',
    position: 'Associate Dean, CCS',
    department: 'Academic Affairs',
    email: 'rodriguez.erson@jrmsu.edu.ph',
    telephone: '065-999-0011',
    password: 'RODRIGUEZ-2027'
  },
  {
    office_name: 'Research Unit',
    contact_person: 'Yhebron J. Lagud',
    position: 'Unit Head, Research',
    department: 'Research & Extension',
    email: 'lagud.yhebron@jrmsu.edu.ph',
    telephone: '065-999-0012',
    password: 'LAGUD-2027'
  },
  {
    office_name: 'Extension Unit',
    contact_person: 'June Michael B. Antone',
    position: 'Unit Head, Extension',
    department: 'Research & Extension',
    email: 'antone.junemichael@jrmsu.edu.ph',
    telephone: '065-999-0013',
    password: 'ANTONE-2027'
  },
  {
    office_name: 'Accounting Office',
    contact_person: 'Sheila Mae J. Gabo',
    position: 'Accountant II',
    department: 'Finance Department',
    email: 'gabo.sheilamae@jrmsu.edu.ph',
    telephone: '065-999-0014',
    password: 'GABO-2027'
  },
  {
    office_name: 'Budget Office',
    contact_person: 'Cherry Jane B. Labrador',
    position: 'Budget Officer II',
    department: 'Finance Department',
    email: 'labrador.cherryjane@jrmsu.edu.ph',
    telephone: '065-999-0015',
    password: 'LABRADOR-2027'
  },
  {
    office_name: 'Cashiering Office',
    contact_person: 'Sheila Marie R. Larisma',
    position: 'Cashier II',
    department: 'Finance Department',
    email: 'larisma.sheilamarie@jrmsu.edu.ph',
    telephone: '065-999-0016',
    password: 'LARISMA-2027'
  },
  {
    office_name: 'Human Resource Office (HRMO)',
    contact_person: 'Florabel B. Bajamonde',
    position: 'HRMO II',
    department: 'Administrative Division',
    email: 'bajamonde.florabel@jrmsu.edu.ph',
    telephone: '065-999-0017',
    password: 'BAJAMONDE-2027'
  },
  {
    office_name: 'Records Office',
    contact_person: 'Rubygene E. Jauculan',
    position: 'Records Officer I',
    department: 'Administrative Division',
    email: 'jauculan.rubygene@jrmsu.edu.ph',
    telephone: '065-999-0018',
    password: 'JAUCULAN-2027'
  },
  {
    office_name: 'Supply Office Staff Account',
    contact_person: 'Kevin Robert L. Labiano',
    position: 'Supply Officer I',
    department: 'Supply & Property Unit',
    email: 'labiano.kevinrobert@jrmsu.edu.ph',
    telephone: '065-999-0019',
    password: 'LABIANO-2027'
  },
  {
    office_name: 'Project Monitoring Office',
    contact_person: 'Engr. Brex B. Camilo',
    position: 'Project Monitoring Officer',
    department: 'Physical Plant & Facilities',
    email: 'camilo.brex@jrmsu.edu.ph',
    telephone: '065-999-0020',
    password: 'CAMILOBREX-2027'
  },
  {
    office_name: 'Physical Plant Facilities & Physical Utility (PPF&PU)',
    contact_person: 'Engr. Keryn Abong',
    position: 'Unit Head, PPF&PU',
    department: 'Physical Plant & Facilities',
    email: 'abong.keryn@jrmsu.edu.ph',
    telephone: '065-999-0021',
    password: 'ABONG-2027'
  },
  {
    office_name: 'COA Office',
    contact_person: 'Aiza Tapayan',
    position: 'COA Staff',
    department: 'Auditing Services',
    email: 'tapayan.aiza@jrmsu.edu.ph',
    telephone: '065-999-0022',
    password: 'TAPAYAN-2027'
  },
  {
    office_name: 'Gender and Development (GAD)',
    contact_person: 'Maurine Aime T. Quiboyen',
    position: 'GAD Director',
    department: 'Executive Office',
    email: 'quiboyen.maurineaime@jrmsu.edu.ph',
    telephone: '065-999-0023',
    password: 'QUIBOYEN-2027'
  },
  {
    office_name: 'Student Financial Assistance (StufAp)',
    contact_person: 'Elidio C. Quiboyen, Jr.',
    position: 'StufAp Coordinator',
    department: 'Student Affairs',
    email: 'quiboyen.elidio@jrmsu.edu.ph',
    telephone: '065-999-0024',
    password: 'QUIBOYENJR-2027'
  },
  {
    office_name: 'Management Information System (MIS)',
    contact_person: 'Lorymer L. Jauculan',
    position: 'Unit Head, MIS',
    department: 'Information Technology',
    email: 'jauculan.lorymer@jrmsu.edu.ph',
    telephone: '065-999-0025',
    password: 'JAUCULANL-2027'
  },
  {
    office_name: 'Instructional Materials Development (IMD)',
    contact_person: 'Elmira C. Rodriguez',
    position: 'Director, IMD',
    department: 'Academic Affairs',
    email: 'rodriguez.elmira@jrmsu.edu.ph',
    telephone: '065-999-0026',
    password: 'RODRIGUEZE-2027'
  },
  {
    office_name: 'Foreign Language Studies / Publication',
    contact_person: 'Herford Rei B. Guibangguibang',
    position: 'Director, FLS / Publication Adviser',
    department: 'Academic Affairs',
    email: 'guibangguibang.herford@jrmsu.edu.ph',
    telephone: '065-999-0027',
    password: 'GUIBANGGUIBANG-2027'
  },
  {
    office_name: 'Campus Clinic / Health Services',
    contact_person: 'Llorden Babe A. Bayeta',
    position: 'Nurse',
    department: 'Health Services',
    email: 'bayeta.llordenbabe@jrmsu.edu.ph',
    telephone: '065-999-0028',
    password: 'BAYETA-2027'
  },
  {
    office_name: 'Quality Assurance (QA / SSG)',
    contact_person: 'Joseph P. Ruiz',
    position: 'Unit Head, QA / SSG Adviser',
    department: 'Executive Office',
    email: 'ruiz.joseph@jrmsu.edu.ph',
    telephone: '065-999-0029',
    password: 'RUIZ-2027'
  },
  {
    office_name: 'Student Organizations Office',
    contact_person: 'Mary Glez B. Behiga',
    position: 'Student Organization Adviser',
    department: 'Student Affairs',
    email: 'behiga.maryglez@jrmsu.edu.ph',
    telephone: '065-999-0030',
    password: 'BEHIGA-2027'
  },
  {
    office_name: 'Guidance and Counseling Center',
    contact_person: 'Keszia Lorene S. Hechanova',
    position: 'Guidance Counselor',
    department: 'Student Affairs',
    email: 'hechanova.keszialorene@jrmsu.edu.ph',
    telephone: '065-999-0031',
    password: 'HECHANOVA-2027'
  },
  {
    office_name: 'Registrar Office',
    contact_person: 'Richel A. Balais',
    position: 'Registrar III',
    department: 'Academic Affairs',
    email: 'balais.richel@jrmsu.edu.ph',
    telephone: '065-999-0032',
    password: 'BALAIS-2027'
  },
  {
    office_name: 'NSTP Office',
    contact_person: 'Dr. Alfonso T. Rocha',
    position: 'NSTP Coordinator',
    department: 'Student Affairs',
    email: 'rocha.alfonso@jrmsu.edu.ph',
    telephone: '065-999-0033',
    password: 'ROCHA-2027'
  },
  {
    office_name: 'Laboratory High School',
    contact_person: 'Keir A. Balasa',
    position: 'Unit Head, Laboratory High School',
    department: 'Academic Affairs',
    email: 'balasa.keir@jrmsu.edu.ph',
    telephone: '065-999-0034',
    password: 'BALASA-2027'
  },
  {
    office_name: 'Income Generating Projects (IGP)',
    contact_person: 'Mario N. Baquiller',
    position: 'Unit Head, IGP',
    department: 'Auxiliary Services',
    email: 'baquiller.mario@jrmsu.edu.ph',
    telephone: '065-999-0035',
    password: 'BAQUILLERM-2027'
  },
  {
    office_name: 'Dormitory Management',
    contact_person: 'Ma. Rachel L. Olivar',
    position: 'Dormitory Manager',
    department: 'Auxiliary Services',
    email: 'olivar.marachel@jrmsu.edu.ph',
    telephone: '065-999-0036',
    password: 'OLIVAR-2027'
  },
  {
    office_name: 'Supreme Student Government (SSG)',
    contact_person: 'Hon. James A. Manliguez',
    position: 'SSG President',
    department: 'Student Affairs',
    email: 'manliguez.james@jrmsu.edu.ph',
    telephone: '065-999-0037',
    password: 'MANLIGUEZ-2027'
  },
  {
    office_name: 'Science Laboratory',
    contact_person: 'Love Hope T. Estrada',
    position: 'Unit Head, Science Laboratory',
    department: 'Academic Affairs',
    email: 'estrada.lovehope@jrmsu.edu.ph',
    telephone: '065-999-0038',
    password: 'ESTRADA-2027'
  },
  {
    office_name: 'Climate Change & Disaster Risk Reduction (CDRRM)',
    contact_person: 'Elrhine D. Nicolas',
    position: 'Unit Head, CDRRM',
    department: 'Safety & Security',
    email: 'nicolas.elrhine@jrmsu.edu.ph',
    telephone: '065-999-0039',
    password: 'NICOLAS-2027'
  },
  {
    office_name: 'Criminology Laboratory',
    contact_person: 'Alex B. Quemada',
    position: 'Unit Head, Criminology Laboratory',
    department: 'Academic Affairs',
    email: 'quemada.alex@jrmsu.edu.ph',
    telephone: '065-999-0040',
    password: 'QUEMADA-2027'
  },
  {
    office_name: 'Library Services',
    contact_person: 'Queennie R. Suana',
    position: 'Librarian',
    department: 'Learning Resources',
    email: 'suana.queennie@jrmsu.edu.ph',
    telephone: '065-999-0041',
    password: 'SUANA-2027'
  },
  {
    office_name: 'CLAMS Research Chairperson',
    contact_person: 'Ruthie Liza R. Lapinig',
    position: 'Chairperson, CLAMS Research',
    department: 'Research & Extension',
    email: 'lapinig.ruthieliza@jrmsu.edu.ph',
    telephone: '065-999-0042',
    password: 'LAPINIG-2027'
  },
  {
    office_name: 'CLAMS Extension Chairperson',
    contact_person: 'Alma M. Guibangguibang',
    position: 'Chairperson, CLAMS Extension',
    department: 'Research & Extension',
    email: 'guibangguibang.alma@jrmsu.edu.ph',
    telephone: '065-999-0043',
    password: 'GUIBANGGUIBANGA-2027'
  },
  {
    office_name: 'CAF Extension Chairperson',
    contact_person: 'Jay-Ar P. Bagarinao',
    position: 'Chairperson, CAF Extension',
    department: 'Research & Extension',
    email: 'bagarinao.jayar@jrmsu.edu.ph',
    telephone: '065-999-0044',
    password: 'BAGARINAO-2027'
  }
];

async function runSeed() {
  console.log('--- Registering all 44 Staff User Accounts from Document ---');
  
  const pool = require('./pool');

  let createdCount = 0;
  let updatedCount = 0;

  for (const staff of staffList) {
    const passwordHash = await bcrypt.hash(staff.password, 10);

    // Check if account with same email or office name already exists
    const [existing] = await pool.query(
      'SELECT id, office_name FROM offices WHERE LOWER(email) = ? OR office_name = ?',
      [staff.email.toLowerCase(), staff.office_name]
    );

    let officeId;

    if (existing.length > 0) {
      officeId = existing[0].id;
      // Update existing account
      await pool.query(
        `UPDATE offices SET
          office_name = ?,
          password_hash = ?,
          department = ?,
          contact_person = ?,
          position = ?,
          email = ?,
          telephone = ?
        WHERE id = ?`,
        [staff.office_name, passwordHash, staff.department, staff.contact_person, staff.position, staff.email.toLowerCase(), staff.telephone, officeId]
      );
      updatedCount++;
    } else {
      // Insert new account
      const [res] = await pool.query(
        `INSERT INTO offices (
          office_name, password_hash, is_admin, department, contact_person, position, email, telephone
        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
        [staff.office_name, passwordHash, staff.department, staff.contact_person, staff.position, staff.email.toLowerCase(), staff.telephone]
      );
      officeId = res.insertId;
      createdCount++;
    }

    // Ensure initial submission header exists for fiscal year 2027
    const [sub] = await pool.query(
      'SELECT id FROM submissions WHERE office_id = ? AND fiscal_year = 2027',
      [officeId]
    );

    if (sub.length === 0) {
      await pool.query(
        `INSERT INTO submissions (
          office_id, fiscal_year, department_bureau, agency_code_uacs, contact_person, region, org_type, position, address, email, telephone_mobile, status
        ) VALUES (?, 2027, ?, 'A100-2027', ?, 'Region IX', 'SUC', ?, 'JRMSU Tampilisan Campus, Zamboanga del Norte', ?, ?, 'draft')`,
        [officeId, staff.office_name, staff.contact_person, staff.position, staff.email, staff.telephone]
      );
    } else {
      // Update submission contact info
      await pool.query(
        `UPDATE submissions SET contact_person = ?, position = ?, email = ?, telephone_mobile = ? WHERE id = ?`,
        [staff.contact_person, staff.position, staff.email, staff.telephone, sub[0].id]
      );
    }
  }

  console.log(`\n✅ Account creation complete!`);
  console.log(`Total Created: ${createdCount}`);
  console.log(`Total Updated: ${updatedCount}`);
  console.log(`Total Staff Accounts in System: ${staffList.length}`);

  await pool.end();
}

runSeed().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
