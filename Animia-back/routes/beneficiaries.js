// routes/beneficiaries.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
// SMS is handled by native frontend
const { authenticateToken } = require('../middleware/auth');

// Test endpoint to verify database update functionality
router.post('/test-update/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[beneficiaries:test-update] Testing update for id:', id);
    
    // Test update with simple values
    const testResult = await pool.query(
      'UPDATE beneficiaries SET follow_up_done = 1, last_followed = NOW() WHERE id = ?',
      [id]
    );
    
    console.log('[beneficiaries:test-update] Test update result:', testResult);
    console.log('[beneficiaries:test-update] Rows affected:', testResult[0].affectedRows);
    
    // Check the updated data
    const [rows] = await pool.query('SELECT id, name, follow_up_done, last_followed FROM beneficiaries WHERE id = ?', [id]);
    console.log('[beneficiaries:test-update] Updated data:', rows[0]);
    
    res.json({
      success: true,
      message: 'Test update completed',
      rowsAffected: testResult[0].affectedRows,
      updatedData: rows[0]
    });
  } catch (error) {
    console.error('[beneficiaries:test-update] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
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
        s.pallor as latest_pallor,
        s.pallor_location as latest_pallor_location,
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
        SELECT s1.*
        FROM screenings s1
        INNER JOIN (
          SELECT beneficiary_id, MAX(id) as max_id
          FROM screenings
          GROUP BY beneficiary_id
        ) s2 ON s1.beneficiary_id = s2.beneficiary_id AND s1.id = s2.max_id
      ) s ON b.short_id = s.beneficiary_id
      LEFT JOIN (
        SELECT i1.*
        FROM interventions i1
        INNER JOIN (
          SELECT beneficiary_id, MAX(id) as max_id
          FROM interventions
          GROUP BY beneficiary_id
        ) i2 ON i1.beneficiary_id = i2.beneficiary_id AND i1.id = i2.max_id
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

// Helper function to generate unique short_id
async function generateUniqueShortId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate random 4-character ID
    let shortId = '';
    for (let i = 0; i < 4; i++) {
      shortId += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    
    // Check if it already exists
    const [existing] = await pool.query(
      'SELECT id FROM beneficiaries WHERE short_id = ?',
      [shortId]
    );
    
    if (existing.length === 0) {
      return shortId; // Unique ID found
    }
    
    attempts++;
  }
  
  // If we couldn't generate a unique ID after max attempts, throw error
  throw new Error('Failed to generate unique short_id after multiple attempts');
}

// create
router.post('/', authenticateToken, async (req, res) => {
  try {
    let {
      name, age, gender, phone, email, address,
      id_number, aadhaar_hash, dob, category, alt_phone,
      doctor_name, doctor_phone, registration_date, location,
      follow_up_due, hb, calcium_qty,
      short_id,
    } = req.body;
    
    // If short_id is not provided or already exists, generate a new unique one
    if (!short_id) {
      short_id = await generateUniqueShortId();
      console.log('[beneficiaries:create] Generated new short_id:', short_id);
    } else {
      // Check if provided short_id already exists
      const [existing] = await pool.query(
        'SELECT id FROM beneficiaries WHERE short_id = ?',
        [short_id]
      );
      
      if (existing.length > 0) {
        console.log('[beneficiaries:create] Provided short_id already exists, generating new one');
        short_id = await generateUniqueShortId();
        console.log('[beneficiaries:create] Generated new short_id:', short_id);
      }
    }
    
    console.log('[beneficiaries:create] body', { name, age, gender, phone, email, address, category, location, short_id });
    const [result] = await pool.query(
      `INSERT INTO beneficiaries (
        name, age, gender, phone, email, address,
        id_number, aadhaar_hash, dob, category, alt_phone,
        doctor_name, doctor_phone, registration_date, location, follow_up_due, hb, calcium_qty, short_id
      ) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, ?, ?, ?, ?)`,
      [
        name, age || null, gender || null, phone || null, email || null, address || null,
        id_number || null, aadhaar_hash || null, dob || null, category || null, alt_phone || null,
        doctor_name || null, doctor_phone || null, toMySQLDateTime(registration_date), location || null,
        toMySQLDateTime(follow_up_due), hb ?? null,
        calcium_qty ?? null, short_id,
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
      name, age, gender, phone, email, address,
      id_number, aadhaar_hash, dob, category, alt_phone,
      doctor_name, doctor_phone, registration_date, location,
      follow_up_due, follow_up_done, last_followed, hb, calcium_qty,
      short_id,
    } = req.body;
    console.log('[beneficiaries:update] id', id);
    console.log('[beneficiaries:update] follow_up_done:', follow_up_done, typeof follow_up_done);
    console.log('[beneficiaries:update] follow_up_due:', follow_up_due, typeof follow_up_due);
    console.log('[beneficiaries:update] last_followed:', last_followed, typeof last_followed);
    console.log('[beneficiaries:update] Full request body:', JSON.stringify(req.body, null, 2));
    
    // Debug the converted values
    console.log('[beneficiaries:update] Converted follow_up_due:', toMySQLDateTime(follow_up_due));
    console.log('[beneficiaries:update] Converted last_followed:', toMySQLDateTime(last_followed));
    console.log('[beneficiaries:update] follow_up_done value for SQL:', follow_up_done ?? null);
    
    const updateResult = await pool.query(
      `UPDATE beneficiaries SET
        name = ?, age = ?, gender = ?, phone = ?, email = ?, address = ?,
        id_number = ?, aadhaar_hash = ?, dob = ?, category = ?, alt_phone = ?,
        doctor_name = ?, doctor_phone = ?, registration_date = ?, location = ?,
        front_document = NULL, back_document = NULL, follow_up_due = ?, follow_up_done = ?, 
        last_followed = ?, hb = ?, calcium_qty = ?,
        short_id = COALESCE(?, short_id)
       WHERE id = ?`,
      [
        name || null, age || null, gender || null, phone || null, email || null, address || null,
        id_number || null, aadhaar_hash || null, dob || null, category || null, alt_phone || null,
        doctor_name || null, doctor_phone || null, toMySQLDateTime(registration_date), location || null,
        toMySQLDateTime(follow_up_due), follow_up_done ?? null, 
        toMySQLDateTime(last_followed), hb ?? null,
        calcium_qty ?? null, short_id || null, id,
      ]
    );
    
    console.log('[beneficiaries:update] Update result:', updateResult);
    console.log('[beneficiaries:update] Rows affected:', updateResult[0].affectedRows);
    
    // Check if update was successful
    if (updateResult[0].affectedRows === 0) {
      console.error('[beneficiaries:update] ERROR: No rows were updated!');
      return res.status(400).json({ error: 'No rows updated. Check if beneficiary exists.' });
    }
    
    const [rows] = await pool.query('SELECT * FROM beneficiaries WHERE id = ?', [id]);
    console.log('[beneficiaries:update] Updated beneficiary data:', {
      id: rows[0]?.id,
      name: rows[0]?.name,
      follow_up_done: rows[0]?.follow_up_done,
      follow_up_due: rows[0]?.follow_up_due,
      last_followed: rows[0]?.last_followed
    });
    
    // Verify the update worked
    if (follow_up_done === 1 && rows[0]?.follow_up_done !== 1) {
      console.error('[beneficiaries:update] ERROR: follow_up_done was not updated correctly!');
    }
    if (last_followed && !rows[0]?.last_followed) {
      console.error('[beneficiaries:update] ERROR: last_followed was not updated correctly!');
    }
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
      
              // SMS is handled by native frontend, no backend SMS needed
    } catch (e) { console.warn('[beneficiaries:update] notify failed', e?.message || e); }
    res.json(rows?.[0] || { id });
  } catch (err) {
    console.error('[beneficiaries:update] error', err);
    res.status(500).json({ error: err.message });
  }
});

// get all historical screenings and interventions for a beneficiary
// NOTE: This route must come BEFORE /:id route to avoid route matching conflicts
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[beneficiaries:history] id', id);
    
    // Get beneficiary short_id
    const [beneficiary] = await pool.query('SELECT short_id FROM beneficiaries WHERE id = ?', [id]);
    if (!beneficiary.length) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }
    
    const shortId = beneficiary[0].short_id;
    
    // Get all screenings ordered by date (newest first)
    const [screenings] = await pool.query(
      `SELECT id, hemoglobin, anemia_category, pallor, visit_type, severity, notes, created_at
       FROM screenings
       WHERE beneficiary_id = ?
       ORDER BY created_at DESC`,
      [shortId]
    );
    
    // Get all interventions ordered by date (newest first)
    const [interventions] = await pool.query(
      `SELECT id, ifa_yes, ifa_quantity, calcium_yes, calcium_quantity,
              deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes,
              referral_yes, referral_facility, created_at
       FROM interventions
       WHERE beneficiary_id = ?
       ORDER BY created_at DESC`,
      [shortId]
    );
    
    console.log('[beneficiaries:history] found', {
      screenings: screenings.length,
      interventions: interventions.length
    });
    
    res.json({
      success: true,
      screenings,
      interventions
    });
  } catch (err) {
    console.error('[beneficiaries:history] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// get one
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[beneficiaries:getOne] id', id);
    
    // Get beneficiary with their latest screening and intervention data
    const [rows] = await pool.query(`
      SELECT 
        b.*,
        s.id as screening_id,
        s.hemoglobin as latest_hemoglobin,
        s.anemia_category as latest_anemia_category,
        s.pallor as latest_pallor,
        s.pallor_location as latest_pallor_location,
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
        SELECT s1.*
        FROM screenings s1
        INNER JOIN (
          SELECT beneficiary_id, MAX(id) as max_id
          FROM screenings
          GROUP BY beneficiary_id
        ) s2 ON s1.beneficiary_id = s2.beneficiary_id AND s1.id = s2.max_id
      ) s ON b.short_id = s.beneficiary_id
      LEFT JOIN (
        SELECT i1.*
        FROM interventions i1
        INNER JOIN (
          SELECT beneficiary_id, MAX(id) as max_id
          FROM interventions
          GROUP BY beneficiary_id
        ) i2 ON i1.beneficiary_id = i2.beneficiary_id AND i1.id = i2.max_id
      ) i ON b.short_id = i.beneficiary_id
      WHERE b.id = ?
    `, [id]);
    
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    
    console.log('[beneficiaries:getOne] found beneficiary:', {
      id: rows[0].id,
      short_id: rows[0].short_id,
      screening_id: rows[0].screening_id,
      latest_hemoglobin: rows[0].latest_hemoglobin,
      intervention_id: rows[0].intervention_id,
      intervention_ifa_yes: rows[0].intervention_ifa_yes,
      intervention_ifa_quantity: rows[0].intervention_ifa_quantity,
    });
    
    res.json({
      success: true,
      beneficiary: rows[0]
    });
  } catch (err) {
    console.error('[beneficiaries:getOne] error:', err);
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
    const { beneficiary_id, hemoglobin, notes, doctor_name, anemia_category, pallor, pallor_location, visit_type, severity } = req.body;
    
    // Validate beneficiary ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid beneficiary ID' });
    }
    
    // Check if beneficiary exists
    const [beneficiary] = await pool.query('SELECT short_id FROM beneficiaries WHERE id = ?', [id]);
    if (!beneficiary.length) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }
    
    console.log('[screenings:create] body', { beneficiary_id: beneficiary[0].short_id, hemoglobin, notes, notesType: typeof notes, isArray: Array.isArray(notes), doctor_name, anemia_category, pallor, pallor_location, visit_type, severity });
    
    // Handle notes - convert array to string or use string as-is, or null
    let notesValue = null;
    if (notes) {
      if (Array.isArray(notes)) {
        notesValue = notes.length > 0 ? notes.join(', ') : null;
      } else if (typeof notes === 'string' && notes.trim().length > 0) {
        notesValue = notes.trim();
      }
    }
    console.log('[screenings:create] notesValue after processing:', notesValue);
    console.log('[screenings:create] pallor_location value:', pallor_location);
    
    // Ensure columns exist before inserting
    try {
      // Check and add pallor_location column if it doesn't exist
      const [pallorLocationCheck] = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'screenings' AND COLUMN_NAME = 'pallor_location'"
      );
      if (pallorLocationCheck.length === 0) {
        console.log('[screenings:create] Adding pallor_location column...');
        await pool.query('ALTER TABLE screenings ADD COLUMN pallor_location VARCHAR(32) NULL');
        console.log('[screenings:create] pallor_location column added successfully');
      } else {
        console.log('[screenings:create] pallor_location column exists');
      }
      
      // Check and ensure notes column exists (should exist, but verify)
      const [notesCheck] = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'screenings' AND COLUMN_NAME = 'notes'"
      );
      if (notesCheck.length === 0) {
        console.log('[screenings:create] Adding notes column...');
        await pool.query('ALTER TABLE screenings ADD COLUMN notes TEXT NULL');
        console.log('[screenings:create] notes column added successfully');
      } else {
        console.log('[screenings:create] notes column exists');
      }
    } catch (alterError) {
      console.error('[screenings:create] Error checking/adding columns:', alterError.message);
      // Continue anyway - columns might exist
    }
    
    // Prepare insert values
    const insertValues = [
      beneficiary[0].short_id,
      doctor_name || null,
      hemoglobin || null,
      anemia_category || null,
      pallor || null,
      pallor_location || null,
      visit_type || null,
      severity || null,
      notesValue
    ];
    
    console.log('[screenings:create] Insert values:', {
      beneficiary_id: insertValues[0],
      hemoglobin: insertValues[2],
      pallor: insertValues[4],
      pallor_location: insertValues[5],
      notes: insertValues[8],
      notesType: typeof insertValues[8],
      notesLength: insertValues[8] ? insertValues[8].length : 0,
    });
    
    // Insert with all columns
    const [r] = await pool.query(
      'INSERT INTO screenings (beneficiary_id, doctor_name, hemoglobin, anemia_category, pallor, pallor_location, visit_type, severity, notes) VALUES (?,?,?,?,?,?,?,?,?)',
      insertValues
    );
    
    // Verify the inserted data
    const [verifyRows] = await pool.query(
      'SELECT id, beneficiary_id, hemoglobin, pallor, pallor_location, notes FROM screenings WHERE id = ?',
      [r.insertId]
    );
    console.log('[screenings:create] Verified inserted data:', verifyRows[0]);
    console.log('[screenings:create] created', { id: r.insertId, notes: notesValue, pallor: pallor, pallor_location: pallor_location });
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
