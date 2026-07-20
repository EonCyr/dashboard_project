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
        let sql = `
            SELECT s.studentid, assess.scores, assess.band AS value
            FROM students s
            LEFT JOIN assessments assess ON s.studentid = assess.studentid
            `;
        let params = [];

        if (role === 'parent') {
            sql += `
                INNER JOIN parent_student ps ON ps.studentid = s.studentid
                WHERE ps.parentid = ?
            `;
            params = [userId];
        } else if (role === 'therapist') {
            sql += `
                INNER JOIN therapist_student ts ON ts.studentid = s.studentid
                WHERE ts.therapistid = ?
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));