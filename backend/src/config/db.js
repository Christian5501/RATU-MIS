const mysql = require('mysql2/promise');

// Defaults match a fresh XAMPP install: MySQL/MariaDB on localhost:3306,
// user "root", empty password. Override any of these in .env if your
// XAMPP setup differs (e.g. you've set a root password).
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ratu_mis',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
