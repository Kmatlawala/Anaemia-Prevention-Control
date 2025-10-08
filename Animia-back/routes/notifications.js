// routes/notifications.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Use Node 18+ global fetch or fallback to node-fetch v2 if available
let doFetch = typeof fetch === 'function' ? fetch : null;
if (!doFetch) {
  try { doFetch = require('node-fetch'); } catch (_) {}
}

// POST /api/notifications/send
// body: { token?: string, title: string, body: string, data?: object }
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { token, title, body, data } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'title, body are required' });
    const admin = req.app?.locals?.firebaseAdmin || null;
    if (!admin && !process.env.FCM_SERVER_KEY) return res.status(500).json({ error: 'FCM credentials not configured' });

    let tokens = [];
    if (token) {
      tokens = [token];
    } else {
      const [rows] = await pool.query('SELECT token FROM notification_tokens');
      tokens = rows.map(r => r.token);
    }
    if (!tokens.length) return res.status(400).json({ error: 'No tokens to send' });

    let sendResult = null;
    if (admin) {
      sendResult = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data || {},
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
      });
    } else {
      if (!doFetch) return res.status(500).json({ error: 'fetch not available on server' });
      const payload = { registration_ids: tokens, notification: { title, body }, data: data || {} };
      const resp = await doFetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `key=${process.env.FCM_SERVER_KEY}` }, body: JSON.stringify(payload)
      });
      sendResult = await resp.json().catch(() => ({}));
      if (!resp.ok) return res.status(resp.status).json({ error: 'FCM send failed', details: sendResult });
    }

    // Persist one row per target token with resolved device_id (if available)
    try {
      if (tokens && tokens.length) {
        // Map tokens to device_ids if present in notification_tokens
        const [rowsMap] = await pool.query('SELECT token, device_id FROM notification_tokens WHERE token IN (?)', [tokens]);
        const tokenToDevice = new Map(rowsMap.map(r => [r.token, r.device_id]));
        for (const tk of tokens) {
          const deviceId = tokenToDevice.get(tk) || null;
          try {
            await pool.query(
              'INSERT INTO notifications_log (title, body, data, device_id) VALUES (?,?,?,?)',
              [title, body, JSON.stringify(data || {}), deviceId]
            );
          } catch (_) {}
        }
      } else {
        // Fallback single row without device_id
        await pool.query('INSERT INTO notifications_log (title, body, data) VALUES (?,?,?)', [title, body, JSON.stringify(data || {})]);
      }
    } catch (_) {}
    res.json({ success: true, result: sendResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register device token (public endpoint - no auth required)
router.post('/register-token', async (req, res) => {
  try {
    const { token, platform, device_id, model, is_registered } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    // Upsert by device_id if provided, else by token
    if (device_id) {
      await pool.query(
        `INSERT INTO notification_tokens (device_id, token, platform, model, is_registered)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE token=VALUES(token), platform=VALUES(platform), model=VALUES(model), is_registered=VALUES(is_registered)`,
        [device_id, token, platform || null, model || null, is_registered ? 1 : 0]
      );
    } else {
      await pool.query(
        `INSERT INTO notification_tokens (token, platform, is_registered)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE platform=VALUES(platform), is_registered=VALUES(is_registered)`,
        [token, platform || null, is_registered ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List notifications (recent). Optional filter by device_id
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.query.device_id || null;
    let rows;
    if (deviceId) {
      [rows] = await pool.query(
        'SELECT id, title, body, data, sent_at, device_id FROM notifications_log WHERE device_id = ? ORDER BY sent_at DESC LIMIT 200',
        [deviceId]
      );
    } else {
      [rows] = await pool.query('SELECT id, title, body, data, sent_at, device_id FROM notifications_log ORDER BY sent_at DESC LIMIT 200');
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



