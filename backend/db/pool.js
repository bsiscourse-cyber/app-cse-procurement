require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');

const isRemote = (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') || process.env.MYSQL_ADDON_HOST;

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQL_ADDON_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_ADDON_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_ADDON_DB || 'appcse_db',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || 3306, 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  ssl: isRemote ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : false
});

module.exports = pool;
