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

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`🚀 APP-CSE 2027 Backend Server listening on http://localhost:${PORT}`);
});
