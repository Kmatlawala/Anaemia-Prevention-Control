import {Alert, Linking, Platform, NativeModules} from 'react-native';

const {SMSModule} = NativeModules;

export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return '+91' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+')) {
    return cleaned;
  }

  return '+' + cleaned;
}

export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export async function sendNativeSMS(phoneNumber, message) {
  try {
    if (!SMSModule) {
      return false;
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);

    const result = await SMSModule.sendSMS(formattedNumber, message);
    if (result && result.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

export async function sendSMSApp(phoneNumber, message) {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);

    const smsUrl = `sms:${formattedNumber}?body=${encodeURIComponent(message)}`;

    await Linking.openURL(smsUrl);
    return true;
  } catch (error) {
    return false;
  }
}

export async function sendSMS(phoneNumber, message) {
  try {
    if (SMSModule) {
      const nativeResult = await sendNativeSMS(phoneNumber, message);
      if (nativeResult) {
        return true;
      }
    }

    const appResult = await sendSMSApp(phoneNumber, message);
    return appResult;
  } catch (error) {
    return false;
  }
}

export async function sendSMSToBeneficiary(beneficiary, message) {
  try {
    if (!beneficiary) {
      Alert.alert('Error', 'No beneficiary data provided');
      return {success: false, results: []};
    }

    const contacts = [];
    const results = [];

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

    for (const contact of contacts) {
      try {
        const personalizedMessage = `Hello ${beneficiary.name} (${contact.type}),\n\n${message}`;

        const success = await sendSMS(contact.number, personalizedMessage);

        results.push({
          contact: contact,
          success: success,
        });

        if (SMSModule) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        results.push({
          contact: contact,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

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
    return {success: false, results: []};
  }
}

export async function sendSMSToAllBeneficiaries(beneficiaries, message) {
  try {
    if (!beneficiaries || beneficiaries.length === 0) {
      Alert.alert('Error', 'No beneficiaries provided');
      return {success: false, results: []};
    }

    const results = [];

    for (const beneficiary of beneficiaries) {
      try {
        const result = await sendSMSToBeneficiary(beneficiary, message);
        results.push({
          beneficiary: beneficiary,
          result: result,
        });

        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
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
    return {success: false, results: []};
  }
}

export async function sendRegistrationSMS(beneficiary) {
  const message = `Hello ${
    beneficiary.name
  }, your registration with Anaemia is successful. Your ID: ${
    beneficiary.short_id || 'N/A'
  }. Thank you for joining our health program.`;
  return await sendSMSToBeneficiary(beneficiary, message);
}

export async function sendFollowUpSMS(beneficiary, followUpMessage) {
  const message = `Hello ${beneficiary.name}, ${followUpMessage}`;
  return await sendSMSToBeneficiary(beneficiary, message);
}

export async function sendScreeningReminderSMS(beneficiary, screeningDate) {
  const message = `Hello ${beneficiary.name}, this is a reminder for your health screening on ${screeningDate}. Please visit us for your scheduled screening.`;
  return await sendSMSToBeneficiary(beneficiary, message);
}
