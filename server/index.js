require('dotenv').config({ silent: true }); //Load the .env file if it exists
const express = require('express');
const cors = require('cors');
const app = express();
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, HeadingLevel } = require('docx');
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: "Dashboard API is running!" });
});

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure Multer to upload directly to the root 'data' directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    cb(null, dataDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

const PORT = process.env.PORT || 3000;

//MySQL stuff
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'dashboard_db'
});


const connectWithRetry = () => {
  pool.query('SELECT 1', (err) => {
    if (err) {
      console.log('Database not ready yet, retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('Database connected successfully!');
    }
  });
};

connectWithRetry();

// 1. GET Endpoint for risk
app.get('/config/risk', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(
      `SELECT Critical_Score_Ceiling, Moderate_Score_Ceiling, High_Performer_Benchmark, Baseline_Window_Months 
       FROM Risk_Threshold_Configurations ORDER BY Last_Updated DESC LIMIT 1`
    );
    
    if (rows.length > 0) {
      res.status(200).json({
        critical_score: rows[0].Critical_Score_Ceiling,
        moderate_score: rows[0].Moderate_Score_Ceiling,
        high_performer_score: rows[0].High_Performer_Benchmark,
        baseline_window: rows[0].Baseline_Window_Months
      });
    } else {
      res.status(200).json({ critical_score: 20, moderate_score: 25, high_performer_score: 28, baseline_window: 2 });
    }
  } catch (err) {
    console.error('Fetch Risk Config Error:', err);
    res.status(500).json({ error: 'Failed to fetch risk configurations.' });
  }
});

// 2. PUT Endpoint for risk
app.put('/config/risk', async (req, res) => {
  const { criticalScore, moderateScore, highPerformerScore, baselineWindow } = req.body;

  if (Number(criticalScore) >= Number(moderateScore) || Number(moderateScore) >= Number(highPerformerScore)) {
    return res.status(400).json({ error: 'Validation Error: Critical < Moderate < High Performer.' });
  }
  try {
    await pool.promise().query(
      `INSERT INTO Risk_Threshold_Configurations 
       (Configuration_ID, Critical_Score_Ceiling, Moderate_Score_Ceiling, High_Performer_Benchmark, Baseline_Window_Months)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       Critical_Score_Ceiling = VALUES(Critical_Score_Ceiling),
       Moderate_Score_Ceiling = VALUES(Moderate_Score_Ceiling),
       High_Performer_Benchmark = VALUES(High_Performer_Benchmark),
       Baseline_Window_Months = VALUES(Baseline_Window_Months)`,
      [criticalScore, moderateScore, highPerformerScore, baselineWindow]
    );

    res.status(200).json({ message: 'Updated performance metrics successfully saved.' });
  } catch (err) {
    res.status(500).json({ error: 'Database update failed.' });
  }
});

app.get('/', (req, res) => {
    res.json({ message: "Dashboard API is running!" });
});

// 1. POST Endpoint for Individual Assessment Submission
app.post('/assessments/single', async (req, res) => {
  console.log('Received raw req.body:', req.body); //For debugging purposes
  try {
    const data = req.body;
    const val = (v) => (v !== undefined && v !== null && v !== '' && !isNaN(v) ? Number(v) : 0);
    const incomingScores = data.scores || {};

    const assessmentRecord = {
      therapistid: val(data.therapistId) || null,
      studentid: val(data.studentId),
      semester: data.semester || '2026 Sem 1',
      centre: data.centre || 'Default Centre',
      band: data.band && data.band.trim() !== '' ? data.band.trim() : null,
      scores: JSON.stringify({
        vocab: {
          picture_naming: val(incomingScores.vocab?.picture_naming),
          picture_description: val(incomingScores.vocab?.picture_description)
        },
        "pa/phonics": {
          fluency: val(incomingScores["pa/phonics"]?.fluency),
          phonics: val(incomingScores["pa/phonics"]?.phonics),
          word_spelling: val(incomingScores["pa/phonics"]?.word_spelling),
          pa_identification: val(incomingScores["pa/phonics"]?.pa_identification)
        },
        writing: {
          edit_d1: val(incomingScores.writing?.edit_d1),
          edit_d2: val(incomingScores.writing?.edit_d2),
          edit_d3: val(incomingScores.writing?.edit_d3),
          letter_formation: val(incomingScores.writing?.letter_formation),
          narrative_writing: val(incomingScores.writing?.narrative_writing),
          exposition_writing: val(incomingScores.writing?.exposition_writing)
        },
        "listening/readingcomprehension": {
          persuasive_writing: val(incomingScores["listening/readingcomprehension"]?.persuasive_writing),
          reading_comprehension: val(incomingScores["listening/readingcomprehension"]?.reading_comprehension),
          listening_comprehension: val(incomingScores["listening/readingcomprehension"]?.listening_comprehension)
        }
      })
    };

    const query = `
      INSERT INTO assessments (therapistid, studentid, semester, centre, scores, band) 
      VALUES (?, ?, ?, ?, ?, COALESCE(?, (SELECT current_band FROM students WHERE studentid = ?)))
      ON DUPLICATE KEY UPDATE 
        therapistid = VALUES(therapistid),
        centre = VALUES(centre),
        scores = VALUES(scores),
        band = COALESCE(VALUES(band), assessments.band, (SELECT current_band FROM students WHERE studentid = ?));
    `;

    const values = [
      assessmentRecord.therapistid,
      assessmentRecord.studentid,
      assessmentRecord.semester,
      assessmentRecord.centre,
      assessmentRecord.scores,
      assessmentRecord.band,
      assessmentRecord.studentid,
      assessmentRecord.studentid
    ];

    const executeQuery = (sql, vals) => {
      return new Promise((resolve, reject) => {
        pool.query(sql, vals, (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    };

    await executeQuery(query, values);

    res.status(200).json({ message: 'Assessment saved successfully with therapist ID!' });
  } catch (error) {
    console.error('Error saving individual assessment:', error);
    res.status(500).json({ error: 'Failed to save individual assessment' });
  }
});

// 2. POST Endpoint for Bulk File Import (Triggers your Python Ingestion Script)
app.post('/assessments/bulk-import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const { exec } = require('child_process');

  exec(`python3 /app/ingestor/ingest.py --file "${filePath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Bulk Import Exec Error:', error);
      console.error('Python STDERR:', stderr);
      return res.status(500).json({ error: `Failed to process bulk upload script: ${stderr || error.message}` });
    }

    res.status(200).json({ message: 'Mass file imported successfully!' });
  });
});


app.get('/students', (req, res) => {
    const { role, username } = req.query;

    const userLookupSql = 'SELECT userid FROM users WHERE username = ?';

    pool.query(userLookupSql, [username], (userErr, userRows) => {
        if (userErr) {
            console.error('Error finding user:', userErr);
            return res.status(500).json({ error: 'Failed to fetch' });
        }

        if (!userRows.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userRows[0].userid;
        let sql = '';
        let params = [];

        if (role === 'parent') {
            sql = `
                WITH ranked_assessments AS (
                    SELECT 
                        s.studentid, 
                        s.name, 
                        assess.scores, 
                        assess.band AS value,
                        assess.semester,
                        ROW_NUMBER() OVER (PARTITION BY s.studentid ORDER BY assess.semester DESC) AS row_num
                    FROM students s
                    INNER JOIN parent_student ps ON ps.studentid = s.studentid
                    LEFT JOIN assessments assess ON s.studentid = assess.studentid
                    WHERE ps.parentid = ?
                )
                SELECT studentid, name, scores, value, semester
                FROM ranked_assessments
                WHERE row_num = 1;
            `;
            params = [userId];
        } else if (role === 'therapist') {
            // Uses a Common Table Expression (CTE) to rank semesters descending per student, 
            // ensuring only the latest semester (row_num = 1) is returned for each individual student.
            sql = `
                WITH ranked_assessments AS (
                    SELECT 
                        s.studentid, 
                        s.name,
                        assess.scores, 
                        assess.band AS value,
                        assess.semester,
                        ROW_NUMBER() OVER (PARTITION BY s.studentid ORDER BY assess.semester DESC) AS row_num
                    FROM students s
                    INNER JOIN therapist_student ts ON ts.studentid = s.studentid
                    LEFT JOIN assessments assess ON s.studentid = assess.studentid
                    WHERE ts.therapistid = ?
                )
                SELECT studentid, scores, value, semester
                FROM ranked_assessments
                WHERE row_num = 1;
            `;
            params = [userId];
        }

        pool.query(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching students:', err);
                return res.status(500).json({ error: 'Failed to fetch' });
            }
            res.json(rows);
        });
    });
});

app.route('/relationships')
    .get((req, res) => {
        const { username } = req.query;

        const userLookupSql = 'SELECT userid FROM users WHERE username = ?';

        pool.query(userLookupSql, [username], (userErr, userRows) => {
            if (userErr) {
                console.error('Error finding user:', userErr);
                return res.status(500).json({ error: 'Failed to fetch' });
            }

            if (!userRows.length) {
                return res.status(404).json({ error: 'User not found' });
            }

            const therapistId = userRows[0].userid;
            const sql = `
                SELECT ts.studentid, s.name AS student_name, ps.parentid, p.username AS parent_name, ps.relationship
                FROM therapist_student ts
                INNER JOIN students s ON s.studentid = ts.studentid
                LEFT JOIN parent_student ps ON ps.studentid = ts.studentid
                LEFT JOIN users p ON p.userid = ps.parentid
                WHERE ts.therapistid = ?
                ORDER BY ts.studentid, ps.parentid
            `;

            pool.query(sql, [therapistId], (err, rows) => {
                if (err) {
                    console.error('Error fetching relationships:', err);
                    return res.status(500).json({ error: 'Failed to fetch relationships' });
                }
                res.json(rows);
            });
        });
    })
    .post((req, res) => {
        const { username, studentid, parentid, relationship } = req.body;

        if (!username || !studentid || !parentid) {
            return res.status(400).json({ error: 'Username, student ID, and parent ID are required' });
        }

        const userLookupSql = 'SELECT userid FROM users WHERE username = ?';

        pool.query(userLookupSql, [username], (userErr, userRows) => {
            if (userErr) {
                console.error('Error finding user:', userErr);
                return res.status(500).json({ error: 'Failed to fetch' });
            }

            if (!userRows.length) {
                return res.status(404).json({ error: 'User not found' });
            }

            const therapistId = userRows[0].userid;
            const verifySql = 'SELECT 1 FROM therapist_student WHERE therapistid = ? AND studentid = ?';

            pool.query(verifySql, [therapistId, studentid], (verifyErr, verifyRows) => {
                if (verifyErr) {
                    console.error('Error verifying therapist assignment:', verifyErr);
                    return res.status(500).json({ error: 'Failed to verify access' });
                }
                if (!verifyRows.length) {
                    return res.status(403).json({ error: 'This student is not associated with your account.', code: 'STUDENT_NOT_RELATED' });
                }

                const parentLookupSql = 'SELECT userid FROM parents WHERE userid = ?';

                pool.query(parentLookupSql, [parentid], (parentErr, parentRows) => {
                  if (parentErr) {
                      console.error('Error verifying parent account:', parentErr);
                      return res.status(500).json({ error: 'Failed to verify parent account' });
                  }
                  if (!parentRows.length) {
                      return res.status(404).json({ error: 'No parent account exists with that ID.', code: 'PARENT_NOT_FOUND' });
                  }

                const insertSql = `
                  INSERT INTO parent_student (parentid, studentid, relationship)
                  VALUES (?, ?, ?)
                  ON DUPLICATE KEY UPDATE relationship = VALUES(relationship)
                `;

                pool.query(insertSql, [parentid, studentid, relationship || 'Parent'], (insertErr) => {
                  if (insertErr) {
                    console.error('Error creating relationship:', insertErr);
                    return res.status(500).json({ error: 'Failed to create relationship' });
                  }
                  res.json({ message: 'Relationship added successfully' });
                });
              });
            });
        });
    })
    .delete((req, res) => {
        const { username, studentid, parentid } = req.body;

        if (!username || !studentid || !parentid) {
            return res.status(400).json({ error: 'Username, student ID, and parent ID are required' });
        }

        const userLookupSql = 'SELECT userid FROM users WHERE username = ?';

        pool.query(userLookupSql, [username], (userErr, userRows) => {
            if (userErr) {
                console.error('Error finding user:', userErr);
                return res.status(500).json({ error: 'Failed to fetch' });
            }

            if (!userRows.length) {
                return res.status(404).json({ error: 'User not found' });
            }

            const therapistId = userRows[0].userid;
            const verifySql = 'SELECT 1 FROM therapist_student WHERE therapistid = ? AND studentid = ?';

            pool.query(verifySql, [therapistId, studentid], (verifyErr, verifyRows) => {
                if (verifyErr) {
                    console.error('Error verifying therapist assignment:', verifyErr);
                    return res.status(500).json({ error: 'Failed to verify access' });
                }
                if (!verifyRows.length) {
                    return res.status(403).json({ error: 'This student is not associated with your account.', code: 'STUDENT_NOT_RELATED' });
                }

                const deleteSql = 'DELETE FROM parent_student WHERE parentid = ? AND studentid = ?';

                pool.query(deleteSql, [parentid, studentid], (deleteErr, result) => {
                    if (deleteErr) {
                        console.error('Error deleting relationship:', deleteErr);
                        return res.status(500).json({ error: 'Failed to delete relationship' });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Relationship not found' });
                    }
                    res.json({ message: 'Relationship removed successfully' });
                });
            });
        });
    });

app.post('/login', (req, res) => {
  const { username, password, role } = req.body; // Getting all the components needed to query the request

  // Check username, password, AND role if its valid in the database
  const sql = 'SELECT username, role, userid FROM users WHERE username = ? AND password = ? AND role = ?';
  
  pool.query(sql, [username, password, role], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ success: true, role: results[0].role, userid: results[0].userid });
    } else {
      // If role or account is not valid, an error will be thrown
      res.status(401).json({ error: 'Invalid username, password, or role selected' });
    }
  });
});

app.get('/student-history/:studentid', (req, res) => {
    const { studentid } = req.params;
    const sql = `
        SELECT semester, scores, band 
        FROM assessments 
        WHERE studentid = ? 
        ORDER BY semester ASC;
    `;
    pool.query(sql, [studentid], (err, rows) => {
        if (err) {
            console.error('Error fetching history:', err);
            return res.status(500).json({ error: 'Failed to fetch history' });
        }
        res.json(rows);
    });
});



// Report generation feature (added) 

const reportCache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of reportCache) {
    if (entry.expiresAt < now) reportCache.delete(id);
  }
}, 60 * 1000);

function formatScoreField(field) {
  if (!field) return 'N/A';
  if (typeof field === 'object') {
    return Object.entries(field)
      .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`)
      .join(', ');
  }
  return field;
}

app.post('/reports/parent', async (req, res) => {
  const { studentId, semester, format, username } = req.body;

  if (!studentId || !semester || !format) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `
    SELECT scores, band, semester
    FROM assessments
    WHERE studentid = ? AND semester = ?
  `;

  pool.query(sql, [studentId, semester], async (err, rows) => {
    if (err) {
      console.error('Error fetching assessment data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No assessment data available for the selected semester.' });
    }

    const parsedRows = rows.map((r) => {
      const scores = typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores;
      return {
        semester: r.semester,
        band: r.band,
        vocab: formatScoreField(scores.vocab),
        phonics: formatScoreField(scores['pa/phonics']),
        writing: formatScoreField(scores.writing),
        listening: formatScoreField(scores['listening/readingcomprehension']),
      };
    });

    let summaryText;
    try {
      summaryText = await generateParentSummary(parsedRows);
    } catch (aiError) {
      if (aiError.name === 'AbortError') {
        return res.status(504).json({ error: 'Report generation timed out. Please try again.' });
      }
      console.error('AI summary error:', aiError);
      return res.status(502).json({ error: 'Failed to generate report summary.' });
    }

    try {
      const buffer = await compileReport({ format, summaryText, rows: parsedRows });

      const reportId = `${studentId}-${Date.now()}`;
      reportCache.set(reportId, { buffer, format, expiresAt: Date.now() + 10 * 60 * 1000 });

      res.setHeader('Content-Disposition', `attachment; filename=progress-report.${format}`);
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/plain');
      res.setHeader('X-Report-Id', reportId);
      return res.send(buffer);
    } catch (fileError) {
      console.error('File compilation error:', fileError);
      return res.status(500).json({ error: 'Failed to generate the report file.' });
    }
  });
});

app.get('/reports/parent/:reportId', (req, res) => {
  const entry = reportCache.get(req.params.reportId);
  if (!entry) {
    return res.status(404).json({ error: 'Report no longer available. Please regenerate.' });
  }
  res.setHeader('Content-Disposition', `attachment; filename=progress-report.${entry.format}`);
  res.setHeader('Content-Type', entry.format === 'pdf' ? 'application/pdf' : 'text/plain');
  res.send(entry.buffer);
});

app.post('/reports/clinical', async (req, res) => {
  const { studentId, semester, format, username } = req.body;

  if (!studentId || !semester || !format) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `
    SELECT scores, band, semester
    FROM assessments
    WHERE studentid = ? AND semester = ?
  `;

  pool.query(sql, [studentId, semester], async (err, rows) => {
    if (err) {
      console.error('Error fetching assessment data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No assessment data available for the selected semester.' });
    }

    const parsedRows = rows.map((r) => {
      const scores = typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores;
      return {
        semester: r.semester,
        band: r.band,
        vocab: formatScoreField(scores.vocab),
        phonics: formatScoreField(scores['pa/phonics']),
        writing: formatScoreField(scores.writing),
        listening: formatScoreField(scores['listening/readingcomprehension']),
      };
    });

    let clinicalText;
    try {
      clinicalText = await generateClinicalSummary(parsedRows);
    } catch (aiError) {
      if (aiError.name === 'AbortError') {
        return res.status(504).json({ error: 'Report generation timed out. Please try again.' });
      }
      console.error('AI clinical summary error:', aiError);
      return res.status(502).json({ error: 'Failed to generate clinical report.' });
    }

    try {
      const buffer = await compileClinicalReport({ format, clinicalText, rows: parsedRows });

      const reportId = `clinical-${studentId}-${Date.now()}`;
      reportCache.set(reportId, { buffer, format, expiresAt: Date.now() + 10 * 60 * 1000 });

      res.setHeader('Content-Disposition', `attachment; filename=clinical-report.${format}`);
      res.setHeader(
        'Content-Type',
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('X-Report-Id', reportId);
      return res.send(buffer);
    } catch (fileError) {
      console.error('File compilation error:', fileError);
      return res.status(500).json({ error: 'Failed to generate the report file.' });
    }
  });
});

async function generateParentSummary(rows) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const prompt = `Summarize this child's literacy progress data in plain, encouraging language for a parent. Highlight achievements, areas of concern, and recommendations.

Formatting rules:
- Do NOT use Markdown syntax (no **, ##, ---, |, or bullet dashes)
- Do NOT use emoji or special Unicode symbols
- Use plain section titles on their own line, then a blank line, then plain paragraphs
- Use only standard ASCII characters

Data:
${JSON.stringify(rows)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI API returned ${response.status}`);
    const data = await response.json();
    return data.content.map((c) => c.text || '').join('\n');
  } finally {
    clearTimeout(timeout);
  }
}

async function generateClinicalSummary(rows) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const prompt = `You are assisting an educational therapist. Analyze this literacy assessment data and produce a clinical progress summary. Include: growth trends, persistent gaps, and tailored intervention recommendations. Use professional clinical language.

Formatting rules:
- Do NOT use Markdown syntax (no **, ##, ---, |, or bullet dashes)
- Do NOT use emoji or special Unicode symbols
- Use plain section titles on their own line, then a blank line, then plain paragraphs
- Use only standard ASCII characters

Data:
${JSON.stringify(rows)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI API returned ${response.status}`);
    const data = await response.json();
    return data.content.map((c) => c.text || '').join('\n');
  } finally {
    clearTimeout(timeout);
  }
}

async function compileReport({ format, summaryText, rows }) {
  if (format === 'txt') return Buffer.from(summaryText, 'utf-8');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(20).font('Helvetica-Bold').text("Your Child's Literacy Progress Report");
    doc.moveDown();
    summaryText.split('\n').filter((l) => l.trim()).forEach((line) => {
      doc.fontSize(11).font('Helvetica').text(line.trim());
    });
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Assessment History');
    rows.forEach((r) => {
      doc.fontSize(10).font('Helvetica').text(
        `${r.semester}: Vocab ${r.vocab}, Phonics ${r.phonics}, Writing ${r.writing}, Listening ${r.listening}, Overall ${r.band}`
      );
    });
    doc.end();
  });
}

async function compileClinicalReport({ format, clinicalText, rows }) {
  if (format === 'docx') {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Clinical Progress Report', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: clinicalText }),
          new Paragraph({ text: 'Assessment History', heading: HeadingLevel.HEADING_2 }),
          ...rows.map((r) => new Paragraph({
            text: `${r.semester}: Vocab ${r.vocab}, Phonics ${r.phonics}, Writing ${r.writing}, Listening ${r.listening}, Overall ${r.band}`,
          })),
        ],
      }],
    });
    return await Packer.toBuffer(doc);
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(18).text('Clinical Progress Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(clinicalText);
    doc.moveDown();
    doc.fontSize(14).text('Assessment History', { underline: true });
    rows.forEach((r) => {
      doc.fontSize(10).text(
        `${r.semester}: Vocab ${r.vocab}, Phonics ${r.phonics}, Writing ${r.writing}, Listening ${r.listening}, Overall ${r.band}`
      );
    });
    doc.end();
  });
}


// fetch the shared observation/recommendation thread for a student
app.get('/communications/:studentId/:parentId', (req, res) => {
  const { studentId, parentId } = req.params;
  const sql = `
    SELECT id, studentid, parentid, sender_username, sender_role, message, created_at
    FROM communications
    WHERE studentid = ? AND parentid = ?
    ORDER BY created_at ASC
  `;
  pool.query(sql, [studentId, parentId], (err, rows) => {
    if (err) {
      console.error('Error fetching communications:', err);
      return res.status(500).json({ error: 'Failed to fetch communications' });
    }
    res.json(rows);
  });
});

// parent submits a home observation OR tutor submits a recommendation
app.post('/communications', (req, res) => {
  const { studentId, parentId, senderUsername, senderRole, message } = req.body;

  if (!studentId || !parentId || !senderUsername || !senderRole || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['parent', 'therapist'].includes(senderRole)) {
    return res.status(400).json({ error: 'Invalid sender role' });
  }
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    return res.status(400).json({ error: 'Message must be between 1 and 2000 characters' });
  }

  const sql = `
    INSERT INTO communications (studentid, parentid, sender_username, sender_role, message)
    VALUES (?, ?, ?, ?, ?)
  `;
  pool.query(sql, [studentId, parentId, senderUsername, senderRole, trimmed], (err, result) => {
    if (err) {
      console.error('Error saving communication:', err);
      return res.status(500).json({ error: 'Failed to save message' });
    }
    res.status(201).json({
      id: result.insertId,
      studentid: studentId,
      parentid: parentId,
      sender_username: senderUsername,
      sender_role: senderRole,
      message: trimmed,
      created_at: new Date().toISOString()
    });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// for risk assessment to show status

// GET: /api/students/at-risk?teacherId=1
app.get('/api/students/at-risk', async (req, res) => {
  const teacherId = req.query.teacherId || 1; // Fallback to Teacher 1 for testing

  try {
    // 1. Get Active Risk Threshold Rules
    const [rules] = await db.query(
      `SELECT Stagnant_Months_Threshold, Critical_Score_Ceiling, Baseline_Window_Months 
       FROM Risk_Threshold_Configurations ORDER BY Last_Updated DESC LIMIT 1`
    );

    const config = rules[0] || {
      Stagnant_Months_Threshold: 3,
      Critical_Score_Ceiling: 3,
      Baseline_Window_Months: 2
    };

    // 2. Fetch Students assigned to this Teacher via Profiles
    const [students] = await db.query(
      `SELECT DISTINCT s.Student_ID, s.Enrollment_Date, s.Months_To_48_Months
       FROM Students s
       JOIN Student_Semester_Profiles p ON s.Student_ID = p.Student_ID
       WHERE p.Teacher_ID = ?`,
      [teacherId]
    );

    // 3. Calculate Risk Status for each student
    const evaluatedStudents = await Promise.all(
      students.map(async (student) => {
        // Fetch historical scores for this student ordered by assessment date (newest first)
        const [assessments] = await db.query(
          `SELECT Mark_Score, Assessment_Date 
           FROM Student_Assessments 
           WHERE Student_ID = ? 
           ORDER BY Assessment_Date DESC`,
          [student.Student_ID]
        );

        // Alt Flow 3b: Lacks required historical baseline
        if (assessments.length < config.Baseline_Window_Months) {
          return {
            ...student,
            assessmentsCount: assessments.length,
            latestScore: assessments[0] ? assessments[0].Mark_Score : 'N/A',
            statusTag: 'NEUTRAL_INSUFFICIENT_DATA',
            statusLabel: 'Insufficient Baseline Data'
          };
        }

        const latestScore = assessments[0].Mark_Score;

        // Check Stagnancy / Decline: latest score vs. older score in window
        const previousScore = assessments[config.Baseline_Window_Months - 1].Mark_Score;
        const isStagnantOrDeclining = latestScore <= previousScore;

        // Operational Flow Step 3: Check against threshold rules
        if (latestScore < config.Critical_Score_Ceiling || isStagnantOrDeclining) {
          return {
            ...student,
            assessmentsCount: assessments.length,
            latestScore,
            statusTag: 'AT_RISK',
            statusLabel: 'Action Required / At-Risk'
          };
        }

        // Alt Flow 3a: Trajectory is stable
        return {
          ...student,
          assessmentsCount: assessments.length,
          latestScore,
          statusTag: 'STABLE',
          statusLabel: 'Stable Trajectory'
        };
      })
    );

    // Operational Flow Step 4: Sort prioritized list (AT_RISK first)
    evaluatedStudents.sort((a, b) => {
      const priority = { AT_RISK: 1, NEUTRAL_INSUFFICIENT_DATA: 2, STABLE: 3 };
      return priority[a.statusTag] - priority[b.statusTag];
    });

    res.status(200).json(evaluatedStudents);
  } catch (error) {
    console.error('UC6 Risk Analytics Error:', error);
    // Alt Flow 4a: Graceful failure response
    res.status(500).json({ error: 'Failed to compute risk analytics' });
  }
});

