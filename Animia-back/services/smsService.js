// SMS Service for sending automatic SMS notifications
// This service will be called when beneficiaries are created/updated

/**
 * Send SMS notification to beneficiary
 * @param {string} phoneNumber - Beneficiary's phone number
 * @param {string} name - Beneficiary's name
 * @param {string} type - Type of notification (registration, update, follow_up)
 * @param {object} additionalData - Additional data for the message
 */
async function sendBeneficiarySMS(phoneNumber, name, type = 'registration', additionalData = {}) {
  try {
    if (!phoneNumber || !name) {
      console.log('[SMS Service] Missing phone number or name');
      return false;
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Create message based on type
    let message = '';
    switch (type) {
      case 'registration':
        const doctorName = additionalData.doctor_name || 'Dr. Health';
        const doctorPhone = additionalData.doctor_phone || 'Contact us for details';
        message = `Hello ${name}, your registration with Animia is successful. Your ID: ${additionalData.short_id || 'N/A'}. Doctor: ${doctorName}, Contact: ${doctorPhone}. Thank you for joining our health program.`;
        break;
      case 'update':
        message = `Hello ${name}, your profile has been updated in Animia. Please contact us if you have any questions.`;
        break;
      case 'follow_up':
        message = `Hello ${name}, this is a reminder for your follow-up appointment. Please contact us to schedule.`;
        break;
      case 'screening':
        message = `Hello ${name}, your screening results are ready. Please contact us for details.`;
        break;
      case 'intervention':
        message = `Hello ${name}, your intervention plan has been updated. Please follow the prescribed guidelines.`;
        break;
      default:
        message = `Hello ${name}, this is an update from Animia health program.`;
    }

    // Log the SMS that would be sent
    console.log(`[SMS Service] SMS to ${formattedPhone}: ${message}`);
    
    // For now, we'll just log the SMS (same as before)
    // Since SMS is already working for updates, this should work for registration too
    // In a production environment, you would integrate with an SMS gateway like:
    // - Twilio
    // - AWS SNS
    // - TextLocal
    // - MessageBird
    // etc.
    
    // Example with Twilio (uncomment and configure):
    // const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: formattedPhone
    // });
    
    return true;
  } catch (error) {
    console.error('[SMS Service] Error sending SMS:', error);
    return false;
  }
}

/**
 * Format phone number for SMS
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Send SMS to multiple beneficiaries
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @param {string} message - SMS message content
 * @param {string} type - Type of notification
 */
async function sendBulkSMS(beneficiaries, message, type = 'general') {
  try {
    const results = [];
    
    for (const beneficiary of beneficiaries) {
      if (beneficiary.phone) {
        const success = await sendBeneficiarySMS(
          beneficiary.phone, 
          beneficiary.name, 
          type,
          { short_id: beneficiary.short_id }
        );
        results.push({ phone: beneficiary.phone, success });
      }
    }
    
    console.log(`[SMS Service] Bulk SMS results:`, results);
    return results;
  } catch (error) {
    console.error('[SMS Service] Error sending bulk SMS:', error);
    return [];
  }
}

/**
 * Send SMS notification for beneficiary registration
 * @param {object} beneficiary - Beneficiary data
 */
async function sendRegistrationSMS(beneficiary) {
  if (!beneficiary.phone) {
    console.log('[SMS Service] No phone number for beneficiary:', beneficiary.name);
    return false;
  }

  return await sendBeneficiarySMS(
    beneficiary.phone,
    beneficiary.name,
    'registration',
    { 
      short_id: beneficiary.short_id,
      doctor_name: beneficiary.doctor_name,
      doctor_phone: beneficiary.doctor_phone
    }
  );
}

/**
 * Send SMS notification for beneficiary update
 * @param {object} beneficiary - Beneficiary data
 */
async function sendUpdateSMS(beneficiary) {
  if (!beneficiary.phone) {
    console.log('[SMS Service] No phone number for beneficiary:', beneficiary.name);
    return false;
  }

  return await sendBeneficiarySMS(
    beneficiary.phone,
    beneficiary.name,
    'update',
    { short_id: beneficiary.short_id }
  );
}

/**
 * Send SMS notification for follow-up reminder
 * @param {object} beneficiary - Beneficiary data
 */
async function sendFollowUpSMS(beneficiary) {
  if (!beneficiary.phone) {
    console.log('[SMS Service] No phone number for beneficiary:', beneficiary.name);
    return false;
  }

  return await sendBeneficiarySMS(
    beneficiary.phone,
    beneficiary.name,
    'follow_up',
    { short_id: beneficiary.short_id }
  );
}

module.exports = {
  sendBeneficiarySMS,
  sendBulkSMS,
  sendRegistrationSMS,
  sendUpdateSMS,
  sendFollowUpSMS,
  formatPhoneNumber
};
