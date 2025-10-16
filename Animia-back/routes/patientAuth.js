// routes/patientAuth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Patient login endpoint
router.post('/login', async (req, res) => {
  try {
    const { role } = req.body || {};
    
    // For now, we'll allow any patient role to login
    // In the future, you might want to add actual patient credentials
    if (!role || String(role).toLowerCase() !== 'patient') {
      return res.status(400).json({ 
        error: 'Invalid role. Only patient role is allowed.',
        errorType: 'INVALID_ROLE'
      });
    }

    // Create a JWT token for patient users
    const token = jwt.sign(
      { 
        id: 'patient_user',
        role: 'Patient',
        type: 'patient'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: 'patient_user',
        role: 'Patient'
      }
    });
  } catch (err) {
    console.error('[Patient Auth] Login error:', err);
    res.status(500).json({ 
      error: 'Login failed',
      errorType: 'LOGIN_ERROR'
    });
  }
});

module.exports = router;
