// routes/patientAuth.js
console.log('[PatientAuth] File loaded - JOIN fixes applied!');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

// Note: OTP sending and verification is now handled by Firebase Auth
// These endpoints are no longer needed since Firebase manages OTP lifecycle

// Unique ID login route is defined later in the file (line 774)
// This duplicate route has been removed to use the more complete implementation

// Mobile OTP login endpoint
router.post('/mobile-login', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    // Check if OTP was recently verified (within last 5 minutes)
    const phoneHash = crypto.createHash('sha256').update(formattedPhone).digest('hex');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    const [otpRecords] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE phone_hash = ? 
       AND otp_hash = ?
       AND status = 'verified'
       AND verified_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       ORDER BY verified_at DESC
       LIMIT 1`,
      [phoneHash, otpHash]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'OTP not verified or has expired. Please verify OTP first.'
      });
    }

    // Find beneficiary by phone number (check multiple formats)
    // Clean phone number - remove country code and special characters
    let cleanPhone = formattedPhone.replace(/\D/g, ''); // Remove non-digits
    
    // Remove country code if present
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2); // Remove +91
    }
    
    // Also keep original for matching
    const phoneVariants = [
      formattedPhone,           // Original: +919558372935
      cleanPhone,               // Without country code: 9558372935
      `+91${cleanPhone}`,       // With +91: +919558372935
      `91${cleanPhone}`         // With 91: 919558372935
    ];
    
    console.log('[Patient Auth] Mobile login - Searching for phone variants:', phoneVariants);

    const [beneficiaries] = await pool.query(
      `SELECT * FROM beneficiaries 
       WHERE phone IN (?, ?, ?, ?) 
       OR alt_phone IN (?, ?, ?, ?)`,
      [...phoneVariants, ...phoneVariants]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found with this phone number'
      });
    }

    // If multiple beneficiaries, return them for selection
    if (beneficiaries.length > 1) {
      return res.json({
        success: true,
        message: 'Multiple beneficiaries found',
        requiresSelection: true,
        beneficiaries: beneficiaries.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          short_id: beneficiary.short_id,
          unique_id: beneficiary.short_id // Use short_id as unique_id for compatibility
        }))
      });
    }

    // Single beneficiary - proceed with login
    const beneficiary = beneficiaries[0];

    // Create JWT token
    const token = jwt.sign(
      {
        id: beneficiary.id,
        role: 'Patient',
        type: 'patient',
        beneficiaryId: beneficiary.id,
        phoneNumber: formattedPhone
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Mobile login successful',
      token,
      user: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        role: 'Patient'
      },
      beneficiary: beneficiary
    });
  } catch (error) {
    console.error('[Patient Auth] Mobile login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login with mobile number'
    });
  }
});

// Email OTP login endpoint
router.post('/email-login', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if OTP was recently verified (within last 5 minutes)
    const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    const [otpRecords] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE email_hash = ? 
       AND otp_hash = ?
       AND status = 'verified'
       AND verified_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       ORDER BY verified_at DESC
       LIMIT 1`,
      [emailHash, otpHash]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'OTP not verified or has expired. Please verify OTP first.'
      });
    }

    // Find beneficiary by email
    const [beneficiaries] = await pool.query(
      `SELECT * FROM beneficiaries 
       WHERE LOWER(email) = ? 
       ORDER BY created_at DESC`,
      [normalizedEmail]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found with this email address'
      });
    }

    // If multiple beneficiaries, return them for selection
    if (beneficiaries.length > 1) {
      return res.json({
        success: true,
        message: 'Multiple beneficiaries found',
        requiresSelection: true,
        beneficiaries: beneficiaries.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          short_id: beneficiary.short_id,
          unique_id: beneficiary.short_id // Use short_id as unique_id for compatibility
        }))
      });
    }

    // Single beneficiary - proceed with login
    const beneficiary = beneficiaries[0];

    // Create JWT token
    const token = jwt.sign(
      {
        id: beneficiary.id,
        role: 'Patient',
        type: 'patient',
        beneficiaryId: beneficiary.id,
        email: normalizedEmail
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Email login successful',
      token,
      user: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        role: 'Patient'
      },
      beneficiary: beneficiary
    });
  } catch (error) {
    console.error('[Patient Auth] Email login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login with email'
    });
  }
});

// Google login endpoint (Firebase handles authentication, we just verify beneficiary exists)
router.post('/google-login', async (req, res) => {
  try {
    const { email, firebaseUid, beneficiaryId } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // If beneficiaryId is provided, authenticate specific beneficiary
    if (beneficiaryId) {
      const [beneficiaries] = await pool.query(
        'SELECT * FROM beneficiaries WHERE email = ? AND id = ?',
        [email, beneficiaryId]
      );

      if (beneficiaries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Beneficiary not found with this Google email'
        });
      }

      const beneficiary = beneficiaries[0];

      // Create JWT token
      const token = jwt.sign(
        {
          id: beneficiary.id,
          role: 'Patient',
          type: 'patient',
          beneficiaryId: beneficiary.id,
          firebaseUid: firebaseUid || `google_${email}`
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: 'Google login successful',
        token,
        user: {
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          role: 'Patient'
        },
        beneficiary: beneficiary
      });
    }

    // Check if beneficiary exists with this email
    const [beneficiaries] = await pool.query(
      'SELECT * FROM beneficiaries WHERE email = ? ORDER BY created_at DESC',
      [email]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found with this Google email'
      });
    }

    // If multiple beneficiaries, return them for selection
    if (beneficiaries.length > 1) {
      return res.json({
        success: true,
        message: 'Multiple beneficiaries found',
        requiresSelection: true,
        beneficiaries: beneficiaries.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          short_id: beneficiary.short_id,
          unique_id: beneficiary.short_id // Use short_id as unique_id for compatibility
        }))
      });
    }

    // Single beneficiary - proceed with login
    const beneficiary = beneficiaries[0];

    // Create JWT token
    const token = jwt.sign(
      {
        id: beneficiary.id,
        role: 'Patient',
        type: 'patient',
        beneficiaryId: beneficiary.id,
        firebaseUid: firebaseUid || `google_${email}`
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        role: 'Patient'
      },
      beneficiary: beneficiary
    });
  } catch (error) {
    console.error('[Patient Auth] Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login with Google'
    });
  }
});

// Get beneficiary by phone number (for Firebase Auth integration)
router.get('/beneficiary/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    console.log('[Patient Auth] Get beneficiary by phone - Raw phoneNumber:', phoneNumber);
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Clean phone number - remove country code and special characters
    let cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    
    // Remove country code if present
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2); // Remove +91
    }
    
    // Also keep original for matching
    const phoneVariants = [
      phoneNumber,           // Original: +919558372935
      cleanPhone,            // Without country code: 9558372935
      `+91${cleanPhone}`,    // With +91: +919558372935
      `91${cleanPhone}`      // With 91: 919558372935
    ];
    
    console.log('[Patient Auth] Searching for phone variants:', phoneVariants);

    // Find beneficiary by phone number (check multiple formats)
    const [beneficiaries] = await pool.query(
      `SELECT * FROM beneficiaries 
       WHERE phone IN (?, ?, ?, ?) 
       OR alt_phone IN (?, ?, ?, ?)`,
      [...phoneVariants, ...phoneVariants]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found with this phone number'
      });
    }

    const beneficiary = beneficiaries[0];

    res.json({
      success: true,
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        alt_phone: beneficiary.alt_phone,
        short_id: beneficiary.short_id,
        unique_id: beneficiary.unique_id
      }
    });
  } catch (error) {
    console.error('[Patient Auth] Get beneficiary by phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiary'
    });
  }
});

// Get multiple beneficiaries by phone number (for patient selection)

// Get beneficiary by email (for Firebase Auth integration)
router.get('/beneficiary/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find beneficiary by email
    const [beneficiaries] = await pool.query(
      'SELECT * FROM beneficiaries WHERE email = ?',
      [email]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found with this email'
      });
    }

    const beneficiary = beneficiaries[0];

    res.json({
      success: true,
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        alt_phone: beneficiary.alt_phone,
        short_id: beneficiary.short_id,
        unique_id: beneficiary.unique_id
      }
    });
  } catch (error) {
    console.error('[Patient Auth] Get beneficiary by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiary'
    });
  }
});

// Get multiple beneficiaries by email (for patient selection) - WITH screening/intervention data
router.get('/beneficiaries/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find all beneficiaries by email WITH their latest screening and intervention data
    const [beneficiaries] = await pool.query(`
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
        SELECT beneficiary_id, id, hemoglobin, anemia_category, pallor, pallor_location, notes, created_at
        FROM screenings s1
        WHERE s1.id = (
          SELECT id FROM screenings s2 
          WHERE s2.beneficiary_id = s1.beneficiary_id 
          ORDER BY s2.created_at DESC 
          LIMIT 1
        )
      ) s ON b.short_id = s.beneficiary_id
      LEFT JOIN (
        SELECT beneficiary_id, id, ifa_yes, ifa_quantity, calcium_yes, calcium_quantity, 
               deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes, 
               referral_yes, referral_facility, created_at
        FROM interventions i1
        WHERE i1.id = (
          SELECT id FROM interventions i2 
          WHERE i2.beneficiary_id = i1.beneficiary_id 
          ORDER BY i2.created_at DESC 
          LIMIT 1
        )
      ) i ON b.short_id = i.beneficiary_id
      WHERE b.email = ?
      ORDER BY b.created_at DESC
    `, [email]);

    res.json({
      success: true,
      beneficiaries: beneficiaries
    });
  } catch (error) {
    console.error('[Patient Auth] Get beneficiaries by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiaries'
    });
  }
});

// Get multiple beneficiaries by unique ID (for patient selection)
router.get('/beneficiaries/unique/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    
    if (!uniqueId) {
      return res.status(400).json({
        success: false,
        message: 'Unique ID is required'
      });
    }

    // Find all beneficiaries by unique ID with screening and intervention data
    const [beneficiaries] = await pool.query(
      `SELECT b.*, 
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
         SELECT beneficiary_id, id, hemoglobin, anemia_category, pallor, pallor_location, notes, created_at,
                ROW_NUMBER() OVER (PARTITION BY beneficiary_id ORDER BY created_at DESC) as rn
         FROM screenings
       ) s ON b.short_id = s.beneficiary_id AND s.rn = 1
       LEFT JOIN (
         SELECT beneficiary_id, id, ifa_yes, ifa_quantity, calcium_yes, calcium_quantity,
                deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes,
                referral_yes, referral_facility, created_at,
                ROW_NUMBER() OVER (PARTITION BY beneficiary_id ORDER BY created_at DESC) as rn
         FROM interventions
       ) i ON b.short_id = i.beneficiary_id AND i.rn = 1
       WHERE b.short_id = ?
       ORDER BY b.created_at DESC`,
      [uniqueId]
    );

    console.log('[Patient Auth] Get beneficiaries by unique ID - found:', beneficiaries.length);

    res.json({
      success: true,
      beneficiaries: beneficiaries.map(beneficiary => ({
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        alt_phone: beneficiary.alt_phone,
        short_id: beneficiary.short_id,
        unique_id: beneficiary.short_id, // Use short_id as unique_id for compatibility
        age: beneficiary.age,
        category: beneficiary.category,
        doctor_name: beneficiary.doctor_name,
        doctor_phone: beneficiary.doctor_phone,
        address: beneficiary.address,
        created_at: beneficiary.created_at,
        // Include screening data
        screening_id: beneficiary.screening_id,
        latest_hemoglobin: beneficiary.latest_hemoglobin,
        latest_anemia_category: beneficiary.latest_anemia_category,
        latest_pallor: beneficiary.latest_pallor,
        latest_pallor_location: beneficiary.latest_pallor_location,
        screening_notes: beneficiary.screening_notes,
        last_screening_date: beneficiary.last_screening_date,
        // Include intervention data
        intervention_id: beneficiary.intervention_id,
        intervention_ifa_yes: beneficiary.intervention_ifa_yes,
        intervention_ifa_quantity: beneficiary.intervention_ifa_quantity,
        intervention_calcium_yes: beneficiary.intervention_calcium_yes,
        intervention_calcium_quantity: beneficiary.intervention_calcium_quantity,
        intervention_deworm_yes: beneficiary.intervention_deworm_yes,
        intervention_deworming_date: beneficiary.intervention_deworming_date,
        intervention_therapeutic_yes: beneficiary.intervention_therapeutic_yes,
        intervention_therapeutic_notes: beneficiary.intervention_therapeutic_notes,
        intervention_referral_yes: beneficiary.intervention_referral_yes,
        intervention_referral_facility: beneficiary.intervention_referral_facility,
        last_intervention_date: beneficiary.last_intervention_date
      }))
    });
  } catch (error) {
    console.error('[Patient Auth] Get beneficiaries by unique ID error:', error);
    console.error('[Patient Auth] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiaries'
    });
  }
});

// Generate JWT token for selected beneficiary after OTP verification
router.post('/select-beneficiary', async (req, res) => {
  try {
    const { phoneNumber, beneficiaryId } = req.body;

    if (!phoneNumber || !beneficiaryId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and beneficiary ID are required'
      });
    }

    // Format phone number
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.startsWith('91') 
        ? `+${formattedPhone}` 
        : `+91${formattedPhone}`;
    }

    // Check if OTP was recently verified (within last 5 minutes)
    const phoneHash = crypto.createHash('sha256').update(formattedPhone).digest('hex');
    
    const [otpRecords] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE phone_hash = ? 
       AND status = 'verified'
       AND verified_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       ORDER BY verified_at DESC
       LIMIT 1`,
      [phoneHash]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'OTP not verified or has expired. Please verify OTP first.'
      });
    }

    // Get the specific beneficiary
    const [beneficiaries] = await pool.query(
      `SELECT * FROM beneficiaries WHERE id = ?`,
      [beneficiaryId]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    const beneficiary = beneficiaries[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: beneficiary.id,
        role: 'Patient',
        type: 'patient',
        beneficiaryId: beneficiary.id,
        phoneNumber: beneficiary.phone,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Beneficiary selected successfully',
      token: token,
      user: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        role: 'Patient'
      },
      beneficiary: beneficiary
    });

  } catch (error) {
    console.error('[Patient Auth] Error selecting beneficiary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select beneficiary'
    });
  }
});

// Unique ID authentication endpoint
router.post('/unique-id-login', async (req, res) => {
  try {
    const { uniqueId, beneficiaryId } = req.body;

    console.log('[Patient Auth] Unique ID login request:', {
      uniqueId,
      beneficiaryId,
      uniqueIdLength: uniqueId?.length
    });

    if (!uniqueId) {
      return res.status(400).json({
        success: false,
        message: 'Unique ID is required'
      });
    }

    // Normalize unique ID to uppercase and trim
    const normalizedUniqueId = String(uniqueId).toUpperCase().trim();

    if (normalizedUniqueId.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 4-character unique ID'
      });
    }

    // If beneficiaryId is provided, authenticate specific beneficiary
    if (beneficiaryId) {
      const [beneficiaries] = await pool.query(
        `SELECT * FROM beneficiaries WHERE short_id = ? AND id = ?`,
        [normalizedUniqueId, beneficiaryId]
      );

      if (beneficiaries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Beneficiary not found with this unique ID'
        });
      }

      const beneficiary = beneficiaries[0];
      const token = jwt.sign(
        {
          id: beneficiary.id,
          role: 'Patient',
          type: 'patient',
          beneficiaryId: beneficiary.id,
          phoneNumber: beneficiary.phone,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          role: 'Patient'
        }
      });
    }

    // Find all beneficiaries by unique ID (using short_id column)
    const [beneficiaries] = await pool.query(
      `SELECT * FROM beneficiaries WHERE short_id = ?`,
      [normalizedUniqueId]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found with this unique ID'
      });
    }

    if (beneficiaries.length > 1) {
      return res.json({
        success: true,
        message: 'Multiple beneficiaries found',
        requiresSelection: true,
        beneficiaries: beneficiaries.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          short_id: beneficiary.short_id,
          unique_id: beneficiary.short_id // Use short_id as unique_id for compatibility
        }))
      });
    }

    // Single beneficiary found - generate JWT token
    const beneficiary = beneficiaries[0];
    const token = jwt.sign(
      {
        id: beneficiary.id,
        role: 'Patient',
        type: 'patient',
        beneficiaryId: beneficiary.id,
        phoneNumber: beneficiary.phone,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        role: 'Patient'
      },
      beneficiary: beneficiary
    });

  } catch (error) {
    console.error('[Patient Auth] Error in unique ID login:', error);
    console.error('[Patient Auth] Error stack:', error.stack);
    console.error('[Patient Auth] Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate with unique ID',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get beneficiaries by phone number
router.get('/beneficiaries/phone/:phoneNumber', async (req, res) => {
  console.log('[Patient Auth] CORRECT ENDPOINT CALLED - WITH JOIN LOGIC!', {
    phoneNumber: req.params.phoneNumber,
    timestamp: new Date().toISOString()
  });
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Format phone number
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.startsWith('91') 
        ? `+${formattedPhone}` 
        : `+91${formattedPhone}`;
    }

    // Find beneficiaries by phone number (check multiple formats)
    let cleanPhone = formattedPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    
    const phoneVariants = [
      formattedPhone,
      cleanPhone,
      `+91${cleanPhone}`,
      `91${cleanPhone}`
    ];

    const [beneficiaries] = await pool.query(
      `SELECT b.*, 
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
         SELECT beneficiary_id, hemoglobin, anemia_category, pallor, pallor_location, notes, created_at,
                ROW_NUMBER() OVER (PARTITION BY beneficiary_id ORDER BY created_at DESC) as rn
         FROM screenings
       ) s ON b.short_id = s.beneficiary_id AND s.rn = 1
       LEFT JOIN (
         SELECT beneficiary_id, id, ifa_yes, ifa_quantity, calcium_yes, calcium_quantity,
                deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes,
                referral_yes, referral_facility, created_at,
                ROW_NUMBER() OVER (PARTITION BY beneficiary_id ORDER BY created_at DESC) as rn
         FROM interventions
       ) i ON b.short_id = i.beneficiary_id AND i.rn = 1
       WHERE b.phone IN (?, ?, ?, ?) 
       OR b.alt_phone IN (?, ?, ?, ?)
       ORDER BY b.created_at DESC`,
      [...phoneVariants, ...phoneVariants]
    );

    console.log('[Patient Auth] Query result count:', beneficiaries.length);
    if (beneficiaries.length > 0) {
      console.log('[Patient Auth] First beneficiary data:', {
        id: beneficiaries[0].id,
        name: beneficiaries[0].name,
        short_id: beneficiaries[0].short_id,
        latest_hemoglobin: beneficiaries[0].latest_hemoglobin,
        intervention_id: beneficiaries[0].intervention_id,
        screening_notes: beneficiaries[0].screening_notes,
        anemia_category: beneficiaries[0].latest_anemia_category
      });
      
      // Check if we have screening data
      const hasScreeningData = beneficiaries.some(b => b.latest_hemoglobin);
      const hasInterventionData = beneficiaries.some(b => b.intervention_id);
      console.log('[Patient Auth] Has screening data:', hasScreeningData);
      console.log('[Patient Auth] Has intervention data:', hasInterventionData);
    }

    res.json({
      success: true,
      beneficiaries: beneficiaries.map(beneficiary => ({
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        alt_phone: beneficiary.alt_phone,
        age: beneficiary.age,
        category: beneficiary.category,
        gender: beneficiary.gender,
        address: beneficiary.address,
        id_number: beneficiary.id_number,
        aadhaar_hash: beneficiary.aadhaar_hash,
        dob: beneficiary.dob,
        doctor_name: beneficiary.doctor_name,
        doctor_phone: beneficiary.doctor_phone,
        registration_date: beneficiary.registration_date,
        location: beneficiary.location,
        front_document: beneficiary.front_document,
        back_document: beneficiary.back_document,
        follow_up_due: beneficiary.follow_up_due,
        hb: beneficiary.hb,
        calcium_qty: beneficiary.calcium_qty,
        short_id: beneficiary.short_id,
          unique_id: beneficiary.short_id, // Use short_id as unique_id for compatibility
        created_at: beneficiary.created_at,
        // Include screening data
        latest_hemoglobin: beneficiary.latest_hemoglobin,
        latest_anemia_category: beneficiary.latest_anemia_category,
        latest_pallor: beneficiary.latest_pallor,
        latest_pallor_location: beneficiary.latest_pallor_location,
        screening_notes: beneficiary.screening_notes,
        last_screening_date: beneficiary.last_screening_date,
        // Include intervention data
        intervention_id: beneficiary.intervention_id,
        intervention_ifa_yes: beneficiary.intervention_ifa_yes,
        intervention_ifa_quantity: beneficiary.intervention_ifa_quantity,
        intervention_calcium_yes: beneficiary.intervention_calcium_yes,
        intervention_calcium_quantity: beneficiary.intervention_calcium_quantity,
        intervention_deworm_yes: beneficiary.intervention_deworm_yes,
        intervention_deworming_date: beneficiary.intervention_deworming_date,
        intervention_therapeutic_yes: beneficiary.intervention_therapeutic_yes,
        intervention_therapeutic_notes: beneficiary.intervention_therapeutic_notes,
        intervention_referral_yes: beneficiary.intervention_referral_yes,
        intervention_referral_facility: beneficiary.intervention_referral_facility,
        last_intervention_date: beneficiary.last_intervention_date
      }))
    });

  } catch (error) {
    console.error('[Patient Auth] Error getting beneficiaries by phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiaries by phone number'
    });
  }
});

// Test endpoint to verify JOIN is working
router.get('/test-join', async (req, res) => {
  try {
    const [result] = await pool.query(`
      SELECT b.short_id, s.hemoglobin, s.anemia_category 
      FROM beneficiaries b 
      LEFT JOIN screenings s ON b.short_id = s.beneficiary_id 
      WHERE b.phone = '9558372935' 
      LIMIT 3
    `);
    
    res.json({
      success: true,
      message: 'JOIN test successful',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'JOIN test failed',
      error: error.message
    });
  }
});

// Delete account (for patients/beneficiaries)
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
    
    if (decoded.role !== 'Patient' || !decoded.beneficiaryId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only patients can delete their accounts.'
      });
    }

    const beneficiaryId = decoded.beneficiaryId;

    // Get beneficiary to verify it exists
    const [beneficiaries] = await pool.query(
      'SELECT id, name, phone, email FROM beneficiaries WHERE id = ?',
      [beneficiaryId]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // For patients, we'll anonymize the data instead of hard delete
    // This preserves healthcare records while removing personal identifiers
    // You can change this to hard delete if preferred
    try {
      // Anonymize beneficiary data
      await pool.query(
        `UPDATE beneficiaries 
         SET name = 'Deleted User', 
             phone = NULL, 
             email = NULL, 
             address = NULL,
             aadhaar_hash = NULL,
             deleted_at = NOW()
         WHERE id = ?`,
        [beneficiaryId]
      );

      // Optionally, you can also delete related records:
      // - Delete screenings
      // - Delete interventions
      // - Delete follow-ups
      // But for healthcare compliance, you might want to keep anonymized records
      
    } catch (updateError) {
      console.error('[Patient Auth] Delete account error:', updateError);
      // If update fails, try soft delete with deleted_at only
      try {
        await pool.query(
          'UPDATE beneficiaries SET deleted_at = NOW() WHERE id = ?',
          [beneficiaryId]
        );
      } catch (softDeleteError) {
        // If deleted_at column doesn't exist, just delete the record
        await pool.query('DELETE FROM beneficiaries WHERE id = ?', [beneficiaryId]);
      }
    }

    res.json({
      success: true,
      message: 'Account deleted successfully. Your data has been anonymized.'
    });
  } catch (error) {
    console.error('[Patient Auth] Delete account error:', error);
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
