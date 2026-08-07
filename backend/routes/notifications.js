const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// GET all notifications for authenticated office
router.get('/', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    let [rows] = await pool.query(
      'SELECT * FROM notifications WHERE office_id = ? ORDER BY created_at DESC',
      [officeId]
    );

    // If Admin account and notifications table has no records yet for this admin,
    // auto-populate notifications for pending submitted forms and additional requests
    if (req.user.is_admin && rows.length === 0) {
      try {
        const [submitted] = await pool.query(`
          SELECT s.id as submission_id, o.office_name, s.submitted_at, s.fiscal_year
          FROM submissions s
          JOIN offices o ON s.office_id = o.id
          WHERE s.status = 'submitted'
        `);
        for (const sub of submitted) {
          await pool.query(
            `INSERT INTO notifications (office_id, title, message, type, target_id, is_read, created_at) VALUES (?, ?, ?, 'submission', ?, 0, ?)`,
            [
              officeId,
              `New Submission: ${sub.office_name}`,
              `${sub.office_name} submitted their APP-CSE form for FY ${sub.fiscal_year} for approval.`,
              sub.submission_id,
              sub.submitted_at || new Date()
            ]
          );
        }

        const [addReqs] = await pool.query(`
          SELECT ar.id, ar.office_name, ar.created_at
          FROM additional_requests ar
          WHERE ar.status = 'pending'
        `);
        for (const reqItem of addReqs) {
          await pool.query(
            `INSERT INTO notifications (office_id, title, message, type, target_id, is_read, created_at) VALUES (?, ?, ?, 'additional', ?, 0, ?)`,
            [
              officeId,
              `Additional Request: ${reqItem.office_name}`,
              `${reqItem.office_name} requested additional procurement items.`,
              reqItem.id,
              reqItem.created_at || new Date()
            ]
          );
        }

        [rows] = await pool.query(
          'SELECT * FROM notifications WHERE office_id = ? ORDER BY created_at DESC',
          [officeId]
        );
      } catch (e) {
        console.error('Error auto-populating admin notifications:', e);
      }
    }

    const unreadCount = rows.filter(n => n.is_read === 0).length;

    res.json({
      unread_count: unreadCount,
      notifications: rows
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification(s) as read
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    const { id } = req.body;

    if (id) {
      await pool.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND office_id = ?',
        [id, officeId]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET is_read = 1 WHERE office_id = ?',
        [officeId]
      );
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Delete specific notification (3-dot menu option)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    const notifId = req.params.id;

    await pool.query(
      'DELETE FROM notifications WHERE id = ? AND office_id = ?',
      [notifId, officeId]
    );

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Clear all notifications
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    await pool.query('DELETE FROM notifications WHERE office_id = ?', [officeId]);
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Error clearing notifications' });
  }
});

module.exports = router;
