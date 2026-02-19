// routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// register admin
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[admin:register] body', { username });
    if (!username || !password) return res.status(400).json({ message: 'username & password required' });
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admins (username, password) VALUES (?, ?)', [username, hashed]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Username exists' });
    console.error('[admin:register] error', err);
    res.status(500).json({ error: err.message });
  }
});

// login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[admin:login] body', { username });
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found', errorType: 'USER_NOT_FOUND' });
    }
    
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ message: 'Incorrect password', errorType: 'WRONG_PASSWORD' });
    }
    
    const token = jwt.sign({ id: admin.id, username: admin.username, role: 'Admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    console.error('[admin:login] error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
