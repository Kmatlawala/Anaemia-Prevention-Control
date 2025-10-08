import { sendSMS, formatPhoneNumber, isValidPhoneNumber } from './fixedSMS';
import { API } from './api';

/**
 * Automatically send SMS when notification is received
 * @param {object} notification - Notification data
 */
export async function handleAutoSMS(notification) {
  try {
    // Check if notification has beneficiary data
    const data = notification.data || {};
    const beneficiaryId = data.id || data.beneficiaryId;
    
    if (!beneficiaryId) {
      console.log('[Auto SMS] No beneficiary ID in notification');
      return;
    }

    // Get beneficiary details
    const beneficiary = await API.getBeneficiary(beneficiaryId);
    if (!beneficiary || !beneficiary.phone) {
      console.log('[Auto SMS] No beneficiary or phone number found');
      return;
    }

    // Create SMS message based on notification type
    let message = '';
    const phoneNumber = beneficiary.phone;
    const name = beneficiary.name || 'there';

    switch (data.type) {
      case 'registration':
        message = `Hello ${name}, your registration with Animia is successful. Your ID: ${beneficiary.short_id || 'N/A'}. Thank you for joining our health program.`;
        break;
      case 'beneficiary_updated':
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

    // Send SMS using smart method (prefer direct SMS)
    if (isValidPhoneNumber(phoneNumber)) {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      const success = await sendSMS(formattedNumber, message); // Use clean SMS
      console.log('[Auto SMS] SMS sent to:', formattedNumber, 'Success:', success);
    } else {
      console.log('[Auto SMS] Invalid phone number:', phoneNumber);
    }

  } catch (error) {
    console.error('[Auto SMS] Error:', error);
  }
}

/**
 * Send SMS to all beneficiaries when broadcast notification is sent
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
export async function handleBroadcastSMS(title, body) {
  try {
    // Get all beneficiaries
    const beneficiaries = await API.getBeneficiaries(1000);
    if (!beneficiaries || beneficiaries.length === 0) {
      console.log('[Broadcast SMS] No beneficiaries found');
      return;
    }

    // Extract phone numbers
    const phoneNumbers = [];
    beneficiaries.forEach(beneficiary => {
      if (beneficiary.phone && isValidPhoneNumber(beneficiary.phone)) {
        phoneNumbers.push({
          phone: formatPhoneNumber(beneficiary.phone),
          name: beneficiary.name
        });
      }
    });

    if (phoneNumbers.length === 0) {
      console.log('[Broadcast SMS] No valid phone numbers found');
      return;
    }

    // Create broadcast message
    const message = `${title}\n\n${body}\n\n- Animia Health Program`;

    // Send SMS to each beneficiary using smart method
    for (const { phone, name } of phoneNumbers) {
      try {
        const personalizedMessage = `Hello ${name},\n\n${message}`;
        const success = await sendSMS(phone, personalizedMessage); // Use clean SMS
        console.log('[Broadcast SMS] Sent to:', phone, 'Success:', success);
        
        // Small delay between SMS
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('[Broadcast SMS] Failed to send to:', phone, error);
      }
    }

  } catch (error) {
    console.error('[Broadcast SMS] Error:', error);
  }
}

/**
 * Send follow-up reminder SMS
 * @param {object} beneficiary - Beneficiary data
 */
export async function sendFollowUpReminder(beneficiary) {
  try {
    if (!beneficiary.phone || !isValidPhoneNumber(beneficiary.phone)) {
      console.log('[Follow-up SMS] No valid phone number for:', beneficiary.name);
      return;
    }

    const message = `Hello ${beneficiary.name}, this is a reminder for your follow-up appointment. Please contact us to schedule your next visit.`;
    const formattedNumber = formatPhoneNumber(beneficiary.phone);
    
    const success = await sendSmartSMS(formattedNumber, message, true); // preferDirect = true
    console.log('[Follow-up SMS] Sent to:', formattedNumber, 'Success:', success);

  } catch (error) {
    console.error('[Follow-up SMS] Error:', error);
  }
}

/**
 * Send screening reminder SMS
 * @param {object} beneficiary - Beneficiary data
 */
export async function sendScreeningReminder(beneficiary) {
  try {
    if (!beneficiary.phone || !isValidPhoneNumber(beneficiary.phone)) {
      console.log('[Screening SMS] No valid phone number for:', beneficiary.name);
      return;
    }

    const message = `Hello ${beneficiary.name}, this is a reminder for your health screening. Please visit us for your scheduled screening.`;
    const formattedNumber = formatPhoneNumber(beneficiary.phone);
    
    const success = await sendSmartSMS(formattedNumber, message, true); // preferDirect = true
    console.log('[Screening SMS] Sent to:', formattedNumber, 'Success:', success);

  } catch (error) {
    console.error('[Screening SMS] Error:', error);
  }
}
