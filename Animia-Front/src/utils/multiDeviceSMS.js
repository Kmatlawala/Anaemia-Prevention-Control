import { sendSmartSMS, sendSMSToBeneficiaryContacts } from './sms';
import { API } from './api';

export async function getAvailableDevices() {
  try {
    const devices = await API.getDevices();
    return devices || [];
  } catch (error) {
    return [];
  }
}

export async function sendSMSToDevice(deviceId, phoneNumber, message) {
  try {
    
    const result = await API.sendSMSToDevice(deviceId, {
      phoneNumber: phoneNumber,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    if (result.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

export async function sendSMSToAllDevices(phoneNumber, message) {
  try {
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

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
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
    return {
      success: false,
      results: [],
      summary: { total: 0, successful: 0, failed: 0 },
      error: error.message
    };
  }
}

export async function sendBeneficiarySMSToAllDevices(beneficiary, message, preferDirect = true) {
  try {
    const devices = await getAvailableDevices();
    const allResults = [];

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
          
          on ${device.name}: ${success ? 'Success' : 'Failed'}`);

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
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
    return {
      beneficiary: beneficiary,
      message: message,
      deviceResults: [],
      overallSummary: { totalDevices: 0, totalContacts: 0, totalAttempts: 0, successfulAttempts: 0, failedAttempts: 0 },
      error: error.message
    };
  }
}

export async function sendBulkSMSToAllDevices(beneficiaries, message, preferDirect = true) {
  try {
    const devices = await getAvailableDevices();
    const allResults = [];
    
    for (const device of devices) {
      const deviceResults = [];
      
      for (const beneficiary of beneficiaries) {
        try {
          const result = await sendBeneficiarySMSToAllDevices(beneficiary, message, preferDirect);
          deviceResults.push(result);

          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
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
    return {
      beneficiaries: beneficiaries,
      message: message,
      deviceResults: [],
      overallSummary: { totalDevices: 0, totalBeneficiaries: 0, totalAttempts: 0, successfulAttempts: 0, failedAttempts: 0 },
      error: error.message
    };
  }
}

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
    return {
      devices: [],
      summary: { total: 0, online: 0, offline: 0, totalSMS: 0 },
      error: error.message
    };
  }
}
