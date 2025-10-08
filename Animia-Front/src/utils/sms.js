import {Alert, Linking, Platform, PermissionsAndroid} from 'react-native';
import nativeSMS from './nativeSMS';

/**
 * Request SMS permissions for Android
 * @returns {Promise<boolean>} - Permission granted status
 */
async function requestSMSPermissions() {
  try {
    if (Platform.OS !== 'android') {
      return true;
    }

    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);

    const sendSmsGranted =
      granted[PermissionsAndroid.PERMISSIONS.SEND_SMS] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const readSmsGranted =
      granted[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
      PermissionsAndroid.RESULTS.GRANTED;

    return sendSmsGranted && readSmsGranted;
  } catch (error) {
    console.error('[SMS Permissions] Error:', error);
    return false;
  }
}

/**
 * Send SMS directly using Android native functionality
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendDirectSMSNative(phoneNumber, message) {
  try {
    console.log('[Direct SMS] Attempting to send SMS to:', phoneNumber);
    console.log('[Direct SMS] Message:', message);

    const hasPermissions = await requestSMSPermissions();
    if (!hasPermissions) {
      Alert.alert(
        'Permission Required',
        'SMS permission is required to send messages directly.',
      );
      return false;
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[Direct SMS] Formatted number:', formattedNumber);

    // Check if native SMS is available
    if (!nativeSMS.isAvailable()) {
      console.log(
        '[Direct SMS] Native SMS not available, falling back to SMS app',
      );
      return await sendSMS(phoneNumber, message);
    }

    // Send SMS using native module
    const result = await nativeSMS.sendSMS(formattedNumber, message);

    if (result) {
      console.log('[Direct SMS] SMS sent successfully');
      return true;
    } else {
      console.log('[Direct SMS] SMS sending failed');
      return false;
    }
  } catch (error) {
    console.error('[Direct SMS] Error:', error);
    Alert.alert('SMS Error', 'Failed to send SMS: ' + error.message);
    return false;
  }
}

/**
 * Send SMS using device's default SMS app
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMS(phoneNumber, message) {
  try {
    console.log('[SMS] Attempting to send SMS to:', phoneNumber);
    console.log('[SMS] Message:', message);

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[SMS] Formatted number:', formattedNumber);

    // Try native SMS first (more reliable)
    try {
      if (nativeSMS.isAvailable()) {
        console.log('[SMS] Trying native SMS module...');
        const result = await nativeSMS.sendSMS(formattedNumber, message);
        if (result) {
          console.log('[SMS] Native SMS sent successfully');
          return true;
        } else {
          console.log('[SMS] Native SMS failed, falling back to SMS app');
        }
      }
    } catch (nativeError) {
      console.log('[SMS] Native SMS error:', nativeError);
    }

    // Fallback to SMS app with better URL format
    let smsUrl;
    if (Platform.OS === 'android') {
      // Android intent format - more reliable for message body
      smsUrl = `intent://send?to=${formattedNumber}&body=${encodeURIComponent(
        message,
      )}#Intent;scheme=sms;package=com.android.mms;end`;
    } else {
      // iOS format
      smsUrl = `sms:${formattedNumber}&body=${encodeURIComponent(message)}`;
    }

    console.log('[SMS] SMS URL:', smsUrl);

    // Try to open SMS app
    try {
      console.log('[SMS] Opening SMS app...');
      await Linking.openURL(smsUrl);
      console.log('[SMS] SMS app opened successfully');
      return true;
    } catch (openError) {
      console.error('[SMS] Failed to open SMS app:', openError);

      // Try simple format as last resort
      try {
        const simpleUrl = `sms:${formattedNumber}`;
        console.log('[SMS] Trying simple format:', simpleUrl);
        await Linking.openURL(simpleUrl);
        console.log('[SMS] Simple SMS app opened successfully');
        return true;
      } catch (simpleError) {
        console.error('[SMS] Simple format also failed:', simpleError);
        Alert.alert(
          'Error',
          'Cannot open SMS app on this device. Please try manually.',
        );
        return false;
      }
    }
  } catch (error) {
    console.error('[SMS] Error:', error);
    Alert.alert('Error', 'Failed to open SMS app: ' + error.message);
    return false;
  }
}

/**
 * Alternative SMS function using different URL format
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMSAlternative(phoneNumber, message) {
  try {
    console.log('[SMS Alternative] Attempting to send SMS to:', phoneNumber);

    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log('[SMS Alternative] Formatted number:', formattedNumber);

    // Try different SMS URL formats
    const smsUrls = [
      `sms:${formattedNumber}?body=${encodeURIComponent(message)}`,
      `sms://${formattedNumber}?body=${encodeURIComponent(message)}`,
      `sms:${formattedNumber}`,
      `tel:${formattedNumber}`,
    ];

    for (let i = 0; i < smsUrls.length; i++) {
      const smsUrl = smsUrls[i];
      console.log(`[SMS Alternative] Trying format ${i + 1}:`, smsUrl);

      try {
        const canOpen = await Linking.canOpenURL(smsUrl);
        console.log(`[SMS Alternative] Can open format ${i + 1}:`, canOpen);

        if (canOpen) {
          await Linking.openURL(smsUrl);
          console.log(`[SMS Alternative] SMS app opened with format ${i + 1}`);
          return true;
        }
      } catch (urlError) {
        console.log(
          `[SMS Alternative] Format ${i + 1} failed:`,
          urlError.message,
        );
      }
    }

    // If all formats fail, try to open anyway with the first format
    console.log(
      '[SMS Alternative] All formats failed, trying to open anyway...',
    );
    try {
      await Linking.openURL(smsUrls[0]);
      console.log('[SMS Alternative] SMS app opened anyway');
      return true;
    } catch (finalError) {
      console.error('[SMS Alternative] Final attempt failed:', finalError);
      Alert.alert(
        'SMS Error',
        'Cannot open SMS app. Please try manually sending SMS to: ' +
          formattedNumber,
      );
      return false;
    }
  } catch (error) {
    console.error('[SMS Alternative] Error:', error);
    Alert.alert('Error', 'Failed to open SMS app: ' + error.message);
    return false;
  }
}

/**
 * Send SMS to multiple recipients (opens SMS app for each)
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendBulkSMS(phoneNumbers, message) {
  try {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      Alert.alert('Error', 'No phone numbers provided');
      return false;
    }

    // For bulk SMS, we'll show a confirmation and then open SMS for each number
    Alert.alert(
      'Bulk SMS',
      `This will open SMS app for ${phoneNumbers.length} recipients. Continue?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Continue',
          onPress: async () => {
            for (const phoneNumber of phoneNumbers) {
              await sendSMS(phoneNumber, message);
              // Small delay between SMS apps opening
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          },
        },
      ],
    );

    return true;
  } catch (error) {
    console.error('Bulk SMS error:', error);
    Alert.alert('Error', 'Failed to send bulk SMS: ' + error.message);
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
 * Get all phone numbers from beneficiaries data
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @returns {Array} - Array of unique phone numbers
 */
export function extractPhoneNumbers(beneficiaries) {
  const phoneNumbers = new Set();

  beneficiaries.forEach(beneficiary => {
    // Add primary phone
    if (beneficiary.phone && isValidPhoneNumber(beneficiary.phone)) {
      phoneNumbers.add(formatPhoneNumber(beneficiary.phone));
    }

    // Add alternative phone
    if (beneficiary.alt_phone && isValidPhoneNumber(beneficiary.alt_phone)) {
      phoneNumbers.add(formatPhoneNumber(beneficiary.alt_phone));
    }

    // Add doctor phone
    if (
      beneficiary.doctor_phone &&
      isValidPhoneNumber(beneficiary.doctor_phone)
    ) {
      phoneNumbers.add(formatPhoneNumber(beneficiary.doctor_phone));
    }
  });

  return Array.from(phoneNumbers);
}

/**
 * Permission-free SMS sending - always uses SMS app method
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>} - Success status
 */
export async function sendPermissionFreeSMS(phoneNumber, message) {
  try {
    console.log('[Permission-Free SMS] Sending SMS to:', phoneNumber);
    console.log('[Permission-Free SMS] Message:', message);

    // Always use SMS app method (no permissions required)
    const success = await sendSMS(phoneNumber, message);

    if (success) {
      console.log('[Permission-Free SMS] SMS app opened successfully');
    } else {
      console.log('[Permission-Free SMS] Failed to open SMS app');
    }

    return success;
  } catch (error) {
    console.error('[Permission-Free SMS] Error:', error);
    Alert.alert('SMS Error', 'Failed to open SMS app: ' + error.message);
    return false;
  }
}

/**
 * Smart SMS sending - automatically chooses best method
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @param {boolean} preferDirect - Whether to prefer direct SMS over app opening
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSmartSMS(phoneNumber, message, preferDirect = true) {
  try {
    console.log('[Smart SMS] Attempting to send SMS to:', phoneNumber);

    // For now, always use permission-free method to avoid issues
    console.log('[Smart SMS] Using permission-free SMS method...');
    return await sendPermissionFreeSMS(phoneNumber, message);

    // Original code commented out to avoid permission issues
    // if (preferDirect && Platform.OS === 'android') {
    //   console.log('[Smart SMS] Trying direct SMS first...');
    //   const directResult = await sendDirectSMSNative(phoneNumber, message);
    //   if (directResult) {
    //     console.log('[Smart SMS] Direct SMS successful');
    //     return true;
    //   } else {
    //     console.log('[Smart SMS] Direct SMS failed, falling back to SMS app');
    //   }
    // }

    // Fallback to SMS app
    // console.log('[Smart SMS] Using SMS app method...');
    // return await sendSMS(phoneNumber, message);
  } catch (error) {
    console.error('[Smart SMS] Error:', error);
    Alert.alert('SMS Error', 'Failed to send SMS: ' + error.message);
    return false;
  }
}

/**
 * Send bulk SMS with smart method selection
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @param {string} message - SMS message content
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSmartBulkSMS(
  phoneNumbers,
  message,
  preferDirect = true,
) {
  try {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      Alert.alert('Error', 'No phone numbers provided');
      return false;
    }

    console.log(
      `[Smart Bulk SMS] Sending to ${phoneNumbers.length} recipients`,
    );

    // For bulk SMS, we'll show a confirmation and then send
    Alert.alert(
      'Bulk SMS',
      `This will send SMS to ${phoneNumbers.length} recipients. Continue?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Continue',
          onPress: async () => {
            let successCount = 0;
            let failCount = 0;

            for (const phoneNumber of phoneNumbers) {
              try {
                const success = await sendSmartSMS(
                  phoneNumber,
                  message,
                  preferDirect,
                );
                if (success) {
                  successCount++;
                } else {
                  failCount++;
                }
                // Small delay between SMS
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (error) {
                console.error('[Smart Bulk SMS] Error for', phoneNumber, error);
                failCount++;
              }
            }

            Alert.alert(
              'Bulk SMS Complete',
              `Sent: ${successCount}\nFailed: ${failCount}`,
              [{text: 'OK'}],
            );
          },
        },
      ],
    );

    return true;
  } catch (error) {
    console.error('Smart Bulk SMS error:', error);
    Alert.alert('Error', 'Failed to send bulk SMS: ' + error.message);
    return false;
  }
}

/**
 * Send SMS to all contacts of a single beneficiary (Permission-free method)
 * @param {object} beneficiary - Beneficiary object with multiple contacts
 * @param {string} message - SMS message content
 * @param {boolean} preferDirect - Whether to prefer direct SMS (ignored for permission-free)
 * @returns {Promise<object>} - Results with success/failure for each contact
 */
export async function sendSMSToBeneficiaryContacts(
  beneficiary,
  message,
  preferDirect = true,
) {
  try {
    if (!beneficiary) {
      Alert.alert('Error', 'No beneficiary data provided');
      return {success: false, results: []};
    }

    const contacts = [];
    const results = [];

    // Extract all valid phone numbers from beneficiary
    if (beneficiary.phone && isValidPhoneNumber(beneficiary.phone)) {
      contacts.push({
        type: 'Primary Phone',
        number: formatPhoneNumber(beneficiary.phone),
        name: beneficiary.name || 'Beneficiary',
      });
    }

    if (beneficiary.alt_phone && isValidPhoneNumber(beneficiary.alt_phone)) {
      contacts.push({
        type: 'Alternative Phone',
        number: formatPhoneNumber(beneficiary.alt_phone),
        name: beneficiary.name || 'Beneficiary',
      });
    }

    if (
      beneficiary.doctor_phone &&
      isValidPhoneNumber(beneficiary.doctor_phone)
    ) {
      contacts.push({
        type: 'Doctor Phone',
        number: formatPhoneNumber(beneficiary.doctor_phone),
        name: beneficiary.name || 'Beneficiary',
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
      `[Beneficiary SMS] Sending to ${contacts.length} contacts for: ${beneficiary.name}`,
    );

    // Send SMS to each contact using SMS app method (no permissions required)
    for (const contact of contacts) {
      try {
        const personalizedMessage = `Hello, this message is for ${contact.name} (${contact.type}):\n\n${message}`;

        // Always use SMS app method to avoid permission issues
        const success = await sendSMS(contact.number, personalizedMessage);

        results.push({
          contact: contact,
          success: success,
          message: success
            ? 'SMS app opened successfully'
            : 'Failed to open SMS app',
        });

        console.log(
          `[Beneficiary SMS] ${contact.type} (${contact.number}): ${
            success ? 'Success' : 'Failed'
          }`,
        );

        // Small delay between SMS apps opening
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Beneficiary SMS] Error for ${contact.type}:`, error);
        results.push({
          contact: contact,
          success: false,
          message: 'Error: ' + error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    // Show results summary
    Alert.alert(
      'SMS Results',
      `Opened SMS app for ${successCount}/${totalCount} contacts:\n\n` +
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
    console.error('[Beneficiary SMS] Error:', error);
    Alert.alert(
      'Error',
      'Failed to send SMS to beneficiary contacts: ' + error.message,
    );
    return {success: false, results: []};
  }
}

/**
 * Send SMS to all beneficiaries
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @param {string} message - SMS message content
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMSToAllBeneficiaries(
  beneficiaries,
  message,
  preferDirect = true,
) {
  try {
    const phoneNumbers = extractPhoneNumbers(beneficiaries);

    if (phoneNumbers.length === 0) {
      Alert.alert(
        'No Phone Numbers',
        'No valid phone numbers found in beneficiaries data',
      );
      return false;
    }

    return await sendSmartBulkSMS(phoneNumbers, message, preferDirect);
  } catch (error) {
    console.error('Send SMS to all beneficiaries error:', error);
    Alert.alert(
      'Error',
      'Failed to send SMS to beneficiaries: ' + error.message,
    );
    return false;
  }
}
