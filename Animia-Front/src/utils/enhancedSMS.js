import { sendSMSToBeneficiaryContacts, sendSmartSMS } from './sms';
import { 
  storeSMSInBeneficiary, 
  storeSMSInScreening, 
  storeBulkSMSData,
  getBeneficiarySMSHistory,
  getSMSStatistics 
} from './smsStorage';

/**
 * Enhanced SMS Service with Data Storage
 * Sends SMS and stores data in beneficiary and screening tables
 */

/**
 * Send SMS to all contacts of a beneficiary and store data
 * @param {object} beneficiary - Beneficiary object
 * @param {string} message - SMS message
 * @param {string} type - SMS type (registration, follow_up, screening, etc.)
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Complete results with storage info
 */
export async function sendSMSWithStorage(beneficiary, message, type = 'general', preferDirect = true) {
  try {
    console.log('[Enhanced SMS] Sending SMS with storage for:', beneficiary.name);

    // Send SMS to all contacts
    const smsResult = await sendSMSToBeneficiaryContacts(beneficiary, message, preferDirect);
    
    // Store SMS data for each contact
    const storageResults = [];
    
    for (const result of smsResult.results) {
      try {
        const storageData = {
          beneficiary: beneficiary,
          message: message,
          smsResult: {
            success: result.success,
            error: result.message,
            contact_type: result.contact.type
          },
          type: type
        };

        const storageResult = await storeSMSInBeneficiary(
          storageData.beneficiary,
          storageData.message,
          storageData.smsResult,
          storageData.type
        );

        storageResults.push({
          contact: result.contact,
          smsSuccess: result.success,
          storageSuccess: storageResult.success,
          storageError: storageResult.error
        });

        console.log(`[Enhanced SMS] Storage for ${result.contact.type}: ${storageResult.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error(`[Enhanced SMS] Storage error for ${result.contact.type}:`, error);
        storageResults.push({
          contact: result.contact,
          smsSuccess: result.success,
          storageSuccess: false,
          storageError: error.message
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
        failedStorage: storageResults.filter(r => !r.storageSuccess).length
      }
    };

  } catch (error) {
    console.error('[Enhanced SMS] Error:', error);
    return {
      smsResult: { success: false, results: [] },
      storageResults: [],
      summary: { totalContacts: 0, successfulSMS: 0, successfulStorage: 0, failedSMS: 0, failedStorage: 0 },
      error: error.message
    };
  }
}

/**
 * Send SMS for screening and store data
 * @param {object} screening - Screening object
 * @param {string} message - SMS message
 * @param {string} type - SMS type (screening_reminder, results_ready, etc.)
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Complete results with storage info
 */
export async function sendScreeningSMSWithStorage(screening, message, type = 'screening', preferDirect = true) {
  try {
    console.log('[Enhanced SMS] Sending screening SMS with storage for:', screening.beneficiary_name);

    // Send SMS to beneficiary
    const phoneNumber = screening.phone_number || screening.beneficiary_phone;
    const smsResult = await sendSmartSMS(phoneNumber, message, preferDirect);

    // Store SMS data in screening table
    const storageResult = await storeSMSInScreening(
      screening,
      message,
      { success: smsResult, error: smsResult ? null : 'SMS sending failed' },
      type
    );

    return {
      smsSuccess: smsResult,
      storageSuccess: storageResult.success,
      storageError: storageResult.error,
      screening: screening,
      message: message,
      type: type
    };

  } catch (error) {
    console.error('[Enhanced SMS] Screening SMS error:', error);
    return {
      smsSuccess: false,
      storageSuccess: false,
      storageError: error.message,
      screening: screening,
      message: message,
      type: type,
      error: error.message
    };
  }
}

/**
 * Send bulk SMS with storage
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @param {string} message - SMS message
 * @param {string} type - SMS type
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Complete results with storage info
 */
export async function sendBulkSMSWithStorage(beneficiaries, message, type = 'bulk', preferDirect = true) {
  try {
    console.log('[Enhanced SMS] Sending bulk SMS with storage for', beneficiaries.length, 'beneficiaries');

    const smsResults = [];
    const storageResults = [];

    // Send SMS to each beneficiary
    for (const beneficiary of beneficiaries) {
      try {
        const result = await sendSMSWithStorage(beneficiary, message, type, preferDirect);
        smsResults.push(result);
        storageResults.push(...result.storageResults);
      } catch (error) {
        console.error('[Enhanced SMS] Error for beneficiary:', beneficiary.name, error);
        smsResults.push({
          smsResult: { success: false, results: [] },
          storageResults: [],
          error: error.message
        });
      }
    }

    // Store bulk SMS data
    const bulkStorageResult = await storeBulkSMSData(beneficiaries, message, smsResults, type);

    return {
      smsResults: smsResults,
      storageResults: storageResults,
      bulkStorageResult: bulkStorageResult,
      summary: {
        totalBeneficiaries: beneficiaries.length,
        successfulSMS: smsResults.filter(r => r.smsResult.success).length,
        successfulStorage: storageResults.filter(r => r.storageSuccess).length,
        bulkStorageSuccess: bulkStorageResult.success
      }
    };

  } catch (error) {
    console.error('[Enhanced SMS] Bulk SMS error:', error);
    return {
      smsResults: [],
      storageResults: [],
      bulkStorageResult: { success: false, error: error.message },
      summary: {
        totalBeneficiaries: beneficiaries.length,
        successfulSMS: 0,
        successfulStorage: 0,
        bulkStorageSuccess: false
      },
      error: error.message
    };
  }
}

/**
 * Get SMS history for a beneficiary
 * @param {string} beneficiaryId - Beneficiary ID
 * @returns {Promise<Array>} - SMS history
 */
export async function getBeneficiarySMSHistory(beneficiaryId) {
  try {
    return await getBeneficiarySMSHistory(beneficiaryId);
  } catch (error) {
    console.error('[Enhanced SMS] Error getting SMS history:', error);
    return [];
  }
}

/**
 * Get SMS statistics
 * @returns {Promise<object>} - SMS statistics
 */
export async function getSMSStatistics() {
  try {
    return await getSMSStatistics();
  } catch (error) {
    console.error('[Enhanced SMS] Error getting SMS statistics:', error);
    return {
      total_sms_sent: 0,
      successful_sms: 0,
      failed_sms: 0,
      beneficiaries_contacted: 0,
      last_sms_date: null
    };
  }
}

/**
 * Send registration SMS with storage
 * @param {object} beneficiary - New beneficiary
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Results
 */
export async function sendRegistrationSMSWithStorage(beneficiary, preferDirect = true) {
  const message = `Hello ${beneficiary.name}, your registration with Animia is successful. Your ID: ${beneficiary.short_id || 'N/A'}. Thank you for joining our health program.`;
  
  return await sendSMSWithStorage(beneficiary, message, 'registration', preferDirect);
}

/**
 * Send follow-up SMS with storage
 * @param {object} beneficiary - Beneficiary
 * @param {object} followUp - Follow-up data
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Results
 */
export async function sendFollowUpSMSWithStorage(beneficiary, followUp, preferDirect = true) {
  const message = `Hello ${beneficiary.name}, this is a reminder for your follow-up appointment on ${followUp.date}. Please contact us to schedule.`;
  
  return await sendSMSWithStorage(beneficiary, message, 'follow_up', preferDirect);
}

/**
 * Send screening reminder SMS with storage
 * @param {object} screening - Screening data
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Results
 */
export async function sendScreeningReminderSMSWithStorage(screening, preferDirect = true) {
  const message = `Hello ${screening.beneficiary_name}, this is a reminder for your health screening on ${screening.screening_date}. Please visit us for your scheduled screening.`;
  
  return await sendScreeningSMSWithStorage(screening, message, 'screening_reminder', preferDirect);
}
