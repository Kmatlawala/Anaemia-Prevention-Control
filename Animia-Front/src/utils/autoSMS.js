import { sendSMS, formatPhoneNumber, isValidPhoneNumber } from './fixedSMS';
import { API } from './api';

export async function handleAutoSMS(notification) {
  try {
    
    const data = notification.data || {};
    const beneficiaryId = data.id || data.beneficiaryId;
    
    if (!beneficiaryId) {
      return;
    }

    const beneficiary = await API.getBeneficiary(beneficiaryId);
    if (!beneficiary || !beneficiary.phone) {
      return;
    }

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

    if (isValidPhoneNumber(phoneNumber)) {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      const success = await sendSMS(formattedNumber, message); 
      } else {
      }

  } catch (error) {
    }
}

export async function handleBroadcastSMS(title, body) {
  try {
    
    const beneficiaries = await API.getBeneficiaries(1000);
    if (!beneficiaries || beneficiaries.length === 0) {
      return;
    }

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
      return;
    }

    const message = `${title}\n\n${body}\n\n- Animia Health Program`;

    for (const { phone, name } of phoneNumbers) {
      try {
        const personalizedMessage = `Hello ${name},\n\n${message}`;
        const success = await sendSMS(phone, personalizedMessage); 
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        }
    }

  } catch (error) {
    }
}

export async function sendFollowUpReminder(beneficiary) {
  try {
    if (!beneficiary.phone || !isValidPhoneNumber(beneficiary.phone)) {
      return;
    }

    const message = `Hello ${beneficiary.name}, this is a reminder for your follow-up appointment. Please contact us to schedule your next visit.`;
    const formattedNumber = formatPhoneNumber(beneficiary.phone);
    
    const success = await sendSmartSMS(formattedNumber, message, true); 
    } catch (error) {
    }
}

export async function sendScreeningReminder(beneficiary) {
  try {
    if (!beneficiary.phone || !isValidPhoneNumber(beneficiary.phone)) {
      return;
    }

    const message = `Hello ${beneficiary.name}, this is a reminder for your health screening. Please visit us for your scheduled screening.`;
    const formattedNumber = formatPhoneNumber(beneficiary.phone);
    
    const success = await sendSmartSMS(formattedNumber, message, true); 
    } catch (error) {
    }
}
