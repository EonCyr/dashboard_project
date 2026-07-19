require('dotenv').config({ silent: true }); //Load the .env file if it exists
const express = require('express');
const cors = require('cors');
const app = express();

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

app.get('/students', (req, res) => {
    const { role, username } = req.query;

    let sql = `
        SELECT s.student_id, s.name, ss.vocab_band, ss.phonics_band, ss.writing_band, ss.listening_band, ss.overall_band
        FROM students s
        LEFT JOIN student_scores ss ON s.student_id = ss.student_id
        `;
    let params = [];

    // If the user is a 'parent', filter by their username
    if (role === 'parent') {
        sql += ' WHERE parent_username = ?';
        params = [username];
    }
    // If 'tutor', no WHERE clause is added, so they see all students

    pool.query(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ error: 'Failed to fetch' });
        }
        res.json(rows);
    });
});

app.post('/login', (req, res) => {
  const { username, password, role } = req.body; // Make sure to get 'role' from the frontend

  // Now we check username, password, AND role
  const sql = 'SELECT username, role FROM users WHERE username = ? AND password = ? AND role = ?';
  
  pool.query(sql, [username, password, role], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ success: true, role: results[0].role });
    } else {
      // This will now trigger if the role doesn't match the user in the DB
      res.status(401).json({ error: 'Invalid username, password, or role selected' });
    }
  });
});

// fetch the shared observation/recommendation thread for a student
app.get('/communications/:studentId', (req, res) => {
  const { studentId } = req.params;
  const sql = `
    SELECT id, student_id, sender_username, sender_role, message, created_at
    FROM communications
    WHERE student_id = ?
    ORDER BY created_at ASC
  `;
  pool.query(sql, [studentId], (err, rows) => {
    if (err) {
      console.error('Error fetching communications:', err);
      return res.status(500).json({ error: 'Failed to fetch communications' });
    }
    res.json(rows);
  });
});

// parent submits a home observation OR tutor submits a recommendation
app.post('/communications', (req, res) => {
  const { studentId, senderUsername, senderRole, message } = req.body;

  if (!studentId || !senderUsername || !senderRole || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['parent', 'tutor'].includes(senderRole)) {
    return res.status(400).json({ error: 'Invalid sender role' });
  }
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    return res.status(400).json({ error: 'Message must be between 1 and 2000 characters' });
  }

  const sql = `
    INSERT INTO communications (student_id, sender_username, sender_role, message)
    VALUES (?, ?, ?, ?)
  `;
  pool.query(sql, [studentId, senderUsername, senderRole, trimmed], (err, result) => {
    if (err) {
      console.error('Error saving communication:', err);
      return res.status(500).json({ error: 'Failed to save message' });
    }
    res.status(201).json({
      id: result.insertId,
      student_id: studentId,
      sender_username: senderUsername,
      sender_role: senderRole,
      message: trimmed,
      created_at: new Date().toISOString()
    });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));