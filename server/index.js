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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//MySQL stuff
const mysql = require('mysql2');

const connectWithRetry = () => {
  const connection = mysql.createPool({
    host: process.env.DB_HOST || 'db', // Ensure this matches your service name in compose
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'dashboard_db'
  });

  connection.query('SELECT 1', (err) => {
    if (err) {
      console.log('Database not ready yet, retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // Wait 5 seconds and try again
    } else {
      console.log('Database connected successfully!');
    }
  });
};

connectWithRetry();