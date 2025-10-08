// routes/reports.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/patients', authenticateToken, async (req, res) => {
  try {
    console.log('[reports:patients]');
    const [[count]] = await pool.query('SELECT COUNT(*) as totalPatients FROM beneficiaries');
    res.json(count);
  } catch (err) {
    console.error('[reports:patients] error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
