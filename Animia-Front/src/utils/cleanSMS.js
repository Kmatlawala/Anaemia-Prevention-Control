import {Alert, Linking, Platform, NativeModules} from 'react-native';

/**
 * Clean SMS Utility
 * Simple and reliable SMS sending with native module integration
 */

// Get native SMS module
const {SMSModule} = NativeModules;

/**
 * Format phone number for SMS
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(phoneNumber) {
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
 * Validate phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - Is valid phone number
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Send SMS using native module (Direct SMS sending)
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendNativeSMS(phoneNumber, message) {
  try {
    console.log('[Native SMS] Sending SMS to:', phoneNumber);
    console.log('[Native SMS] Message:', message);

    if (!SMSModule) {
      console.error('[Native SMS] SMSModule not available');
      return false;
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[Native SMS] Formatted number:', formattedNumber);

    // Send SMS using native module
    const result = await SMSModule.sendSMS(formattedNumber, message);
    console.log('[Native SMS] Native SMS result:', result);

    if (result && result.success) {
      console.log('[Native SMS] SMS sent successfully');
      return true;
    } else {
      console.error('[Native SMS] SMS sending failed:', result);
      return false;
    }
  } catch (error) {
    console.error('[Native SMS] Error:', error);
    return false;
  }
}

/**
 * Send SMS using device SMS app (Fallback method)
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMSApp(phoneNumber, message) {
  try {
    console.log('[SMS App] Opening SMS app for:', phoneNumber);

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[SMS App] Formatted number:', formattedNumber);

    // Create SMS URL
    const smsUrl = `sms:${formattedNumber}?body=${encodeURIComponent(message)}`;
    console.log('[SMS App] SMS URL:', smsUrl);

    // Open SMS app
    await Linking.openURL(smsUrl);
    console.log('[SMS App] SMS app opened successfully');
    return true;
  } catch (error) {
    console.error('[SMS App] Error:', error);
    console.error('[Clean SMS] Failed to open SMS app:', error.message);
    return false;
  }
}

/**
 * Send SMS with smart fallback (Native first, then SMS app)
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMS(phoneNumber, message) {
  try {
    console.log('[Smart SMS] Sending SMS to:', phoneNumber);

    // Try native SMS first
    if (SMSModule) {
      console.log('[Smart SMS] Trying native SMS...');
      const nativeResult = await sendNativeSMS(phoneNumber, message);
      if (nativeResult) {
        console.log('[Smart SMS] Native SMS successful');
        return true;
      }
      console.log('[Smart SMS] Native SMS failed, trying SMS app...');
    }

    // Fallback to SMS app
    console.log('[Smart SMS] Using SMS app fallback...');
    const appResult = await sendSMSApp(phoneNumber, message);
    return appResult;
  } catch (error) {
    console.error('[Smart SMS] Error:', error);
    console.error('[Clean SMS] Failed to send SMS:', error.message);
    return false;
  }
}

/**
 * Send SMS to all contacts of a beneficiary
 * @param {object} beneficiary - Beneficiary object
 * @param {string} message - SMS message content
 * @returns {Promise<object>} - Results with success/failure for each contact
 */
export async function sendSMSToBeneficiary(beneficiary, message) {
  try {
    if (!beneficiary) {
      Alert.alert('Error', 'No beneficiary data provided');
      return {success: false, results: []};
    }

    const contacts = [];
    const results = [];

    // Get all valid phone numbers from beneficiary
    if (beneficiary.phone && isValidPhoneNumber(beneficiary.phone)) {
      contacts.push({
        type: 'Primary Phone',
        number: formatPhoneNumber(beneficiary.phone),
      });
    }

    if (beneficiary.alt_phone && isValidPhoneNumber(beneficiary.alt_phone)) {
      contacts.push({
        type: 'Alternative Phone',
        number: formatPhoneNumber(beneficiary.alt_phone),
      });
    }

    if (
      beneficiary.doctor_phone &&
      isValidPhoneNumber(beneficiary.doctor_phone)
    ) {
      contacts.push({
        type: 'Doctor Phone',
        number: formatPhoneNumber(beneficiary.doctor_phone),
      });
    }

    if (contacts.length === 0) {
      Alert.alert(
        'No Contacts',
        'No valid phone numbers found for this beneficiary',
      );
      return {success: false, results: []};
    }

    console.log(
      `[Clean SMS] Sending to ${contacts.length} contacts for: ${beneficiary.name}`,
    );

    // Send SMS to each contact
    for (const contact of contacts) {
      try {
        const personalizedMessage = `Hello ${beneficiary.name} (${contact.type}),\n\n${message}`;

        console.log(
          `[Beneficiary SMS] Sending to ${contact.type}: ${contact.number}`,
        );

        // Try native SMS first, then fallback to SMS app
        const success = await sendSMS(contact.number, personalizedMessage);

        results.push({
          contact: contact,
          success: success,
        });

        console.log(
          `[Beneficiary SMS] ${contact.type}: ${
            success ? 'Success' : 'Failed'
          }`,
        );

        // Small delay between SMS (for native SMS)
        if (SMSModule) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Longer delay for SMS app
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`[Beneficiary SMS] Error for ${contact.type}:`, error);
        results.push({
          contact: contact,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    // Show results
    const method = SMSModule ? 'Native SMS' : 'SMS App';
    Alert.alert(
      'SMS Results',
      `${method} sent to ${successCount}/${totalCount} contacts:\n\n` +
        results
          .map(r => `${r.contact.type}: ${r.success ? '✓' : '✗'}`)
          .join('\n'),
      [{text: 'OK'}],
    );

    return {
      success: successCount > 0,
      results: results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
      },
    };
  } catch (error) {
    console.error('[Clean SMS] Error:', error);
    console.error('[Clean SMS] Failed to send SMS:', error.message);
    return {success: false, results: []};
  }
}

/**
 * Send SMS to multiple beneficiaries
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @param {string} message - SMS message content
 * @returns {Promise<object>} - Results
 */
export async function sendSMSToAllBeneficiaries(beneficiaries, message) {
  try {
    if (!beneficiaries || beneficiaries.length === 0) {
      Alert.alert('Error', 'No beneficiaries provided');
      return {success: false, results: []};
    }

    console.log(`[Clean SMS] Sending to ${beneficiaries.length} beneficiaries`);

    const results = [];

    for (const beneficiary of beneficiaries) {
      try {
        const result = await sendSMSToBeneficiary(beneficiary, message);
        results.push({
          beneficiary: beneficiary,
          result: result,
        });

        // Wait between beneficiaries
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(
          `[Clean SMS] Error for beneficiary ${beneficiary.name}:`,
          error,
        );
        results.push({
          beneficiary: beneficiary,
          result: {success: false, error: error.message},
        });
      }
    }

    const successCount = results.filter(r => r.result.success).length;

    Alert.alert(
      'Bulk SMS Results',
      `SMS sent to ${successCount}/${beneficiaries.length} beneficiaries`,
      [{text: 'OK'}],
    );

    return {
      success: successCount > 0,
      results: results,
      summary: {
        total: beneficiaries.length,
        successful: successCount,
        failed: beneficiaries.length - successCount,
      },
    };
  } catch (error) {
    console.error('[Clean SMS] Bulk SMS error:', error);
    console.error('[Clean SMS] Failed to send bulk SMS:', error.message);
    return {success: false, results: []};
  }
}

/**
 * Send registration SMS
 * @param {object} beneficiary - New beneficiary
 * @returns {Promise<boolean>} - Success status
 */
export async function sendRegistrationSMS(beneficiary) {
  const message = `Hello ${
    beneficiary.name
  }, your registration with Animia is successful. Your ID: ${
    beneficiary.short_id || 'N/A'
  }. Thank you for joining our health program.`;
  return await sendSMSToBeneficiary(beneficiary, message);
}

/**
 * Send follow-up SMS
 * @param {object} beneficiary - Beneficiary
 * @param {string} followUpMessage - Follow-up message
 * @returns {Promise<boolean>} - Success status
 */
export async function sendFollowUpSMS(beneficiary, followUpMessage) {
  const message = `Hello ${beneficiary.name}, ${followUpMessage}`;
  return await sendSMSToBeneficiary(beneficiary, message);
}

/**
 * Send screening reminder SMS
 * @param {object} beneficiary - Beneficiary
 * @param {string} screeningDate - Screening date
 * @returns {Promise<boolean>} - Success status
 */
export async function sendScreeningReminderSMS(beneficiary, screeningDate) {
  const message = `Hello ${beneficiary.name}, this is a reminder for your health screening on ${screeningDate}. Please visit us for your scheduled screening.`;
  return await sendSMSToBeneficiary(beneficiary, message);
}
