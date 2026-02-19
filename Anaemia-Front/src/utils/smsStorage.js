import { API } from './api';

export async function storeSMSInBeneficiary(beneficiary, message, smsResult, type = 'general') {
  try {
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
      created_by: 'system', 
      updated_at: new Date().toISOString(),
      
      delivery_verified: false,
      delivery_timestamp: null,
      delivery_status: 'pending', 
      verification_notes: 'SMS sent via native module - delivery verification pending'
    };

    const result = await API.storeBeneficiarySMS(smsData);
    
    if (result.success) {
      } else {
      }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function storeSMSInScreening(screening, message, smsResult, type = 'screening') {
  try {
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

    const result = await API.storeScreeningSMS(smsData);
    
    if (result.success) {
      } else {
      }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function storeBulkSMSData(beneficiaries, message, smsResults, type = 'bulk') {
  try {
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

    const result = await API.storeBulkSMS(bulkSMSData);
    
    if (result.success) {
      } else {
      }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getBeneficiarySMSHistory(beneficiaryId) {
  try {
    const result = await API.getBeneficiarySMSHistory(beneficiaryId);
    return result.success ? result.data : [];
  } catch (error) {
    return [];
  }
}

export async function getScreeningSMSHistory(screeningId) {
  try {
    const result = await API.getScreeningSMSHistory(screeningId);
    return result.success ? result.data : [];
  } catch (error) {
    return [];
  }
}

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
    return {
      total_sms_sent: 0,
      successful_sms: 0,
      failed_sms: 0,
      beneficiaries_contacted: 0,
      last_sms_date: null
    };
  }
}

export async function updateSMSStatus(smsId, status, errorMessage = null) {
  try {
    const result = await API.updateSMSStatus(smsId, status, errorMessage);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}
