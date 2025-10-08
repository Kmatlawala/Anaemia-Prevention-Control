const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const adminRouter = require('./routes/admin');
const beneficiariesRouter = require('./routes/beneficiaries');
const reportsRouter = require('./routes/reports');
const notificationsRouter = require('./routes/notifications');
const devicesRouter = require('./routes/devices');
const pool = require('./db');

// Load environment variables
require('dotenv').config();

// Firebase Admin (FCM) init with service account if available
let admin = null;
try {
  // Prefer explicit env var path; fallback to ./firebase/animiaPrevention.json
  const saPath = process.env.FIREBASE_SA_PATH || require('path').join(__dirname, 'firebase', 'animiaPrevention.json');
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const adminSdk = require('firebase-admin');
  const serviceAccount = require(saPath);
  adminSdk.initializeApp({ credential: adminSdk.credential.cert(serviceAccount) });
  admin = adminSdk;
  console.log('[FCM] Firebase Admin initialized');
} catch (e) {
  console.warn('[FCM] Firebase Admin not initialized:', e?.message || e);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple request/response logger
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const bodyPreview = method === 'GET' ? undefined : (() => {
    try { return JSON.stringify(req.body).slice(0, 2000); } catch { return '[unserializable-body]'; }
  })();
  const queryPreview = Object.keys(req.query || {}).length ? req.query : undefined;
  console.log(`[REQ] ${method} ${originalUrl}`, { ip, query: queryPreview, body: bodyPreview });
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[RES] ${method} ${originalUrl} -> ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Using shared pool from ./db

// Test API
app.get('/', (req, res) => {
  res.send("Animia Backend API is running");
});

// Mount modular routers that use the shared pool via require('../db')
app.use('/api/auth/admin', adminRouter);
app.use('/api/beneficiaries', beneficiariesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/devices', devicesRouter);

// Fallback error logger (in case any middleware uses next(err))
// Note: Keep after routes
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERR] Unhandled error', { message: err?.message, stack: err?.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Ensure required tables for notifications exist
(async () => {
  try {
    // Core domain tables
    await pool.query(`CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(191) UNIQUE,
      password VARCHAR(191) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS beneficiaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      age INT NULL,
      gender VARCHAR(32) NULL,
      phone VARCHAR(64) NULL,
      address TEXT NULL,
      id_number VARCHAR(32) NULL,
      aadhaar_hash VARCHAR(191) NULL,
      dob VARCHAR(32) NULL,
      category VARCHAR(64) NULL,
      alt_phone VARCHAR(64) NULL,
      doctor_name VARCHAR(255) NULL,
      doctor_phone VARCHAR(64) NULL,
      registration_date DATETIME NULL,
      location VARCHAR(255) NULL,
      front_document TEXT NULL,
      back_document TEXT NULL,
      follow_up_due DATETIME NULL,
      hb DECIMAL(5,2) NULL,
      calcium_qty INT NULL,
      short_id VARCHAR(32) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (aadhaar_hash),
      UNIQUE KEY uniq_aadhaar_hash (aadhaar_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Conditional migration helper for existing DBs
    const ensureColumn = async (table, col, ddl) => {
      const [rows] = await pool.query(
        'SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, col]
      );
      if (!rows[0] || Number(rows[0].c) === 0) {
        try { await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`); } catch (e) { /* ignore */ }
      }
    };
    await ensureColumn('beneficiaries', 'id_number', 'id_number VARCHAR(32) NULL');
    await ensureColumn('beneficiaries', 'aadhaar_hash', 'aadhaar_hash VARCHAR(191) NULL');
    await ensureColumn('beneficiaries', 'dob', 'dob VARCHAR(32) NULL');
    await ensureColumn('beneficiaries', 'category', 'category VARCHAR(64) NULL');
    await ensureColumn('beneficiaries', 'alt_phone', 'alt_phone VARCHAR(64) NULL');
    await ensureColumn('beneficiaries', 'doctor_name', 'doctor_name VARCHAR(255) NULL');
    await ensureColumn('beneficiaries', 'doctor_phone', 'doctor_phone VARCHAR(64) NULL');
    await ensureColumn('beneficiaries', 'registration_date', 'registration_date DATETIME NULL');
    await ensureColumn('beneficiaries', 'location', 'location VARCHAR(255) NULL');
    await ensureColumn('beneficiaries', 'front_document', 'front_document TEXT NULL');
    await ensureColumn('beneficiaries', 'back_document', 'back_document TEXT NULL');
    await ensureColumn('beneficiaries', 'follow_up_due', 'follow_up_due DATETIME NULL');
    await ensureColumn('beneficiaries', 'hb', 'hb DECIMAL(5,2) NULL');
    await ensureColumn('beneficiaries', 'calcium_qty', 'calcium_qty INT NULL');
    await ensureColumn('beneficiaries', 'short_id', 'short_id VARCHAR(32) NULL');
    await ensureColumn('screenings', 'anemia_category', 'anemia_category VARCHAR(64) NULL');
    await ensureColumn('screenings', 'doctor_name', 'doctor_name VARCHAR(255) NULL');

    await pool.query(`CREATE TABLE IF NOT EXISTS screenings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      beneficiary_id VARCHAR(255) NOT NULL,
      doctor_name VARCHAR(255) NULL,
      hemoglobin DECIMAL(5,2) NULL,
      anemia_category VARCHAR(64) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(beneficiary_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Add missing columns to existing screenings table if they don't exist
    await ensureColumn('screenings', 'beneficiary_id', 'VARCHAR(255) NOT NULL');
    await ensureColumn('screenings', 'doctor_name', 'VARCHAR(255) NULL');
    await ensureColumn('screenings', 'anemia_category', 'VARCHAR(64) NULL');
    
    // Add missing columns to existing interventions table if they don't exist
    await ensureColumn('interventions', 'beneficiary_id', 'VARCHAR(255) NOT NULL');
    await ensureColumn('interventions', 'doctor_name', 'VARCHAR(255) NULL');
    await ensureColumn('interventions', 'ifa_yes', 'TINYINT(1) DEFAULT 0');
    await ensureColumn('interventions', 'ifa_quantity', 'INT NULL');
    await ensureColumn('interventions', 'calcium_yes', 'TINYINT(1) DEFAULT 0');
    await ensureColumn('interventions', 'calcium_quantity', 'INT NULL');
    await ensureColumn('interventions', 'deworm_yes', 'TINYINT(1) DEFAULT 0');
    await ensureColumn('interventions', 'deworming_date', 'DATE NULL');
    await ensureColumn('interventions', 'therapeutic_yes', 'TINYINT(1) DEFAULT 0');
    await ensureColumn('interventions', 'therapeutic_notes', 'TEXT NULL');
    await ensureColumn('interventions', 'referral_yes', 'TINYINT(1) DEFAULT 0');
    await ensureColumn('interventions', 'referral_facility', 'VARCHAR(255) NULL');
    
    // Migrate data from old columns to new ones if they exist
    try {
      // Check if old patient_id column exists and copy data to beneficiary_id
      const [columns] = await pool.query("SHOW COLUMNS FROM screenings LIKE 'patient_id'");
      if (columns.length > 0) {
        await pool.query('UPDATE screenings SET beneficiary_id = patient_id WHERE beneficiary_id IS NULL AND patient_id IS NOT NULL');
        console.log('Migrated data from patient_id to beneficiary_id');
      }
    } catch (err) {
      console.log('No patient_id column to migrate:', err.message);
    }
    
    // Remove old columns if they exist
    try {
      // Check if old columns exist and remove them
      const [patientIdColumn] = await pool.query("SHOW COLUMNS FROM screenings LIKE 'patient_id'");
      if (patientIdColumn.length > 0) {
        await pool.query('ALTER TABLE screenings DROP COLUMN patient_id');
        console.log('Removed patient_id column');
      }
      
      const [doctorIdColumn] = await pool.query("SHOW COLUMNS FROM screenings LIKE 'doctor_id'");
      if (doctorIdColumn.length > 0) {
        await pool.query('ALTER TABLE screenings DROP COLUMN doctor_id');
        console.log('Removed doctor_id column');
      }
    } catch (err) {
      console.log('Column removal error (may not exist):', err.message);
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS interventions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      beneficiary_id VARCHAR(255) NOT NULL,
      doctor_name VARCHAR(255) NULL,
      ifa_yes TINYINT(1) DEFAULT 0,
      ifa_quantity INT NULL,
      calcium_yes TINYINT(1) DEFAULT 0,
      calcium_quantity INT NULL,
      deworm_yes TINYINT(1) DEFAULT 0,
      deworming_date DATE NULL,
      therapeutic_yes TINYINT(1) DEFAULT 0,
      therapeutic_notes TEXT NULL,
      referral_yes TINYINT(1) DEFAULT 0,
      referral_facility VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(beneficiary_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS followups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      beneficiary_id VARCHAR(255) NOT NULL,
      followup_date DATETIME NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(beneficiary_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS notification_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(512) UNIQUE,
      platform VARCHAR(32) NULL,
      device_id VARCHAR(191) UNIQUE,
      model VARCHAR(128) NULL,
      is_registered TINYINT(1) DEFAULT 0,
      phone VARCHAR(64) NULL,
      alt_phone VARCHAR(64) NULL,
      doctor_phone VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    
    // Ensure is_registered column exists (migration for existing tables)
    try {
      await pool.query(`ALTER TABLE notification_tokens ADD COLUMN IF NOT EXISTS is_registered TINYINT(1) DEFAULT 0`);
    } catch (e) {
      // Column might already exist, ignore error
      console.log('[DB] is_registered column migration:', e?.message || 'already exists');
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255),
      body TEXT,
      data TEXT,
      device_id VARCHAR(191) NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {
    console.warn('[DB] notifications table init failed', e?.message || e);
  }
})();

// Expose admin to routes via app locals
app.locals.firebaseAdmin = admin;

//////////////////////////
// Start Server
//////////////////////////

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
