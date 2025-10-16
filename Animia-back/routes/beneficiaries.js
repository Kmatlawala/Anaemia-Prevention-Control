// routes/beneficiaries.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const smsService = require('../services/smsService');
const { authenticateToken } = require('../middleware/auth');
// Helper to convert ISO string to MySQL DATETIME format
function toMySQLDateTime(dt) {
  if (!dt) return null;
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// list with optional limit - includes screening and intervention data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 1000;
    console.log('[beneficiaries:list] query', { limit });
    
    // Get beneficiaries with basic data first
    const [rows] = await pool.query(`
      SELECT * FROM beneficiaries 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);
    
    console.log('[beneficiaries:list] rows', { count: rows.length });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// get beneficiaries with screening and intervention data
router.get('/with-data', authenticateToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 1000;
    console.log('[beneficiaries:with-data] query', { limit });
    
    // Get beneficiaries with their latest screening and intervention data
    const [rows] = await pool.query(`
      SELECT 
        b.*,
        s.id as screening_id,
        s.hemoglobin as latest_hemoglobin,
        s.anemia_category as latest_anemia_category,
        s.notes as screening_notes,
        s.created_at as last_screening_date,
        i.id as intervention_id,
        i.ifa_yes as intervention_ifa_yes,
        i.ifa_quantity as intervention_ifa_quantity,
        i.calcium_yes as intervention_calcium_yes,
        i.calcium_quantity as intervention_calcium_quantity,
        i.deworm_yes as intervention_deworm_yes,
        i.deworming_date as intervention_deworming_date,
        i.therapeutic_yes as intervention_therapeutic_yes,
        i.therapeutic_notes as intervention_therapeutic_notes,
        i.referral_yes as intervention_referral_yes,
        i.referral_facility as intervention_referral_facility,
        i.created_at as last_intervention_date
      FROM beneficiaries b
      LEFT JOIN (
        SELECT beneficiary_id, id, hemoglobin, anemia_category, notes, created_at
        FROM screenings s1
        WHERE s1.id = (
          SELECT MAX(s2.id) FROM screenings s2 
          WHERE s2.beneficiary_id = s1.beneficiary_id
        )
      ) s ON b.short_id = s.beneficiary_id
      LEFT JOIN (
        SELECT beneficiary_id, id, ifa_yes, ifa_quantity, calcium_yes, calcium_quantity, 
               deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes, 
               referral_yes, referral_facility, created_at
        FROM interventions i1
        WHERE i1.id = (
          SELECT MAX(i2.id) FROM interventions i2 
          WHERE i2.beneficiary_id = i1.beneficiary_id
        )
      ) i ON b.short_id = i.beneficiary_id
      ORDER BY b.created_at DESC 
      LIMIT ?
    `, [limit]);
    
    console.log('[beneficiaries:with-data] rows', { count: rows.length });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// create
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name, age, gender, phone, address,
      id_number, aadhaar_hash, dob, category, alt_phone,
      doctor_name, doctor_phone, registration_date, location,
      follow_up_due, hb, calcium_qty,
      short_id,
    } = req.body;
    console.log('[beneficiaries:create] body', { name, age, gender, phone, address, category, location });
    const [result] = await pool.query(
      `INSERT INTO beneficiaries (
        name, age, gender, phone, address,
        id_number, aadhaar_hash, dob, category, alt_phone,
        doctor_name, doctor_phone, registration_date, location, follow_up_due, hb, calcium_qty, short_id
      ) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?, ?, ?, ?)`,
      [
        name, age || null, gender || null, phone || null, address || null,
        id_number || null, aadhaar_hash || null, dob || null, category || null, alt_phone || null,
        doctor_name || null, doctor_phone || null, toMySQLDateTime(registration_date), location || null,
        toMySQLDateTime(follow_up_due), hb ?? null,
        calcium_qty ?? null, short_id || null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM beneficiaries WHERE id = ?', [result.insertId]);
    console.log('[beneficiaries:create] created', { id: result.insertId });
    try {
      // Send a broadcast notification (to all registered tokens) that a new beneficiary is registered
      const app = req.app;
      const title = 'Registration successful';
      const nbody = `Beneficiary ${name || ''} registered.`;
      const data = { 
        type: 'registration', 
        id: String(result.insertId),
        beneficiary: {
          id: result.insertId,
          name: name,
          age: age,
          gender: gender,
          phone: phone,
          alt_phone: alt_phone,
          address: address,
          category: category,
          short_id: short_id,
          doctor_name: doctor_name,
          doctor_phone: doctor_phone,
          registration_date: registration_date,
          location: location
        }
      };
      if (app?.locals?.firebaseAdmin) {
        const [tks] = await pool.query('SELECT token FROM notification_tokens');
        const tokens = tks.map(r => r.token);
        if (tokens.length) {
          await app.locals.firebaseAdmin.messaging().sendEachForMulticast({ tokens, notification: { title, body: nbody }, data });
        }
      } else {
        // Fallback to route-based sender
        try {
          await fetch(`${req.protocol}://${req.get('host')}/api/notifications/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body: nbody, data })
          });
        } catch (_) {}
      }
      try { await pool.query('INSERT INTO notifications_log (title, body, data) VALUES (?,?,?)', [title, nbody, JSON.stringify(data)]); } catch (_) {}
      
      // Send SMS to beneficiary if phone number is available (same as update)
      if (phone) {
        try {
          await smsService.sendRegistrationSMS({
            name: name,
            phone: phone,
            short_id: short_id
          });
          console.log('[beneficiaries:create] SMS sent to beneficiary:', phone);
        } catch (smsError) {
          console.warn('[beneficiaries:create] SMS failed:', smsError?.message || smsError);
        }
      }
    } catch (e) { console.warn('[beneficiaries:create] notify failed', e?.message || e); }
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[beneficiaries:create] error', err);
    res.status(500).json({ error: err.message });
  }
});

// update
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name, age, gender, phone, address,
      id_number, aadhaar_hash, dob, category, alt_phone,
      doctor_name, doctor_phone, registration_date, location,
      follow_up_due, hb, calcium_qty,
      short_id,
    } = req.body;
    console.log('[beneficiaries:update] id', id);
    await pool.query(
      `UPDATE beneficiaries SET
        name = ?, age = ?, gender = ?, phone = ?, address = ?,
        id_number = ?, aadhaar_hash = ?, dob = ?, category = ?, alt_phone = ?,
        doctor_name = ?, doctor_phone = ?, registration_date = ?, location = ?,
        front_document = NULL, back_document = NULL, follow_up_due = ?, hb = ?, calcium_qty = ?,
        short_id = COALESCE(?, short_id)
       WHERE id = ?`,
      [
        name || null, age || null, gender || null, phone || null, address || null,
        id_number || null, aadhaar_hash || null, dob || null, category || null, alt_phone || null,
        doctor_name || null, doctor_phone || null, toMySQLDateTime(registration_date), location || null,
        toMySQLDateTime(follow_up_due), hb ?? null,
        calcium_qty ?? null, short_id || null, id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM beneficiaries WHERE id = ?', [id]);
    try {
      const app = req.app;
      const title = 'Beneficiary updated';
      const nbody = `Beneficiary ${rows?.[0]?.name || ''} updated.`;
      const data = { 
        type: 'beneficiary_updated', 
        id: String(id),
        beneficiary: rows?.[0] || null
      };
      if (app?.locals?.firebaseAdmin) {
        const [tks] = await pool.query('SELECT token FROM notification_tokens');
        const tokens = tks.map(r => r.token);
        if (tokens.length) {
          await app.locals.firebaseAdmin.messaging().sendEachForMulticast({ tokens, notification: { title, body: nbody }, data });
        }
      }
      try { await pool.query('INSERT INTO notifications_log (title, body, data) VALUES (?,?,?)', [title, nbody, JSON.stringify(data)]); } catch (_) {}
      
      // Send SMS to beneficiary if phone number is available
      if (phone && rows?.[0]?.name) {
        try {
          await smsService.sendUpdateSMS({
            name: rows[0].name,
            phone: phone,
            short_id: rows[0].short_id
          });
          console.log('[beneficiaries:update] SMS sent to beneficiary:', phone);
        } catch (smsError) {
          console.warn('[beneficiaries:update] SMS failed:', smsError?.message || smsError);
        }
      }
    } catch (e) { console.warn('[beneficiaries:update] notify failed', e?.message || e); }
    res.json(rows?.[0] || { id });
  } catch (err) {
    console.error('[beneficiaries:update] error', err);
    res.status(500).json({ error: err.message });
  }
});

// get one
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[beneficiaries:getOne] id', id);
    const [rows] = await pool.query('SELECT * FROM beneficiaries WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get by unique_id (short_id)
router.get('/unique/:uniqueId', authenticateToken, async (req, res) => {
  try {
    const uniqueId = req.params.uniqueId;
    console.log('[beneficiaries:getByUniqueId] uniqueId', uniqueId);
    const [rows] = await pool.query('SELECT * FROM beneficiaries WHERE short_id = ?', [uniqueId]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// screenings for beneficiary
router.post('/:id/screenings', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { beneficiary_id, hemoglobin, notes, doctor_name, anemia_category, pallor, visit_type, severity } = req.body;
    
    // Validate beneficiary ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid beneficiary ID' });
    }
    
    // Check if beneficiary exists
    const [beneficiary] = await pool.query('SELECT short_id FROM beneficiaries WHERE id = ?', [id]);
    if (!beneficiary.length) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }
    
    console.log('[screenings:create] body', { beneficiary_id: beneficiary[0].short_id, hemoglobin, notes, doctor_name, anemia_category, pallor, visit_type, severity });
    
    // Handle notes - convert array to string or null
    const notesValue = Array.isArray(notes) && notes.length > 0 ? notes.join(', ') : null;
    
    const [r] = await pool.query(
      'INSERT INTO screenings (beneficiary_id, doctor_name, hemoglobin, anemia_category, pallor, visit_type, severity, notes) VALUES (?,?,?,?,?,?,?,?)',
      [beneficiary[0].short_id, doctor_name || null, hemoglobin || null, anemia_category || null, pallor || null, visit_type || null, severity || null, notesValue]
    );
    console.log('[screenings:create] created', { id: r.insertId });
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error('[screenings:create] error', err);
    res.status(500).json({ error: err.message });
  }
});

// interventions
router.post('/:id/interventions', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { 
      ifa_yes, ifa_quantity, calcium_yes, calcium_quantity, 
      deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes,
      referral_yes, referral_facility, doctor_name 
    } = req.body;
    
    // Validate beneficiary ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid beneficiary ID' });
    }
    
    // Check if beneficiary exists
    const [beneficiary] = await pool.query('SELECT short_id FROM beneficiaries WHERE id = ?', [id]);
    if (!beneficiary.length) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }
    
    console.log('[interventions:create] body', { 
      beneficiary_id: beneficiary[0].short_id, 
      ifa_yes, ifa_quantity, calcium_yes, calcium_quantity,
      deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes,
      referral_yes, referral_facility, doctor_name
    });
    
    const [r] = await pool.query(`
      INSERT INTO interventions (
        beneficiary_id, doctor_name, ifa_yes, ifa_quantity, 
        calcium_yes, calcium_quantity, deworm_yes, deworming_date,
        therapeutic_yes, therapeutic_notes, referral_yes, referral_facility
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      beneficiary[0].short_id, doctor_name || null,
      ifa_yes || 0, ifa_quantity || null,
      calcium_yes || 0, calcium_quantity || null,
      deworm_yes || 0, deworming_date || null,
      therapeutic_yes || 0, therapeutic_notes || null,
      referral_yes || 0, referral_facility || null
    ]);
    
    console.log('[interventions:create] created', { id: r.insertId });
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error('[interventions:create] error', err);
    res.status(500).json({ error: err.message });
  }
});

// followups
router.post('/:id/followups', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { followup_date, notes } = req.body;
    console.log('[followups:create] body', { beneficiary_id: id, followup_date, notes });
    const [r] = await pool.query(
      'INSERT INTO followups (beneficiary_id, followup_date, notes) VALUES (?,?,?)',
      [id, followup_date || null, notes || null]
    );
    console.log('[followups:create] created', { id: r.insertId });
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error('[followups:create] error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
