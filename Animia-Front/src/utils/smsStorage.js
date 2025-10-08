import { API } from './api';

/**
 * SMS Storage Service
 * Handles storing SMS data in beneficiary and screening tables
 */

/**
 * Store SMS data in beneficiary table
 * @param {object} beneficiary - Beneficiary data
 * @param {string} message - SMS message sent
 * @param {object} smsResult - SMS sending result
 * @param {string} type - Type of SMS (registration, follow_up, screening, etc.)
 */
export async function storeSMSInBeneficiary(beneficiary, message, smsResult, type = 'general') {
  try {
    console.log('[SMS Storage] Storing SMS data for beneficiary:', beneficiary.id);

    const smsData = {
      beneficiary_id: beneficiary.id,
      beneficiary_name: beneficiary.name,
      phone_number: beneficiary.phone,
      message: message,
      sms_type: type,
      sent_at: new Date().toISOString(),
      status: smsResult.success ? 'sent' : 'failed',
      error_message: smsResult.error || null,
      contact_type: smsResult.contact_type || 'primary',
      created_by: 'system', // or current user ID
      updated_at: new Date().toISOString(),
      // Add delivery verification fields
      delivery_verified: false,
      delivery_timestamp: null,
      delivery_status: 'pending', // pending, delivered, failed
      verification_notes: 'SMS sent via native module - delivery verification pending'
    };

    // Store in beneficiary SMS history
    const result = await API.storeBeneficiarySMS(smsData);
    
    if (result.success) {
      console.log('[SMS Storage] SMS data stored successfully for beneficiary:', beneficiary.id);
    } else {
      console.error('[SMS Storage] Failed to store SMS data:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SMS Storage] Error storing SMS data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store SMS data in screening table
 * @param {object} screening - Screening data
 * @param {string} message - SMS message sent
 * @param {object} smsResult - SMS sending result
 * @param {string} type - Type of SMS (screening_reminder, results_ready, etc.)
 */
export async function storeSMSInScreening(screening, message, smsResult, type = 'screening') {
  try {
    console.log('[SMS Storage] Storing SMS data for screening:', screening.id);

    const smsData = {
      screening_id: screening.id,
      beneficiary_id: screening.beneficiary_id,
      beneficiary_name: screening.beneficiary_name,
      phone_number: screening.phone_number,
      message: message,
      sms_type: type,
      sent_at: new Date().toISOString(),
      status: smsResult.success ? 'sent' : 'failed',
      error_message: smsResult.error || null,
      screening_date: screening.screening_date,
      screening_type: screening.screening_type,
      created_by: 'system',
      updated_at: new Date().toISOString()
    };

    // Store in screening SMS history
    const result = await API.storeScreeningSMS(smsData);
    
    if (result.success) {
      console.log('[SMS Storage] SMS data stored successfully for screening:', screening.id);
    } else {
      console.error('[SMS Storage] Failed to store SMS data:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SMS Storage] Error storing SMS data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store bulk SMS data for multiple beneficiaries
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @param {string} message - SMS message sent
 * @param {Array} smsResults - Array of SMS results
 * @param {string} type - Type of SMS
 */
export async function storeBulkSMSData(beneficiaries, message, smsResults, type = 'bulk') {
  try {
    console.log('[SMS Storage] Storing bulk SMS data for', beneficiaries.length, 'beneficiaries');

    const bulkSMSData = {
      message: message,
      sms_type: type,
      sent_at: new Date().toISOString(),
      total_recipients: beneficiaries.length,
      successful_sends: smsResults.filter(r => r.success).length,
      failed_sends: smsResults.filter(r => !r.success).length,
      created_by: 'system',
      updated_at: new Date().toISOString(),
      details: smsResults.map((result, index) => ({
        beneficiary_id: beneficiaries[index]?.id,
        beneficiary_name: beneficiaries[index]?.name,
        phone_number: beneficiaries[index]?.phone,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        contact_type: result.contact_type || 'primary'
      }))
    };

    // Store bulk SMS data
    const result = await API.storeBulkSMS(bulkSMSData);
    
    if (result.success) {
      console.log('[SMS Storage] Bulk SMS data stored successfully');
    } else {
      console.error('[SMS Storage] Failed to store bulk SMS data:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SMS Storage] Error storing bulk SMS data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get SMS history for a beneficiary
 * @param {string} beneficiaryId - Beneficiary ID
 * @returns {Promise<Array>} - SMS history
 */
export async function getBeneficiarySMSHistory(beneficiaryId) {
  try {
    const result = await API.getBeneficiarySMSHistory(beneficiaryId);
    return result.success ? result.data : [];
  } catch (error) {
    console.error('[SMS Storage] Error getting SMS history:', error);
    return [];
  }
}

/**
 * Get SMS history for a screening
 * @param {string} screeningId - Screening ID
 * @returns {Promise<Array>} - SMS history
 */
export async function getScreeningSMSHistory(screeningId) {
  try {
    const result = await API.getScreeningSMSHistory(screeningId);
    return result.success ? result.data : [];
  } catch (error) {
    console.error('[SMS Storage] Error getting screening SMS history:', error);
    return [];
  }
}

/**
 * Get SMS statistics
 * @returns {Promise<object>} - SMS statistics
 */
export async function getSMSStatistics() {
  try {
    const result = await API.getSMSStatistics();
    return result.success ? result.data : {
      total_sms_sent: 0,
      successful_sms: 0,
      failed_sms: 0,
      beneficiaries_contacted: 0,
      last_sms_date: null
    };
  } catch (error) {
    console.error('[SMS Storage] Error getting SMS statistics:', error);
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
 * Update SMS status (for delivery reports)
 * @param {string} smsId - SMS ID
 * @param {string} status - New status (delivered, failed, etc.)
 * @param {string} errorMessage - Error message if failed
 */
export async function updateSMSStatus(smsId, status, errorMessage = null) {
  try {
    const result = await API.updateSMSStatus(smsId, status, errorMessage);
    return result;
  } catch (error) {
    console.error('[SMS Storage] Error updating SMS status:', error);
    return { success: false, error: error.message };
  }
}
