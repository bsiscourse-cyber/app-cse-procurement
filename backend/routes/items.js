const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Get all Part I items (PS-DBM Catalogue)
router.get('/part1', authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM part1_items ORDER BY item_no ASC');
    res.json(items);
  } catch (error) {
    console.error('Error fetching part1 items:', error);
    res.status(500).json({ message: 'Error fetching Part I items' });
  }
});

// Get all Part II items (Other Sources Catalogue)
router.get('/part2', authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM part2_items ORDER BY item_no ASC');
    res.json(items);
  } catch (error) {
    console.error('Error fetching part2 items:', error);
    res.status(500).json({ message: 'Error fetching Part II items' });
  }
});

module.exports = router;
