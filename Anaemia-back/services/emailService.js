// services/emailService.js
const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
};

// Create transporter
const transporter = nodemailer.createTransporter(EMAIL_CONFIG);

/**
 * Send OTP email to beneficiary
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} beneficiaryName - Name of the beneficiary
 * @param {string} type - Type of OTP (google_login, mobile_login, etc.)
 */
async function sendOTPEmail(email, otp, beneficiaryName = 'User', type = 'login') {
  try {
    const subject = 'Your Anaemia Health Login OTP';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Anaemia Health - Login OTP</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4A90E2;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .otp-box {
            background-color: #4A90E2;
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            letter-spacing: 5px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 Anaemia Health</h1>
          <p>Your Health, Our Priority</p>
        </div>
        
        <div class="content">
          <h2>Hello ${beneficiaryName}!</h2>
          
          <p>You have requested to login to your Anaemia Health account. Please use the following OTP to complete your login:</p>
          
          <div class="otp-box">
            ${otp}
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This OTP is valid for 5 minutes only</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you didn't request this OTP, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you have any questions or concerns, please contact our support team.</p>
          
          <p>Best regards,<br>
          <strong>Anaemia Health Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 Anaemia Health. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Anaemia Health - Login OTP
      
      Hello ${beneficiaryName}!
      
      You have requested to login to your Anaemia Health account.
      
      Your OTP is: ${otp}
      
      This OTP is valid for 5 minutes only.
      Do not share this OTP with anyone.
      
      If you didn't request this OTP, please ignore this email.
      
      Best regards,
      Anaemia Health Team
    `;

    const mailOptions = {
      from: `"Anaemia Health" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP email sent to ${email}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('[Email Service] Failed to send OTP email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send welcome email to new beneficiary
 * @param {string} email - Recipient email
 * @param {string} beneficiaryName - Name of the beneficiary
 * @param {string} uniqueId - Unique ID assigned to beneficiary
 */
async function sendWelcomeEmail(email, beneficiaryName, uniqueId) {
  try {
    const subject = 'Welcome to Anaemia Health - Registration Successful';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Anaemia Health</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4A90E2;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .id-box {
            background-color: #4A90E2;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info-box {
            background-color: #e8f4fd;
            border-left: 4px solid #4A90E2;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 Anaemia Health</h1>
          <p>Welcome to Our Health Program!</p>
        </div>
        
        <div class="content">
          <h2>Welcome ${beneficiaryName}!</h2>
          
          <p>Congratulations! You have been successfully registered in the Anaemia Health program.</p>
          
          <div class="id-box">
            Your Unique ID: ${uniqueId}
          </div>
          
          <div class="info-box">
            <h3>📋 What's Next?</h3>
            <ul>
              <li>Keep your Unique ID safe for quick login</li>
              <li>You can login using your email, mobile number, or Unique ID</li>
              <li>Regular health checkups will be scheduled</li>
              <li>You'll receive important health updates via SMS and email</li>
            </ul>
          </div>
          
          <p>Our team is committed to providing you with the best healthcare services. If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          <strong>Anaemia Health Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 Anaemia Health. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Anaemia Health" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Welcome email sent to ${email}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('[Email Service] Failed to send welcome email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail
};
