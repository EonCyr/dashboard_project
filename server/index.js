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

// app.get('/students', (req, res) => {
//     const { role, username } = req.query;

//     const userLookupSql = 'SELECT userid FROM users WHERE username = ?';

//     pool.query(userLookupSql, [username], (userErr, userRows) => {
//         if (userErr) {
//             console.error('Error finding user:', userErr);
//             return res.status(500).json({ error: 'Failed to fetch' });
//         }

//         if (!userRows.length) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const userId = userRows[0].userid;
//         let sql = `
//             SELECT s.studentid, assess.scores, assess.band AS value
//             FROM students s
//             LEFT JOIN assessments assess ON s.studentid = assess.studentid
//             `;
//         let params = [];

//         if (role === 'parent') {
//             sql += `
//                 INNER JOIN parent_student ps ON ps.studentid = s.studentid
//                 WHERE ps.parentid = ?
//             `;
//             params = [userId];
//         } else if (role === 'therapist') {
//             sql += `
//                 INNER JOIN therapist_student ts ON ts.studentid = s.studentid
//                 WHERE ts.therapistid = ?
//             `;
//             params = [userId];
//         }


//         pool.query(sql, params, (err, rows) => {
//             if (err) {
//                 console.error('Error fetching students:', err);
//                 return res.status(500).json({ error: 'Failed to fetch' });
//             }
//             res.json(rows);
//         });
//     });
// });

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
            // sql = `
            //     SELECT s.studentid, assess.scores, assess.band , assess.semester AS value
            //     FROM students s
            //     LEFT JOIN assessments assess ON s.studentid = assess.studentid
            //     INNER JOIN parent_student ps ON ps.studentid = s.studentid
            //     WHERE ps.parentid = ?
            // `;
            sql = `
                WITH ranked_assessments AS (
                    SELECT 
                        s.studentid, 
                        s.name, 
                        assess.scores, 
                        assess.band AS value,
                        assess.semester, -- <--- Added semester
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

app.post('/login', (req, res) => {
  const { username, password, role } = req.body; // Getting all the components needed to query the request

  // Check username, password, AND role if its valid in the database
  const sql = 'SELECT username, role FROM users WHERE username = ? AND password = ? AND role = ?';
  
  pool.query(sql, [username, password, role], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ success: true, role: results[0].role });
    } else {
      // If role or account is not valid, an error will be thrown
      res.status(401).json({ error: 'Invalid username, password, or role selected' });
    }
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


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));