// routes/adminAuth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Check if any admins exist (for first admin setup)
router.get('/check', async (req, res) => {
  try {
    // Check admin count with different table structures
    let adminCount = 0;
    
    try {
      // Try with new table structure first
      const [admins] = await pool.query('SELECT COUNT(*) as count FROM admins WHERE is_active = 1');
      adminCount = admins[0].count;
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        // Try with basic query
        try {
          const [admins] = await pool.query('SELECT COUNT(*) as count FROM admins');
          adminCount = admins[0].count;
        } catch (basicError) {
          if (basicError.code === 'ER_BAD_FIELD_ERROR') {
            // Table might not exist or have different structure
            console.log('[Admin Auth] Admins table may not exist or have different structure');
            adminCount = 0;
          } else {
            throw basicError;
          }
        }
      } else {
        throw error;
      }
    }
    
    res.json({
      success: true,
      hasAdmins: adminCount > 0,
      adminCount: adminCount,
      needsFirstAdmin: adminCount === 0
    });
  } catch (error) {
    console.error('[Admin Auth] Check admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check admin status'
    });
  }
});

// First admin registration (no admin key required)
router.post('/first-admin', async (req, res) => {
  try {
    // Check if any admins already exist
    let adminCount = 0;
    try {
      const [existingAdmins] = await pool.query('SELECT COUNT(*) as count FROM admins WHERE is_active = 1');
      adminCount = existingAdmins[0].count;
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        // No is_active column, use basic count
        try {
          const [existingAdmins] = await pool.query('SELECT COUNT(*) as count FROM admins');
          adminCount = existingAdmins[0].count;
        } catch (basicError) {
          if (basicError.code === 'ER_BAD_FIELD_ERROR') {
            // Table might not exist, assume no admins
            adminCount = 0;
          } else {
            throw basicError;
          }
        }
      } else {
        throw error;
      }
    }
    
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts already exist. Use regular registration with admin key.'
      });
    }

    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create first admin - handle different table structures
    let result;
    try {
      // Try with new table structure first
      result = await pool.query(
        'INSERT INTO admins (email, password_hash, is_active, permissions) VALUES (?, ?, 1, ?)',
        [email.toLowerCase(), passwordHash, JSON.stringify(['*'])]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        // Try with email and password_hash columns
        try {
          result = await pool.query(
            'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
            [email.toLowerCase(), passwordHash]
          );
        } catch (emailError) {
          if (emailError.code === 'ER_BAD_FIELD_ERROR') {
            // No email column, use username and password
            result = await pool.query(
              'INSERT INTO admins (username, password) VALUES (?, ?)',
              [email.toLowerCase(), passwordHash]
            );
          } else {
            throw emailError;
          }
        }
      } else {
        throw error;
      }
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: result.insertId,
        email: email.toLowerCase(),
        role: 'Admin',
        type: 'admin',
        permissions: ['*']
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'First admin created successfully',
      token,
      user: {
        id: result.insertId,
        name: email.split('@')[0], // Use email prefix as name
        email: email.toLowerCase(),
        role: 'Admin',
        permissions: ['*']
      }
    });
  } catch (error) {
    console.error('[Admin Auth] First admin creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin by email - handle different table structures
    let admins;
    try {
      // Try with new table structure first
      const [result] = await pool.query(
        'SELECT * FROM admins WHERE email = ? AND is_active = 1',
        [email.toLowerCase()]
      );
      admins = result;
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        // Try with email column without is_active
        try {
          const [result] = await pool.query(
            'SELECT * FROM admins WHERE email = ?',
            [email.toLowerCase()]
          );
          admins = result;
        } catch (emailError) {
          if (emailError.code === 'ER_BAD_FIELD_ERROR') {
            // No email column, use username instead
            const [result] = await pool.query(
              'SELECT * FROM admins WHERE username = ?',
              [email.toLowerCase()]
            );
            admins = result;
          } else {
            throw emailError;
          }
        }
      } else {
        throw error;
      }
    }

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const admin = admins[0];

    // Verify password - handle different table structures
    let isPasswordValid = false;
    
    if (admin.password_hash) {
      // New table structure with password_hash
      isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    } else if (admin.password) {
      // Old table structure with password field
      isPasswordValid = await bcrypt.compare(password, admin.password);
    } else {
      // No password field found
      console.error('[Admin Auth] No password field found in admin record');
      return res.status(401).json({
        success: false,
        message: 'Invalid admin record structure'
      });
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login (if column exists)
    try {
      await pool.query(
        'UPDATE admins SET last_login = NOW() WHERE id = ?',
        [admin.id]
      );
    } catch (updateError) {
      if (updateError.code === 'ER_BAD_FIELD_ERROR') {
        // last_login column doesn't exist, skip update
        console.log('[Admin Auth] last_login column not found, skipping update');
      } else {
        throw updateError;
      }
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: 'Admin',
        type: 'admin',
        permissions: admin.permissions ? JSON.parse(admin.permissions) : []
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get display name - use name if available, otherwise extract from username/email
    let displayName = admin.name;
    if (!displayName && admin.username) {
      // Extract name from email (part before @)
      displayName = admin.username.split('@')[0];
      // Capitalize first letter
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    if (!displayName && email) {
      displayName = email.split('@')[0];
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: admin.id,
        name: displayName || 'Admin',
        email: admin.email || admin.username || email,
        role: 'Admin',
        permissions: admin.permissions ? JSON.parse(admin.permissions) : ['*'],
        lastLogin: admin.last_login || null
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if admin already exists
    // Table has username and password columns only
    const [existingAdmins] = await pool.query(
      'SELECT id FROM admins WHERE username = ?',
      [email.toLowerCase()]
    );

    if (existingAdmins.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin - table has only username and password columns
    // Use email as username since that's what the table structure expects
    const [result] = await pool.query(
      'INSERT INTO admins (username, password) VALUES (?, ?)',
      [email.toLowerCase(), passwordHash]
    );

    // Create JWT token
    const token = jwt.sign(
      {
        id: result.insertId,
        email: email.toLowerCase(),
        role: 'Admin',
        type: 'admin',
        permissions: []
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user: {
        id: result.insertId,
        name,
        email: email.toLowerCase(),
        role: 'Admin',
        permissions: []
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get admin profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, name, email, is_active, last_login, created_at FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const admin = admins[0];

    res.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'Admin',
        isActive: admin.is_active,
        lastLogin: admin.last_login,
        createdAt: admin.created_at
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update admin profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email is already taken by another admin
    const [existingAdmins] = await pool.query(
      'SELECT id FROM admins WHERE email = ? AND id != ?',
      [email.toLowerCase(), decoded.id]
    );

    if (existingAdmins.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already taken by another admin'
      });
    }

    // Update admin profile
    await pool.query(
      'UPDATE admins SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [name, email.toLowerCase(), decoded.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('[Admin Auth] Update profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current password hash
    const [admins] = await pool.query(
      'SELECT password_hash FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admins[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, decoded.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('[Admin Auth] Change password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete account (self-deletion)
router.delete('/delete-account', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to confirm account deletion'
      });
    }

    // Get admin and verify password
    const [admins] = await pool.query(
      'SELECT id, password_hash FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admins[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Check if this is the last admin
    const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM admins WHERE is_active = 1');
    if (adminCount[0].count <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last admin account'
      });
    }

    // Soft delete: Mark as inactive instead of hard delete (to preserve data integrity)
    try {
      await pool.query(
        'UPDATE admins SET is_active = 0, deleted_at = NOW() WHERE id = ?',
        [decoded.id]
      );
    } catch (updateError) {
      // If is_active column doesn't exist, try without it
      if (updateError.code === 'ER_BAD_FIELD_ERROR') {
        try {
          await pool.query(
            'UPDATE admins SET deleted_at = NOW() WHERE id = ?',
            [decoded.id]
          );
        } catch (deleteError) {
          // If deleted_at doesn't exist either, just delete the record
          await pool.query('DELETE FROM admins WHERE id = ?', [decoded.id]);
        }
      } else {
        throw updateError;
      }
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('[Admin Auth] Delete account error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
