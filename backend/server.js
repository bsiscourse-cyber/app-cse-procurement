const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve Uploads & Static Assets
app.use('/upload', express.static(path.join(__dirname, '../upload')));

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'online', system: 'APP-CSE Procurement System API', health: '/api/health' });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'APP-CSE 2027 API is running smoothly' });
});

// Database Connection Test & Diagnostics
app.get('/api/test-db', async (req, res) => {
  try {
    const pool = require('./db/pool');
    const [rows] = await pool.query('SELECT id, office_name, is_admin FROM offices');
    res.json({ status: 'connected', count: rows.length, offices: rows });
  } catch (err) {
    res.status(500).json({ status: 'db_error', error: err.message, code: err.code });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/submission', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const ensureTables = async () => {
  try {
    const pool = require('./db/pool');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS additional_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        office_id INT NOT NULL,
        office_name VARCHAR(255) NOT NULL,
        reason_notes TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        feedback_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS additional_request_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        item_id INT NOT NULL,
        item_part INT NOT NULL,
        jan INT DEFAULT 0, feb INT DEFAULT 0, mar INT DEFAULT 0,
        apr INT DEFAULT 0, may INT DEFAULT 0, jun INT DEFAULT 0,
        jul INT DEFAULT 0, aug INT DEFAULT 0, sep INT DEFAULT 0,
        oct INT DEFAULT 0, nov INT DEFAULT 0, decm INT DEFAULT 0,
        unit_price DECIMAL(12,2) DEFAULT 0.00,
        total_qty INT DEFAULT 0,
        total_amount DECIMAL(14,2) DEFAULT 0.00,
        FOREIGN KEY (request_id) REFERENCES additional_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Database schema verified (additional_requests tables ready)');
  } catch (err) {
    console.error('⚠️ Warning checking additional_requests tables:', err.message);
  }
};
ensureTables();

app.listen(PORT, () => {
  console.log(`🚀 APP-CSE 2027 Backend Server listening on http://localhost:${PORT}`);
});
