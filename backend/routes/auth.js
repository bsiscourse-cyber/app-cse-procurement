const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Password-only login route
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Fetch all office accounts
    const [offices] = await pool.query('SELECT * FROM offices');

    let matchedOffice = null;
    for (const office of offices) {
      const match = await bcrypt.compare(password.trim(), office.password_hash);
      if (match) {
        matchedOffice = office;
        break;
      }
    }

    if (!matchedOffice) {
      return res.status(401).json({ message: 'Invalid office password' });
    }

    const payload = {
      id: matchedOffice.id,
      office_name: matchedOffice.office_name,
      is_admin: Boolean(matchedOffice.is_admin),
      department: matchedOffice.department,
      contact_person: matchedOffice.contact_person,
      position: matchedOffice.position,
      email: matchedOffice.email,
      telephone: matchedOffice.telephone,
      profile_picture: matchedOffice.profile_picture
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: payload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [offices] = await pool.query(
      'SELECT id, office_name, is_admin, department, contact_person, position, email, telephone, profile_picture FROM offices WHERE id = ?',
      [req.user.id]
    );

    if (offices.length === 0) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.json(offices[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update profile details & avatar
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let { office_name, department, contact_person, position, email, telephone, profile_picture } = req.body;

    // Handle base64 image saving to disk
    if (profile_picture && profile_picture.startsWith('data:image/')) {
      try {
        const matches = profile_picture.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const fileName = `avatar_${userId}_${Date.now()}.${ext}`;
          
          const uploadDir = path.join(__dirname, '../../upload/avatars');
          const publicUploadDir = path.join(__dirname, '../../frontend/public/upload/avatars');
          
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          if (!fs.existsSync(publicUploadDir)) fs.mkdirSync(publicUploadDir, { recursive: true });
          
          const filePath = path.join(uploadDir, fileName);
          const publicFilePath = path.join(publicUploadDir, fileName);
          
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
          fs.writeFileSync(publicFilePath, buffer);
          
          profile_picture = `/upload/avatars/${fileName}`;
        }
      } catch (imgErr) {
        console.error('Failed to save profile picture file:', imgErr);
      }
    }

    // Validate unique email across all accounts
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const [existingEmail] = await pool.query(
        'SELECT id, office_name FROM offices WHERE LOWER(email) = ? AND id != ?',
        [cleanEmail, userId]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({
          message: `The email address "${email.trim()}" is already used by ${existingEmail[0].office_name}. Please use a unique email address.`
        });
      }
      email = cleanEmail;
    }


    await pool.query(
      `UPDATE offices SET
        office_name = COALESCE(NULLIF(?, ''), office_name),
        department = ?,
        contact_person = ?,
        position = ?,
        email = ?,
        telephone = ?,
        profile_picture = COALESCE(?, profile_picture)
      WHERE id = ?`,
      [office_name, department, contact_person, position, email, telephone, profile_picture, userId]
    );


    const [updated] = await pool.query(
      'SELECT id, office_name, is_admin, department, contact_person, position, email, telephone, profile_picture FROM offices WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Profile updated successfully!',
      user: updated[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: error.message || 'Error updating profile' });
  }
});

// Change password route
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters long' });
    }

    const [offices] = await pool.query('SELECT password_hash FROM offices WHERE id = ?', [userId]);
    if (offices.length === 0) {
      return res.status(404).json({ message: 'Office account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword.trim(), offices[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query('UPDATE offices SET password_hash = ? WHERE id = ?', [newHash, userId]);

    res.json({ message: 'Password changed successfully! Please use your new password for future logins.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Forgot Password - Request password reset from Admin
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find office strictly by email
    const [offices] = await pool.query(
      'SELECT id, office_name, email FROM offices WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    if (offices.length === 0) {
      return res.status(404).json({ message: 'No registered office account found with that email address.' });
    }

    const office = offices[0];

    // Check for existing pending request
    const [existing] = await pool.query(
      'SELECT id FROM password_reset_requests WHERE office_id = ? AND status = "pending"',
      [office.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: `A password reset request for "${office.office_name}" (${office.email}) is already pending approval by Supply Office Admin.` });
    }

    // Insert reset request
    await pool.query(
      'INSERT INTO password_reset_requests (office_id, office_name, email, status) VALUES (?, ?, ?, "pending")',
      [office.id, office.office_name, office.email]
    );

    res.json({
      message: `Password reset requested for ${office.office_name}! Supply Office (Admin) has been notified.`
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Error submitting password reset request' });
  }
});


// Get office notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    const [notifs] = await pool.query(
      `SELECT * FROM office_notifications WHERE office_id = ? ORDER BY created_at DESC LIMIT 20`,
      [officeId]
    );
    res.json(notifs);
  } catch (error) {
    console.error('Error fetching office notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notifications as read
router.post('/notifications/read', authenticateToken, async (req, res) => {
  try {
    const officeId = req.user.id;
    await pool.query(`UPDATE office_notifications SET is_read = 1 WHERE office_id = ?`, [officeId]);
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications read' });
  }
});

module.exports = router;

