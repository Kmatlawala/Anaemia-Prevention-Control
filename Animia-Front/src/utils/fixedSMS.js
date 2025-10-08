import {
  Alert,
  Linking,
  Platform,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';

/**
 * Fixed SMS Utility
 * Reliable SMS sending with proper native integration
 */

// Get native SMS module
const {SMSModule} = NativeModules;

/**
 * Request SMS permission for Android
 * @returns {Promise<boolean>} - Permission granted status
 */
export async function requestSMSPermission() {
  try {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this permission
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SMS Permission',
        message:
          'Animia needs SMS permission to send healthcare notifications to beneficiaries.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    console.log('[SMS Permission] Status:', granted);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[SMS Permission] Error:', error);
    return false;
  }
}

/**
 * Check if SMS permission is granted
 * @returns {Promise<boolean>} - Permission status
 */
export async function checkSMSPermission() {
  try {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this permission
    }

    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    );

    console.log('[SMS Permission] Check result:', granted);
    return granted;
  } catch (error) {
    console.error('[SMS Permission] Check error:', error);
    return false;
  }
}

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
    console.log('[Fixed Native SMS] Sending SMS to:', phoneNumber);
    console.log('[Fixed Native SMS] Message:', message);

    if (!SMSModule) {
      console.error('[Fixed Native SMS] SMSModule not available');
      return false;
    }

    // Check SMS permission first
    const hasPermission = await checkSMSPermission();
    if (!hasPermission) {
      console.log('[Fixed Native SMS] Requesting SMS permission...');
      const granted = await requestSMSPermission();
      if (!granted) {
        console.error('[Fixed Native SMS] SMS permission denied');
        return false;
      }
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[Fixed Native SMS] Formatted number:', formattedNumber);

    // Send SMS using native module with retry mechanism
    let result;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        result = await SMSModule.sendSMS(formattedNumber, message);
        console.log(
          `[Fixed Native SMS] Attempt ${attempts + 1} result:`,
          result,
        );

        if (result && result.success) {
          console.log('[Fixed Native SMS] SMS sent successfully');
          return true;
        }

        attempts++;
        if (attempts < maxAttempts) {
          console.log('[Fixed Native SMS] Retrying SMS...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(
          `[Fixed Native SMS] Attempt ${attempts + 1} error:`,
          error,
        );
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.error(
      '[Fixed Native SMS] SMS sending failed after all attempts:',
      result,
    );
    return false;
  } catch (error) {
    console.error('[Fixed Native SMS] Error:', error);
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
    console.log('[Fixed SMS App] Opening SMS app for:', phoneNumber);

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[Fixed SMS App] Formatted number:', formattedNumber);

    // Create SMS URL
    const smsUrl = `sms:${formattedNumber}?body=${encodeURIComponent(message)}`;
    console.log('[Fixed SMS App] SMS URL:', smsUrl);

    // Check if SMS app can be opened
    const canOpen = await Linking.canOpenURL(smsUrl);
    console.log('[Fixed SMS App] Can open SMS app:', canOpen);

    if (canOpen) {
      await Linking.openURL(smsUrl);
      console.log('[Fixed SMS App] SMS app opened successfully');
      return true;
    } else {
      // Try alternative format
      const altUrl = `sms:${formattedNumber}`;
      const canOpenAlt = await Linking.canOpenURL(altUrl);
      console.log('[Fixed SMS App] Can open SMS app (alt):', canOpenAlt);

      if (canOpenAlt) {
        await Linking.openURL(altUrl);
        console.log('[Fixed SMS App] SMS app opened (alt)');
        return true;
      } else {
        console.error('[Fixed SMS App] Cannot open SMS app');
        return false;
      }
    }
  } catch (error) {
    console.error('[Fixed SMS App] Error:', error);
    return false;
  }
}

/**
 * Send SMS to multiple numbers using SMS app (Best for multiple recipients)
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMSToMultiple(phoneNumbers, message) {
  try {
    console.log('[Fixed Multi SMS] Sending to multiple numbers:', phoneNumbers);

    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.error('[Fixed Multi SMS] No phone numbers provided');
      return false;
    }

    // Format all phone numbers
    const formattedNumbers = phoneNumbers.map(num => formatPhoneNumber(num));
    console.log('[Fixed Multi SMS] Formatted numbers:', formattedNumbers);

    // Create SMS URL with multiple recipients
    const numbersString = formattedNumbers.join(',');
    const smsUrl = `sms:${numbersString}?body=${encodeURIComponent(message)}`;
    console.log('[Fixed Multi SMS] SMS URL:', smsUrl);

    // Check if SMS app can be opened
    const canOpen = await Linking.canOpenURL(smsUrl);
    console.log('[Fixed Multi SMS] Can open SMS app:', canOpen);

    if (canOpen) {
      await Linking.openURL(smsUrl);
      console.log('[Fixed Multi SMS] SMS app opened with multiple recipients');
      return true;
    } else {
      console.error('[Fixed Multi SMS] Cannot open SMS app');
      return false;
    }
  } catch (error) {
    console.error('[Fixed Multi SMS] Error:', error);
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
    console.log('[Fixed Smart SMS] Sending SMS to:', phoneNumber);

    // Try native SMS first (more reliable for actual delivery)
    if (SMSModule) {
      console.log('[Fixed Smart SMS] Trying native SMS first...');
      const nativeResult = await sendNativeSMS(phoneNumber, message);
      if (nativeResult) {
        console.log('[Fixed Smart SMS] Native SMS successful');
        return true;
      }
      console.log('[Fixed Smart SMS] Native SMS failed, trying SMS app...');
    }

    // Fallback to SMS app
    console.log('[Fixed Smart SMS] Trying SMS app fallback...');
    const appResult = await sendSMSApp(phoneNumber, message);
    if (appResult) {
      console.log('[Fixed Smart SMS] SMS app successful');
      return true;
    }
    console.log('[Fixed Smart SMS] SMS app also failed');

    return false;
  } catch (error) {
    console.error('[Fixed Smart SMS] Error:', error);
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
    const phoneNumbers = [];

    // Get all valid phone numbers from beneficiary

    if (beneficiary.phone && isValidPhoneNumber(beneficiary.phone)) {
      contacts.push({
        type: 'Primary Phone',
        number: formatPhoneNumber(beneficiary.phone),
      });
      phoneNumbers.push(beneficiary.phone);
    }

    if (beneficiary.alt_phone && isValidPhoneNumber(beneficiary.alt_phone)) {
      contacts.push({
        type: 'Alternative Phone',
        number: formatPhoneNumber(beneficiary.alt_phone),
      });
      phoneNumbers.push(beneficiary.alt_phone);
    }

    if (
      beneficiary.doctor_phone &&
      isValidPhoneNumber(beneficiary.doctor_phone)
    ) {
      contacts.push({
        type: 'Doctor Phone',
        number: formatPhoneNumber(beneficiary.doctor_phone),
      });
      phoneNumbers.push(beneficiary.doctor_phone);
    }

    if (contacts.length === 0) {
      Alert.alert(
        'No Contacts',
        'No valid phone numbers found for this beneficiary',
      );
      return {success: false, results: []};
    }

    console.log(
      `[Fixed Beneficiary SMS] Sending to ${contacts.length} contacts for: ${beneficiary.name}`,
    );

    // Try sending to all numbers at once first (SMS app method)
    if (phoneNumbers.length > 1) {
      console.log('[Fixed Beneficiary SMS] Trying multiple SMS approach...');
      const personalizedMessage = `Hello ${beneficiary.name},\n\n${message}`;

      const multiSuccess = await sendSMSToMultiple(
        phoneNumbers,
        personalizedMessage,
      );

      if (multiSuccess) {
        console.log('[Fixed Beneficiary SMS] Multiple SMS successful');

        // Show success message
        Alert.alert(
          'SMS Sent',
          `SMS sent to all ${contacts.length} contacts for ${beneficiary.name}:\n\n` +
            contacts.map(c => `• ${c.type}: ${c.number}`).join('\n') +
            '\n\nPlease check your SMS app to send the message.',
          [{text: 'OK'}],
        );

        return {
          success: true,
          results: contacts.map(contact => ({contact, success: true})),
          summary: {
            total: contacts.length,
            successful: contacts.length,
            failed: 0,
          },
        };
      }
    }

    // Fallback: Send to each contact individually
    console.log('[Fixed Beneficiary SMS] Falling back to individual SMS...');
    const results = [];

    for (const contact of contacts) {
      try {
        const personalizedMessage = `Hello ${beneficiary.name} (${contact.type}),\n\n${message}`;

        console.log(
          `[Fixed Beneficiary SMS] Sending to ${contact.type}: ${contact.number}`,
        );

        // Use smart SMS method
        const success = await sendSMS(contact.number, personalizedMessage);

        results.push({
          contact: contact,
          success: success,
        });

        console.log(
          `[Fixed Beneficiary SMS] ${contact.type}: ${
            success ? 'Success' : 'Failed'
          }`,
        );

        // Small delay between SMS
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `[Fixed Beneficiary SMS] Error for ${contact.type}:`,
          error,
        );
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
    console.error('[Fixed Beneficiary SMS] Error:', error);
    Alert.alert('Error', 'Failed to send SMS: ' + error.message);
    return {success: false, results: []};
  }
}

/**
 * Check if native SMS module is available
 * @returns {boolean} - Is native SMS available
 */
export function isNativeSMSAvailable() {
  return SMSModule !== undefined;
}

/**
 * Get SMS module status
 * @returns {object} - SMS module status
 */
export function getSMSModuleStatus() {
  return {
    available: SMSModule !== undefined,
    module: SMSModule,
    platform: Platform.OS,
  };
}
