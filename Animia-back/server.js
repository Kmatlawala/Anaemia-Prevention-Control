const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
const fs = require('fs');
const path = require('path');
const adminRouter = require('./routes/admin');
const adminAuthRouter = require('./routes/adminAuth');
const patientAuthRouter = require('./routes/patientAuth');
const dotRouter = require('./routes/dot');
const beneficiariesRouter = require('./routes/beneficiaries');
const reportsRouter = require('./routes/reports');
const notificationsRouter = require('./routes/notifications');
const devicesRouter = require('./routes/devices');
const syncRouter = require('./routes/sync');

// Load OTP router with error handling
let otpRouter;
try {
  otpRouter = require('./routes/otp');
} catch (error) {
  console.error('[Server] Failed to load OTP router:', error);
  otpRouter = require('express').Router();
  otpRouter.post('/send', (req, res) => {
    res.status(503).json({ success: false, error: 'OTP service not available' });
  });
}

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
} catch (e) {
  console.warn('[FCM] Firebase Admin not initialized:', e?.message || e);
}

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // Disable trust proxy to avoid security warnings
});

app.use(limiter);

// CORS configuration for production - Allow all origins for mobile apps
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all origins for production (mobile apps don't have fixed origins)
    // In development, you can restrict this to specific origins
    if (process.env.NODE_ENV === 'production') {
      // Allow all origins for mobile app compatibility
      return callback(null, true);
    }
    
    // For development, allow specific origins
    const allowedOrigins = [
      'https://3.80.46.128',
      'http://3.80.46.128:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.31.143:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, log and allow (for debugging)
      console.log('[CORS] Allowing origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/admin', adminRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/patient-auth', patientAuthRouter);
app.use('/api/dot', dotRouter);
app.use('/api/beneficiaries', beneficiariesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/otp', otpRouter);
console.log('[Server] OTP router mounted at /api/otp');

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
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      permissions JSON DEFAULT NULL,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_is_active (is_active)
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
    await ensureColumn('beneficiaries', 'follow_up_done', 'follow_up_done TINYINT(1) DEFAULT 0');
    await ensureColumn('beneficiaries', 'last_followed', 'last_followed DATETIME NULL');
    await ensureColumn('beneficiaries', 'hb', 'hb DECIMAL(5,2) NULL');
    await ensureColumn('beneficiaries', 'calcium_qty', 'calcium_qty INT NULL');
    await ensureColumn('beneficiaries', 'short_id', 'short_id VARCHAR(32) NULL');
    await ensureColumn('screenings', 'anemia_category', 'anemia_category VARCHAR(64) NULL');
    await ensureColumn('screenings', 'doctor_name', 'doctor_name VARCHAR(255) NULL');
    await ensureColumn('screenings', 'pallor', 'pallor VARCHAR(32) NULL');
    await ensureColumn('screenings', 'pallor_location', 'pallor_location VARCHAR(32) NULL');
    await ensureColumn('screenings', 'visit_type', 'visit_type VARCHAR(32) NULL');
    await ensureColumn('screenings', 'severity', 'severity VARCHAR(32) NULL');

    await pool.query(`CREATE TABLE IF NOT EXISTS screenings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      beneficiary_id VARCHAR(255) NOT NULL,
      doctor_name VARCHAR(255) NULL,
      hemoglobin DECIMAL(5,2) NULL,
      anemia_category VARCHAR(64) NULL,
      pallor VARCHAR(32) NULL,
      pallor_location VARCHAR(32) NULL,
      visit_type VARCHAR(32) NULL,
      severity VARCHAR(32) NULL,
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
      // Check if column exists first
      const [columns] = await pool.query(
        'SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        ['notification_tokens', 'is_registered']
      );
      if (!columns[0] || Number(columns[0].c) === 0) {
        await pool.query(`ALTER TABLE notification_tokens ADD COLUMN is_registered TINYINT(1) DEFAULT 0`);
      }
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

    // OTP requests table
    await pool.query(`CREATE TABLE IF NOT EXISTS otp_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_hash VARCHAR(64) NOT NULL,
      otp_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INT DEFAULT 0,
      status ENUM('pending', 'verified', 'expired', 'failed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      verified_at TIMESTAMP NULL,
      INDEX idx_phone_hash (phone_hash),
      INDEX idx_status (status),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('[DB] OTP requests table created/verified');

    // DOT Adherence table for IFA tracking
    await pool.query(`CREATE TABLE IF NOT EXISTS dot_adherence (
      id INT AUTO_INCREMENT PRIMARY KEY,
      beneficiary_id INT NOT NULL,
      taken_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_beneficiary_id (beneficiary_id),
      INDEX idx_taken_date (taken_date),
      UNIQUE KEY unique_daily_record (beneficiary_id, taken_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('[DB] DOT adherence table created/verified');
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
const HOST = process.env.HOST || '0.0.0.0';

app.enable('trust proxy');

// Start HTTPS server for production
if (process.env.NODE_ENV === 'production') {
  try {
    const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'cert.pem');
    const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'key.pem');
    
    // Check if SSL certificates exist
    if (fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
      const options = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };
      
      // Create HTTPS server on port 443 (standard HTTPS port)
      const HTTPS_PORT = 443;
      const httpsServer = https.createServer(options, app);
      
      httpsServer.listen(HTTPS_PORT, HOST, () => {
        console.log(`🔒 HTTPS Server running on https://${HOST}:${HTTPS_PORT}`);
        console.log(`🔒 Production API available at: https://3.80.46.128`);
        console.log(`🔒 SSL Certificate loaded successfully`);
      });
      
      // Also start HTTP server on port 3000 for fallback
      app.listen(PORT, HOST, () => {
        console.log(`📱 HTTP Server running on http://${HOST}:${PORT} (fallback)`);
      });
    } else {
      console.warn('⚠️  SSL certificates not found. Starting HTTP server only...');
      app.listen(PORT, HOST, () => {
        console.log(`⚠️  HTTP Server running on http://${HOST}:${PORT}`);
        console.log('⚠️  WARNING: Using HTTP in production is not secure!');
      });
    }
  } catch (error) {
    console.error('❌ HTTPS server creation failed:', error.message);
    console.log('🔄 Falling back to HTTP server...');
    app.listen(PORT, HOST, () => {
      console.log(`⚠️  HTTP Server running on http://${HOST}:${PORT}`);
      console.log('⚠️  WARNING: Using HTTP in production is not secure!');
    });
  }
} else {
  // Development mode - use HTTP
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Development server running on http://${HOST}:${PORT}`);
    console.log(`📱 API available at: http://localhost:${PORT}`);
  });
}
