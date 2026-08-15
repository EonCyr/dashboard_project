const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function getConnection() {
  return mysql.createConnection({
    host: process.env.CYPRESS_DB_HOST || 'localhost',
    port: Number(process.env.CYPRESS_DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'dashboard_db',
  });
}

const FIXTURE_IDS = {
  therapist1: 900001,
  therapist2: 900002,
  parent1: 900011,
  parentUnlinked: 900012,
  parentEmpty: 900020,
  student1: 900001, // therapist1's primary roster student, linked to parent1
  student2: 900003, // therapist1's second roster student (no parent linked) 
  student3: 900002, // therapist2's roster student, disjoint from therapist1
  student4: 900005, // therapist1's roster student, zero assessments, linked to parentEmpty
};

async function seedFixtures() {
  const conn = await getConnection();
  try {
    // --- Users ---
    const users = [
      [FIXTURE_IDS.therapist1, 'cypress_therapist1', 'therapist', 'cypress_therapist1@example.com', '90000001'],
      [FIXTURE_IDS.therapist2, 'cypress_therapist2', 'therapist', 'cypress_therapist2@example.com', '90000002'],
      [FIXTURE_IDS.parent1, 'cypress_parent1', 'parent', 'cypress_parent1@example.com', '90000011'],
      [FIXTURE_IDS.parentUnlinked, 'cypress_parent_unlinked', 'parent', 'cypress_parent_unlinked@example.com', '90000012'],
      [FIXTURE_IDS.parentEmpty, 'cypress_parent_empty', 'parent', 'cypress_parent_empty@example.com', '90000020'],
    ];
    for (const [userid, username, role, email, phone] of users) {
      await conn.query(
        `INSERT IGNORE INTO users (userid, username, password, email, phone_number, role)
         VALUES (?, ?, 'pw123', ?, ?, ?)`,
        [userid, username, email, phone, role]
      );
    }

    await conn.query(`INSERT IGNORE INTO therapists (userid, centre) VALUES (?, 'cypress-centre-1')`, [
      FIXTURE_IDS.therapist1,
    ]);
    await conn.query(`INSERT IGNORE INTO therapists (userid, centre) VALUES (?, 'cypress-centre-2')`, [
      FIXTURE_IDS.therapist2,
    ]);
    for (const parentId of [FIXTURE_IDS.parent1, FIXTURE_IDS.parentUnlinked, FIXTURE_IDS.parentEmpty]) {
      await conn.query(`INSERT IGNORE INTO parents (userid) VALUES (?)`, [parentId]);
    }

    // Students
    const students = [
      [FIXTURE_IDS.student1, 'Cypress Alice', 7, 'B', '2024-01-01', 'cypress-centre-1', 'Cypress School'],
      [FIXTURE_IDS.student2, 'Cypress Bob', 8, 'C', '2024-02-01', 'cypress-centre-1', 'Cypress School'],
      [FIXTURE_IDS.student3, 'Cypress Dana', 9, 'A', '2024-03-01', 'cypress-centre-2', 'Cypress School'],
      [FIXTURE_IDS.student4, 'Cypress Evan', 6, 'C', '2024-04-01', 'cypress-centre-1', 'Cypress School'],
    ];
    for (const [studentid, name, age, band, enrolled, centre, school] of students) {
      await conn.query(
        `INSERT IGNORE INTO students (studentid, name, age, current_band, date_of_enrollment, centre, school)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [studentid, name, age, band, enrolled, centre, school]
      );
      await conn.query(
        `INSERT IGNORE INTO student_profile (studentid, date_of_birth, school_level, months_to_48)
         VALUES (?, '2019-01-01', 'Year 2', 18)`,
        [studentid]
      );
    }

    // Rosters
    await conn.query(`INSERT IGNORE INTO therapist_student (therapistid, studentid) VALUES (?, ?)`, [
      FIXTURE_IDS.therapist1,
      FIXTURE_IDS.student1,
    ]);
    await conn.query(`INSERT IGNORE INTO therapist_student (therapistid, studentid) VALUES (?, ?)`, [
      FIXTURE_IDS.therapist1,
      FIXTURE_IDS.student2,
    ]);
    await conn.query(`INSERT IGNORE INTO therapist_student (therapistid, studentid) VALUES (?, ?)`, [
      FIXTURE_IDS.therapist2,
      FIXTURE_IDS.student3,
    ]);
    await conn.query(`INSERT IGNORE INTO therapist_student (therapistid, studentid) VALUES (?, ?)`, [
      FIXTURE_IDS.therapist1,
      FIXTURE_IDS.student4,
    ]);

    // Parent links
    await conn.query(
      `INSERT IGNORE INTO parent_student (parentid, studentid, relationship) VALUES (?, ?, 'Mother')`,
      [FIXTURE_IDS.parent1, FIXTURE_IDS.student1]
    );
    await conn.query(
      `INSERT IGNORE INTO parent_student (parentid, studentid, relationship) VALUES (?, ?, 'Mother')`,
      [FIXTURE_IDS.parentEmpty, FIXTURE_IDS.student4]
    );
    // parentUnlinked is deliberately left with no parent_student row
    // "add a new link" test, which cleans up after itself.

    // Assessments 
    const scoreSet = (mult) => `
      JSON_OBJECT(
        'vocab', JSON_OBJECT('band','B','raw_score',${70 * mult}),
        'pa/phonics', JSON_OBJECT('band','B','raw_score',${68 * mult}),
        'writing', JSON_OBJECT('band','B','raw_score',${65 * mult}),
        'listening/readingcomprehension', JSON_OBJECT('band','B','raw_score',${66 * mult})
      )`;
    await conn.query(
      `INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, semester, centre, scores, band)
       VALUES (?, ?, ?, 'Cypress Base Sem 1', 'cypress-centre-1', ${scoreSet(1)}, 'B')`,
      [900001, FIXTURE_IDS.therapist1, FIXTURE_IDS.student1]
    );
    await conn.query(
      `INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, semester, centre, scores, band)
       VALUES (?, ?, ?, 'Cypress Base Sem 2', 'cypress-centre-1', ${scoreSet(1.1)}, 'B+')`,
      [900002, FIXTURE_IDS.therapist1, FIXTURE_IDS.student1]
    );
    await conn.query(
      `INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, semester, centre, scores, band)
       VALUES (?, ?, ?, 'Cypress Base Sem 1', 'cypress-centre-1', ${scoreSet(0.8)}, 'C')`,
      [900003, FIXTURE_IDS.therapist1, FIXTURE_IDS.student2]
    );
    await conn.query(
      `INSERT IGNORE INTO assessments (assessmentid, therapistid, studentid, semester, centre, scores, band)
       VALUES (?, ?, ?, 'Cypress Base Sem 1', 'cypress-centre-2', ${scoreSet(1.3)}, 'A')`,
      [900004, FIXTURE_IDS.therapist2, FIXTURE_IDS.student3]
    );
  } finally {
    await conn.end();
  }
  return null;
}

async function cleanupCommunications({ studentId, parentId }) {
  const conn = await getConnection();
  try {
    await conn.query('DELETE FROM communications WHERE studentid = ? AND parentid = ?', [
      studentId,
      parentId,
    ]);
  } finally {
    await conn.end();
  }
  return null;
}

async function queryOne(sql) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(sql);
    return rows[0] || null;
  } finally {
    await conn.end();
  }
}

function buildValidImportFile() {
  const outDir = path.join(__dirname, '..', 'fixtures', 'generated');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'valid-import.xlsx');

  const studentId = 900006;

  const rows = [
    {
      Student_ID: `Student${studentId}`,
      Name: 'Cypress Import Student',
      Age: 8,
      SummaryBand: 'B',
      EnrollmentDate: '01/06/2024',
      Centre_ID: 'cypress-centre-1',
      School_ID: 'Cypress School',
      SchLevel: 'Year 2',
      'No. of months to 48 months': 15,
      Teacher_ID: `Teacher${FIXTURE_IDS.therapist1}`,
      Semester: 'Cypress Import Sem',
      Picture_Naming: 70,
      Picture_Description: 68,
      PA_Identification: 65,
      Phonics: 60,
      FluencyMark: 62,
      Word_Spelling: 58,
      Letter_Formation: 55,
      Edit_D1: 50,
      Edit_D2: 52,
      Edit_D3: 51,
      Narrative_Writing: 54,
      Exposition_Writing: 53,
      Persuasive_Writing: 57,
      LS_Comprehension: 59,
      RD_Comprehension: 61,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, outPath);

  return { path: outPath, studentId };
}

function buildRealisticImportFile() {
  const outDir = path.join(__dirname, '..', 'fixtures', 'generated');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'realistic-import.xlsx');

  const studentId = 900007;

  const rows = [
    {
      Semester: 'Cypress Real Sem', // must fit assessments.semester VARCHAR(20)
      Centre_ID: 'cypress-centre-1',
      Teacher_ID: `Teacher${FIXTURE_IDS.therapist1}`,
      Student_ID: `Student ${studentId}`, // real file uses a space, e.g. "Student 0001"
      School_ID: 'Cypress School',
      Age: 9,
      SchLevel: 'Primary',
      EnrollmentDate: '01/06/2024',
      SummaryBand: 'B6',
      Progress: false,
      NewBand: 'B6',
      Picture_Naming: 20,
      PN_Date: '01/06/2024',
      PN_Progress: true,
      Picture_Description: 18,
      PD_Date: '01/06/2024',
      PD_Progress: false,
      PA_Identification: 15,
      PI_Date: '01/06/2024',
      PI_Progress: true,
      Phonics: 22,
      Phonics_Date: '01/06/2024',
      Phonics_Progress: true,
      Word_Reading_Accuracy: 8,
      WRA_Date: '01/06/2024',
      WRA_Progress: true,
      FluencyMark: 19,
      Progress1: true,
      Word_Spelling: 6,
      WS_Date: '01/06/2024',
      WS_Progress: false,
      Letter_Formation: 12,
      LF_Date: '01/06/2024',
      LF_Progress: true,
      Edit_D1: 10,
      ED1_Date: '01/06/2024',
      ED1_Progress: false,
      Edit_D2: 11,
      ED2_Date: '01/06/2024',
      ED2_Progress: false,
      Edit_D3: 9,
      ED3_Date: '01/06/2024',
      ED3_Progress: false,
      Narrative_Writing: 14,
      NW_Date: '01/06/2024',
      NW_Progress: true,
      Exposition_Writing: 13,
      EW_Date: '01/06/2024',
      EW_Progress: false,
      Persuasive_Writing: 16,
      PW_Date: '01/06/2024',
      PW_Progress: true,
      LS_Comprehension: 17,
      LS_Date: '01/06/2024',
      LS_Progress: true,
      RD_Comprehension: 15,
      RD_Date: '01/06/2024',
      RD_Progress: false,
      'No. of months to 48 months': 20,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, outPath);

  return { path: outPath, studentId };
}

async function cleanupImportedStudent(studentId) {
  const conn = await getConnection();
  try {
    await conn.query('DELETE FROM users WHERE userid = ?', [Number(studentId) + 10000]);
    await conn.query('DELETE FROM students WHERE studentid = ?', [studentId]);
  } finally {
    await conn.end();
  }
  return null;
}

module.exports = {
  FIXTURE_IDS,
  seedFixtures,
  cleanupCommunications,
  queryOne,
  buildValidImportFile,
  buildRealisticImportFile,
  cleanupImportedStudent,
};
