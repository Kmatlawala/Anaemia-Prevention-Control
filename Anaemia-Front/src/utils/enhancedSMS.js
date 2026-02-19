import {sendSMSToBeneficiaryContacts, sendSmartSMS} from './sms';
import {
  storeSMSInBeneficiary,
  storeSMSInScreening,
  storeBulkSMSData,
  getBeneficiarySMSHistory,
  getSMSStatistics,
} from './smsStorage';

export async function sendSMSWithStorage(
  beneficiary,
  message,
  type = 'general',
  preferDirect = true,
) {
  try {
    const smsResult = await sendSMSToBeneficiaryContacts(
      beneficiary,
      message,
      preferDirect,
    );

    const storageResults = [];

    for (const result of smsResult.results) {
      try {
        const storageData = {
          beneficiary: beneficiary,
          message: message,
          smsResult: {
            success: result.success,
            error: result.message,
            contact_type: result.contact.type,
          },
          type: type,
        };

        const storageResult = await storeSMSInBeneficiary(
          storageData.beneficiary,
          storageData.message,
          storageData.smsResult,
          storageData.type,
        );

        storageResults.push({
          contact: result.contact,
          smsSuccess: result.success,
          storageSuccess: storageResult.success,
          storageError: storageResult.error,
        });
      } catch (error) {
        storageResults.push({
          contact: result.contact,
          smsSuccess: result.success,
          storageSuccess: false,
          storageError: error.message,
        });
      }
    }

    return {
      smsResult: smsResult,
      storageResults: storageResults,
      summary: {
        totalContacts: smsResult.results.length,
        successfulSMS: smsResult.results.filter(r => r.success).length,
        successfulStorage: storageResults.filter(r => r.storageSuccess).length,
        failedSMS: smsResult.results.filter(r => !r.success).length,
        failedStorage: storageResults.filter(r => !r.storageSuccess).length,
      },
    };
  } catch (error) {
    return {
      smsResult: {success: false, results: []},
      storageResults: [],
      summary: {
        totalContacts: 0,
        successfulSMS: 0,
        successfulStorage: 0,
        failedSMS: 0,
        failedStorage: 0,
      },
      error: error.message,
    };
  }
}

export async function sendScreeningSMSWithStorage(
  screening,
  message,
  type = 'screening',
  preferDirect = true,
) {
  try {
    const phoneNumber = screening.phone_number || screening.beneficiary_phone;
    const smsResult = await sendSmartSMS(phoneNumber, message, preferDirect);

    const storageResult = await storeSMSInScreening(
      screening,
      message,
      {success: smsResult, error: smsResult ? null : 'SMS sending failed'},
      type,
    );

    return {
      smsSuccess: smsResult,
      storageSuccess: storageResult.success,
      storageError: storageResult.error,
      screening: screening,
      message: message,
      type: type,
    };
  } catch (error) {
    return {
      smsSuccess: false,
      storageSuccess: false,
      storageError: error.message,
      screening: screening,
      message: message,
      type: type,
      error: error.message,
    };
  }
}

export async function sendBulkSMSWithStorage(
  beneficiaries,
  message,
  type = 'bulk',
  preferDirect = true,
) {
  try {
    const smsResults = [];
    const storageResults = [];

    for (const beneficiary of beneficiaries) {
      try {
        const result = await sendSMSWithStorage(
          beneficiary,
          message,
          type,
          preferDirect,
        );
        smsResults.push(result);
        storageResults.push(...result.storageResults);
      } catch (error) {
        smsResults.push({
          smsResult: {success: false, results: []},
          storageResults: [],
          error: error.message,
        });
      }
    }

    const bulkStorageResult = await storeBulkSMSData(
      beneficiaries,
      message,
      smsResults,
      type,
    );

    return {
      smsResults: smsResults,
      storageResults: storageResults,
      bulkStorageResult: bulkStorageResult,
      summary: {
        totalBeneficiaries: beneficiaries.length,
        successfulSMS: smsResults.filter(r => r.smsResult.success).length,
        successfulStorage: storageResults.filter(r => r.storageSuccess).length,
        bulkStorageSuccess: bulkStorageResult.success,
      },
    };
  } catch (error) {
    return {
      smsResults: [],
      storageResults: [],
      bulkStorageResult: {success: false, error: error.message},
      summary: {
        totalBeneficiaries: beneficiaries.length,
        successfulSMS: 0,
        successfulStorage: 0,
        bulkStorageSuccess: false,
      },
      error: error.message,
    };
  }
}

export async function getBeneficiarySMSHistory(beneficiaryId) {
  try {
    return await getBeneficiarySMSHistory(beneficiaryId);
  } catch (error) {
    return [];
  }
}

export async function getSMSStatistics() {
  try {
    return await getSMSStatistics();
  } catch (error) {
    return {
      total_sms_sent: 0,
      successful_sms: 0,
      failed_sms: 0,
      beneficiaries_contacted: 0,
      last_sms_date: null,
    };
  }
}

export async function sendRegistrationSMSWithStorage(
  beneficiary,
  preferDirect = true,
) {
  const message = `Hello ${
    beneficiary.name
  }, your registration with Anaemia is successful. Your ID: ${
    beneficiary.short_id || 'N/A'
  }. Thank you for joining our health program.`;

  return await sendSMSWithStorage(
    beneficiary,
    message,
    'registration',
    preferDirect,
  );
}

export async function sendFollowUpSMSWithStorage(
  beneficiary,
  followUp,
  preferDirect = true,
) {
  const message = `Hello ${beneficiary.name}, this is a reminder for your follow-up appointment on ${followUp.date}. Please contact us to schedule.`;

  return await sendSMSWithStorage(
    beneficiary,
    message,
    'follow_up',
    preferDirect,
  );
}

export async function sendScreeningReminderSMSWithStorage(
  screening,
  preferDirect = true,
) {
  const message = `Hello ${screening.beneficiary_name}, this is a reminder for your health screening on ${screening.screening_date}. Please visit us for your scheduled screening.`;

  return await sendScreeningSMSWithStorage(
    screening,
    message,
    'screening_reminder',
    preferDirect,
  );
}
