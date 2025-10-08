import { sendSmartSMS, sendSMSToBeneficiaryContacts } from './sms';
import { API } from './api';

/**
 * Multi-Device SMS Service
 * Handles SMS sending across multiple devices
 */

/**
 * Get available devices for SMS sending
 * @returns {Promise<Array>} - List of available devices
 */
export async function getAvailableDevices() {
  try {
    const devices = await API.getDevices();
    return devices || [];
  } catch (error) {
    console.error('[Multi-Device SMS] Error getting devices:', error);
    return [];
  }
}

/**
 * Send SMS to specific device
 * @param {string} deviceId - Target device ID
 * @param {string} phoneNumber - Phone number
 * @param {string} message - SMS message
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMSToDevice(deviceId, phoneNumber, message) {
  try {
    console.log(`[Multi-Device SMS] Sending SMS to device ${deviceId}:`, phoneNumber);
    
    // Send SMS to specific device via API
    const result = await API.sendSMSToDevice(deviceId, {
      phoneNumber: phoneNumber,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    if (result.success) {
      console.log(`[Multi-Device SMS] SMS sent successfully to device ${deviceId}`);
      return true;
    } else {
      console.log(`[Multi-Device SMS] Failed to send SMS to device ${deviceId}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`[Multi-Device SMS] Error sending SMS to device ${deviceId}:`, error);
    return false;
  }
}

/**
 * Send SMS to all available devices
 * @param {string} phoneNumber - Phone number
 * @param {string} message - SMS message
 * @returns {Promise<object>} - Results for each device
 */
export async function sendSMSToAllDevices(phoneNumber, message) {
  try {
    console.log('[Multi-Device SMS] Sending SMS to all devices:', phoneNumber);
    
    const devices = await getAvailableDevices();
    const results = [];
    
    for (const device of devices) {
      try {
        const success = await sendSMSToDevice(device.id, phoneNumber, message);
        results.push({
          deviceId: device.id,
          deviceName: device.name,
          success: success,
          error: success ? null : 'SMS sending failed'
        });
        
        // Small delay between devices
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Multi-Device SMS] Error for device ${device.id}:`, error);
        results.push({
          deviceId: device.id,
          deviceName: device.name,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`[Multi-Device SMS] Sent to ${successCount}/${totalCount} devices`);
    
    return {
      success: successCount > 0,
      results: results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    };
  } catch (error) {
    console.error('[Multi-Device SMS] Error sending to all devices:', error);
    return {
      success: false,
      results: [],
      summary: { total: 0, successful: 0, failed: 0 },
      error: error.message
    };
  }
}

/**
 * Send SMS to beneficiary contacts across all devices
 * @param {object} beneficiary - Beneficiary object
 * @param {string} message - SMS message
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Results for each device and contact
 */
export async function sendBeneficiarySMSToAllDevices(beneficiary, message, preferDirect = true) {
  try {
    console.log(`[Multi-Device SMS] Sending beneficiary SMS to all devices for: ${beneficiary.name}`);
    
    const devices = await getAvailableDevices();
    const allResults = [];
    
    // Get all contacts for the beneficiary
    const contacts = [];
    if (beneficiary.phone) contacts.push({ type: 'Primary', number: beneficiary.phone });
    if (beneficiary.alt_phone) contacts.push({ type: 'Alternative', number: beneficiary.alt_phone });
    if (beneficiary.doctor_phone) contacts.push({ type: 'Doctor', number: beneficiary.doctor_phone });
    
    for (const device of devices) {
      const deviceResults = [];
      
      for (const contact of contacts) {
        try {
          const personalizedMessage = `Hello ${beneficiary.name} (${contact.type}),\n\n${message}`;
          
          const success = await sendSMSToDevice(device.id, contact.number, personalizedMessage);
          
          deviceResults.push({
            contact: contact,
            success: success,
            deviceId: device.id,
            deviceName: device.name
          });
          
          console.log(`[Multi-Device SMS] ${contact.type} (${contact.number}) on ${device.name}: ${success ? 'Success' : 'Failed'}`);
          
          // Small delay between contacts
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[Multi-Device SMS] Error for ${contact.type} on ${device.name}:`, error);
          deviceResults.push({
            contact: contact,
            success: false,
            error: error.message,
            deviceId: device.id,
            deviceName: device.name
          });
        }
      }
      
      allResults.push({
        device: device,
        results: deviceResults,
        summary: {
          total: deviceResults.length,
          successful: deviceResults.filter(r => r.success).length,
          failed: deviceResults.filter(r => !r.success).length
        }
      });
    }
    
    return {
      beneficiary: beneficiary,
      message: message,
      deviceResults: allResults,
      overallSummary: {
        totalDevices: devices.length,
        totalContacts: contacts.length,
        totalAttempts: allResults.reduce((sum, dr) => sum + dr.results.length, 0),
        successfulAttempts: allResults.reduce((sum, dr) => sum + dr.summary.successful, 0),
        failedAttempts: allResults.reduce((sum, dr) => sum + dr.summary.failed, 0)
      }
    };
  } catch (error) {
    console.error('[Multi-Device SMS] Error sending beneficiary SMS to all devices:', error);
    return {
      beneficiary: beneficiary,
      message: message,
      deviceResults: [],
      overallSummary: { totalDevices: 0, totalContacts: 0, totalAttempts: 0, successfulAttempts: 0, failedAttempts: 0 },
      error: error.message
    };
  }
}

/**
 * Send bulk SMS to all devices
 * @param {Array} beneficiaries - Array of beneficiary objects
 * @param {string} message - SMS message
 * @param {boolean} preferDirect - Whether to prefer direct SMS
 * @returns {Promise<object>} - Results for all devices and beneficiaries
 */
export async function sendBulkSMSToAllDevices(beneficiaries, message, preferDirect = true) {
  try {
    console.log(`[Multi-Device SMS] Sending bulk SMS to all devices for ${beneficiaries.length} beneficiaries`);
    
    const devices = await getAvailableDevices();
    const allResults = [];
    
    for (const device of devices) {
      const deviceResults = [];
      
      for (const beneficiary of beneficiaries) {
        try {
          const result = await sendBeneficiarySMSToAllDevices(beneficiary, message, preferDirect);
          deviceResults.push(result);
          
          // Small delay between beneficiaries
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[Multi-Device SMS] Error for beneficiary ${beneficiary.name} on device ${device.id}:`, error);
          deviceResults.push({
            beneficiary: beneficiary,
            success: false,
            error: error.message,
            deviceId: device.id
          });
        }
      }
      
      allResults.push({
        device: device,
        results: deviceResults,
        summary: {
          totalBeneficiaries: beneficiaries.length,
          successfulBeneficiaries: deviceResults.filter(r => r.success).length,
          failedBeneficiaries: deviceResults.filter(r => !r.success).length
        }
      });
    }
    
    return {
      beneficiaries: beneficiaries,
      message: message,
      deviceResults: allResults,
      overallSummary: {
        totalDevices: devices.length,
        totalBeneficiaries: beneficiaries.length,
        totalAttempts: allResults.reduce((sum, dr) => sum + dr.results.length, 0),
        successfulAttempts: allResults.reduce((sum, dr) => sum + dr.summary.successfulBeneficiaries, 0),
        failedAttempts: allResults.reduce((sum, dr) => sum + dr.summary.failedBeneficiaries, 0)
      }
    };
  } catch (error) {
    console.error('[Multi-Device SMS] Error sending bulk SMS to all devices:', error);
    return {
      beneficiaries: beneficiaries,
      message: message,
      deviceResults: [],
      overallSummary: { totalDevices: 0, totalBeneficiaries: 0, totalAttempts: 0, successfulAttempts: 0, failedAttempts: 0 },
      error: error.message
    };
  }
}

/**
 * Get SMS status for all devices
 * @returns {Promise<object>} - Status of all devices
 */
export async function getDevicesSMSStatus() {
  try {
    const devices = await getAvailableDevices();
    const statusResults = [];
    
    for (const device of devices) {
      try {
        const status = await API.getDeviceSMSStatus(device.id);
        statusResults.push({
          device: device,
          status: status,
          online: status.online || false,
          lastSMS: status.lastSMS || null,
          smsCount: status.smsCount || 0
        });
      } catch (error) {
        console.error(`[Multi-Device SMS] Error getting status for device ${device.id}:`, error);
        statusResults.push({
          device: device,
          status: null,
          online: false,
          lastSMS: null,
          smsCount: 0,
          error: error.message
        });
      }
    }
    
    return {
      devices: statusResults,
      summary: {
        total: devices.length,
        online: statusResults.filter(d => d.online).length,
        offline: statusResults.filter(d => !d.online).length,
        totalSMS: statusResults.reduce((sum, d) => sum + d.smsCount, 0)
      }
    };
  } catch (error) {
    console.error('[Multi-Device SMS] Error getting devices SMS status:', error);
    return {
      devices: [],
      summary: { total: 0, online: 0, offline: 0, totalSMS: 0 },
      error: error.message
    };
  }
}
