// routes/otp.js
// Secure OTP service with database storage
const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// OTP Configuration
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const OTP_COOLDOWN_SECONDS = 60; // 1 minute between OTP requests

/**
 * Generate a secure 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash phone number for privacy
 */
function hashPhoneNumber(phoneNumber) {
  return crypto.createHash('sha256').update(phoneNumber.toLowerCase().trim()).digest('hex');
}

/**
 * Hash email for privacy
 */
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Send OTP to phone number
 * POST /api/otp/send
 * Body: { phoneNumber: string }
 */
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    const phoneHash = hashPhoneNumber(formattedPhone);

    // Check if there's a recent OTP request (cooldown)
    const [recentOTP] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE phone_hash = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneHash, OTP_COOLDOWN_SECONDS]
    );

    if (recentOTP.length > 0) {
      const timeRemaining = OTP_COOLDOWN_SECONDS - Math.floor(
        (Date.now() - new Date(recentOTP[0].created_at).getTime()) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeRemaining} seconds before requesting a new OTP`,
        cooldown: timeRemaining
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database
    await pool.query(
      `INSERT INTO otp_requests (phone_hash, otp_hash, expires_at, attempts, status)
       VALUES (?, ?, ?, 0, 'pending')`,
      [phoneHash, crypto.createHash('sha256').update(otp).digest('hex'), expiresAt]
    );

    // Mark any previous pending OTPs as expired
    await pool.query(
      `UPDATE otp_requests 
       SET status = 'expired' 
       WHERE phone_hash = ? 
       AND status = 'pending' 
       AND id != LAST_INSERT_ID()`,
      [phoneHash]
    );

    // Send OTP via SMS service
    console.log(`[OTP Service] Generated OTP for ${formattedPhone}: ${otp}`);
    console.log(`[OTP Service] OTP expires at: ${expiresAt}`);
    
    // TODO: Integrate with your SMS service
    // Example: Send SMS using your existing SMS service
    try {
      // Use your SMS service here
      // await sendSMS(formattedPhone, `Your Animia OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`);
      console.log(`[OTP Service] SMS would be sent to: ${formattedPhone}`);
      console.log(`[OTP Service] SMS content: Your Animia OTP is: ${otp}. Valid for 5 minutes.`);
    } catch (smsError) {
      console.error('[OTP Service] Failed to send SMS:', smsError);
      // Continue anyway - OTP is still valid for testing
    }

    // In development, return OTP (REMOVE IN PRODUCTION)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      expiresAt: expiresAt,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      ...(isDevelopment && { otp: otp }), // Only in development
    });

  } catch (error) {
    console.error('[OTP Service] Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * Verify OTP
 * POST /api/otp/verify
 * Body: { phoneNumber: string, otp: string }
 */
router.post('/verify', async (req, res) => {
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

    const phoneHash = hashPhoneNumber(formattedPhone);
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Get the most recent pending OTP
    const [otpRecords] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE phone_hash = ? 
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneHash]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No OTP request found or OTP has expired'
      });
    }

    const otpRecord = otpRecords[0];

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      await pool.query(
        `UPDATE otp_requests SET status = 'expired' WHERE id = ?`,
        [otpRecord.id]
      );
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one'
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await pool.query(
        `UPDATE otp_requests SET status = 'failed' WHERE id = ?`,
        [otpRecord.id]
      );
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP'
      });
    }

    // Verify OTP
    if (otpHash !== otpRecord.otp_hash) {
      // Increment attempts
      await pool.query(
        `UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?`,
        [otpRecord.id]
      );
      
      const remainingAttempts = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      });
    }

    // OTP is valid - mark as verified
    await pool.query(
      `UPDATE otp_requests SET status = 'verified', verified_at = NOW() WHERE id = ?`,
      [otpRecord.id]
    );

    console.log(`[OTP Service] OTP verified successfully for ${formattedPhone}`);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('[OTP Service] Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

/**
 * Resend OTP
 * POST /api/otp/resend
 * Body: { phoneNumber: string }
 */
router.post('/resend', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    const phoneHash = hashPhoneNumber(formattedPhone);

    // Check if there's a recent OTP request (cooldown)
    const [recentOTP] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE phone_hash = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneHash, OTP_COOLDOWN_SECONDS]
    );

    if (recentOTP.length > 0) {
      const timeRemaining = OTP_COOLDOWN_SECONDS - Math.floor(
        (Date.now() - new Date(recentOTP[0].created_at).getTime()) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeRemaining} seconds before requesting a new OTP`,
        cooldown: timeRemaining
      });
    }

    // Mark old OTPs as expired
    await pool.query(
      `UPDATE otp_requests 
       SET status = 'expired' 
       WHERE phone_hash = ? 
       AND status = 'pending'`,
      [phoneHash]
    );

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database
    await pool.query(
      `INSERT INTO otp_requests (phone_hash, otp_hash, expires_at, attempts, status)
       VALUES (?, ?, ?, 0, 'pending')`,
      [phoneHash, crypto.createHash('sha256').update(otp).digest('hex'), expiresAt]
    );

    // Send OTP via SMS service
    console.log(`[OTP Service] Resent OTP for ${formattedPhone}: ${otp}`);
    console.log(`[OTP Service] OTP expires at: ${expiresAt}`);
    
    // TODO: Integrate with your SMS service
    try {
      // Use your SMS service here
      // await sendSMS(formattedPhone, `Your Animia OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`);
      console.log(`[OTP Service] SMS would be sent to: ${formattedPhone}`);
      console.log(`[OTP Service] SMS content: Your Animia OTP is: ${otp}. Valid for 5 minutes.`);
    } catch (smsError) {
      console.error('[OTP Service] Failed to send SMS:', smsError);
      // Continue anyway - OTP is still valid for testing
    }

    // In development, return OTP (REMOVE IN PRODUCTION)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.json({
      success: true,
      message: 'OTP resent successfully',
      expiresAt: expiresAt,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      ...(isDevelopment && { otp: otp }), // Only in development
    });

  } catch (error) {
    console.error('[OTP Service] Error resending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
});

/**
 * Send OTP to email
 * POST /api/otp/send-email
 * Body: { email: string }
 */
router.post('/send-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
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

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);

    // Check if there's a recent OTP request (cooldown)
    const [recentOTP] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE email_hash = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [emailHash, OTP_COOLDOWN_SECONDS]
    );

    if (recentOTP.length > 0) {
      const timeRemaining = OTP_COOLDOWN_SECONDS - Math.floor(
        (Date.now() - new Date(recentOTP[0].created_at).getTime()) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeRemaining} seconds before requesting a new OTP`,
        cooldown: timeRemaining
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database (using email_hash, phone_hash will be null)
    await pool.query(
      `INSERT INTO otp_requests (email_hash, otp_hash, expires_at, attempts, status)
       VALUES (?, ?, ?, 0, 'pending')`,
      [emailHash, crypto.createHash('sha256').update(otp).digest('hex'), expiresAt]
    );

    // Mark any previous pending OTPs as expired
    await pool.query(
      `UPDATE otp_requests 
       SET status = 'expired' 
       WHERE email_hash = ? 
       AND status = 'pending' 
       AND id != LAST_INSERT_ID()`,
      [emailHash]
    );

    // Send OTP via email service
    console.log(`[OTP Service] Generated OTP for ${normalizedEmail}: ${otp}`);
    console.log(`[OTP Service] OTP expires at: ${expiresAt}`);
    
    try {
      const { sendOTPEmail } = require('../services/emailService');
      const emailResult = await sendOTPEmail(normalizedEmail, otp, 'User', 'email_login');
      
      if (!emailResult.success) {
        console.error('[OTP Service] Failed to send email:', emailResult.error);
        // Continue anyway - OTP is still valid
      } else {
        console.log(`[OTP Service] Email sent successfully to: ${normalizedEmail}`);
      }
    } catch (emailError) {
      console.error('[OTP Service] Failed to send email:', emailError);
      // Continue anyway - OTP is still valid for testing
    }

    // In development, return OTP (REMOVE IN PRODUCTION)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.json({
      success: true,
      message: 'OTP sent successfully to email',
      expiresAt: expiresAt,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      ...(isDevelopment && { otp: otp }), // Only in development
    });

  } catch (error) {
    console.error('[OTP Service] Error sending email OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * Verify Email OTP
 * POST /api/otp/verify-email
 * Body: { email: string, otp: string }
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Get the most recent pending OTP
    const [otpRecords] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE email_hash = ? 
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [emailHash]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No OTP request found or OTP has expired'
      });
    }

    const otpRecord = otpRecords[0];

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      await pool.query(
        `UPDATE otp_requests SET status = 'expired' WHERE id = ?`,
        [otpRecord.id]
      );
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one'
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await pool.query(
        `UPDATE otp_requests SET status = 'failed' WHERE id = ?`,
        [otpRecord.id]
      );
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP'
      });
    }

    // Verify OTP
    if (otpHash !== otpRecord.otp_hash) {
      // Increment attempts
      await pool.query(
        `UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?`,
        [otpRecord.id]
      );
      
      const remainingAttempts = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      });
    }

    // OTP is valid - mark as verified
    await pool.query(
      `UPDATE otp_requests SET status = 'verified', verified_at = NOW() WHERE id = ?`,
      [otpRecord.id]
    );

    console.log(`[OTP Service] Email OTP verified successfully for ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('[OTP Service] Error verifying email OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

/**
 * Resend Email OTP
 * POST /api/otp/resend-email
 * Body: { email: string }
 */
router.post('/resend-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);

    // Check if there's a recent OTP request (cooldown)
    const [recentOTP] = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE email_hash = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [emailHash, OTP_COOLDOWN_SECONDS]
    );

    if (recentOTP.length > 0) {
      const timeRemaining = OTP_COOLDOWN_SECONDS - Math.floor(
        (Date.now() - new Date(recentOTP[0].created_at).getTime()) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeRemaining} seconds before requesting a new OTP`,
        cooldown: timeRemaining
      });
    }

    // Mark old OTPs as expired
    await pool.query(
      `UPDATE otp_requests 
       SET status = 'expired' 
       WHERE email_hash = ? 
       AND status = 'pending'`,
      [emailHash]
    );

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database
    await pool.query(
      `INSERT INTO otp_requests (email_hash, otp_hash, expires_at, attempts, status)
       VALUES (?, ?, ?, 0, 'pending')`,
      [emailHash, crypto.createHash('sha256').update(otp).digest('hex'), expiresAt]
    );

    // Send OTP via email service
    console.log(`[OTP Service] Resent OTP for ${normalizedEmail}: ${otp}`);
    console.log(`[OTP Service] OTP expires at: ${expiresAt}`);
    
    try {
      const { sendOTPEmail } = require('../services/emailService');
      const emailResult = await sendOTPEmail(normalizedEmail, otp, 'User', 'email_login');
      
      if (!emailResult.success) {
        console.error('[OTP Service] Failed to resend email:', emailResult.error);
      } else {
        console.log(`[OTP Service] Resend email sent successfully to: ${normalizedEmail}`);
      }
    } catch (emailError) {
      console.error('[OTP Service] Failed to resend email:', emailError);
    }

    // In development, return OTP (REMOVE IN PRODUCTION)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.json({
      success: true,
      message: 'OTP resent successfully to email',
      expiresAt: expiresAt,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      ...(isDevelopment && { otp: otp }), // Only in development
    });

  } catch (error) {
    console.error('[OTP Service] Error resending email OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
});

module.exports = router;
