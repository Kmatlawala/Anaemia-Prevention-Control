const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Mock device data - replace with actual database
let devices = [
  {
    id: 'device_1',
    name: 'Primary Device',
    type: 'android',
    status: 'online',
    lastSeen: new Date().toISOString(),
    smsCount: 0,
    capabilities: ['sms', 'calls']
  },
  {
    id: 'device_2', 
    name: 'Secondary Device',
    type: 'android',
    status: 'online',
    lastSeen: new Date().toISOString(),
    smsCount: 0,
    capabilities: ['sms', 'calls']
  },
  {
    id: 'device_3',
    name: 'Backup Device', 
    type: 'android',
    status: 'offline',
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    smsCount: 0,
    capabilities: ['sms', 'calls']
  }
];

// SMS history storage
let smsHistory = [];

/**
 * Get all available devices
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    console.log('[Devices API] Getting all devices');
    res.json({
      success: true,
      devices: devices,
      count: devices.length
    });
  } catch (error) {
    console.error('[Devices API] Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get devices',
      message: error.message
    });
  }
});

/**
 * Get specific device
 */
router.get('/:deviceId', authenticateToken, (req, res) => {
  try {
    const { deviceId } = req.params;
    console.log('[Devices API] Getting device:', deviceId);
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }
    
    res.json({
      success: true,
      device: device
    });
  } catch (error) {
    console.error('[Devices API] Error getting device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get device',
      message: error.message
    });
  }
});

/**
 * Send SMS to specific device
 */
router.post('/:deviceId/sms', authenticateToken, (req, res) => {
  try {
    const { deviceId } = req.params;
    const { phoneNumber, message, timestamp } = req.body;
    
    console.log(`[Devices API] Sending SMS to device ${deviceId}:`, phoneNumber);
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }
    
    if (device.status !== 'online') {
      return res.status(400).json({
        success: false,
        error: 'Device is offline',
        device: device
      });
    }
    
    // Simulate SMS sending
    const smsResult = {
      id: `sms_${Date.now()}_${deviceId}`,
      deviceId: deviceId,
      phoneNumber: phoneNumber,
      message: message,
      timestamp: timestamp || new Date().toISOString(),
      status: 'sent', // or 'failed'
      error: null
    };
    
    // Update device SMS count
    device.smsCount++;
    device.lastSeen = new Date().toISOString();
    
    // Store SMS history
    smsHistory.push(smsResult);
    
    console.log(`[Devices API] SMS sent successfully to device ${deviceId}`);
    
    res.json({
      success: true,
      smsResult: smsResult,
      device: device
    });
  } catch (error) {
    console.error('[Devices API] Error sending SMS to device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS to device',
      message: error.message
    });
  }
});

/**
 * Get SMS status for specific device
 */
router.get('/:deviceId/sms/status', authenticateToken, (req, res) => {
  try {
    const { deviceId } = req.params;
    console.log('[Devices API] Getting SMS status for device:', deviceId);
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }
    
    const deviceSMSHistory = smsHistory.filter(sms => sms.deviceId === deviceId);
    const lastSMS = deviceSMSHistory.length > 0 ? deviceSMSHistory[deviceSMSHistory.length - 1] : null;
    
    res.json({
      success: true,
      status: {
        online: device.status === 'online',
        lastSMS: lastSMS ? lastSMS.timestamp : null,
        smsCount: device.smsCount,
        totalSMS: deviceSMSHistory.length,
        successfulSMS: deviceSMSHistory.filter(sms => sms.status === 'sent').length,
        failedSMS: deviceSMSHistory.filter(sms => sms.status === 'failed').length
      }
    });
  } catch (error) {
    console.error('[Devices API] Error getting SMS status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SMS status',
      message: error.message
    });
  }
});

/**
 * Get SMS status for all devices
 */
router.get('/sms/status', authenticateToken, (req, res) => {
  try {
    console.log('[Devices API] Getting SMS status for all devices');
    
    const devicesStatus = devices.map(device => {
      const deviceSMSHistory = smsHistory.filter(sms => sms.deviceId === device.id);
      const lastSMS = deviceSMSHistory.length > 0 ? deviceSMSHistory[deviceSMSHistory.length - 1] : null;
      
      return {
        device: device,
        status: {
          online: device.status === 'online',
          lastSMS: lastSMS ? lastSMS.timestamp : null,
          smsCount: device.smsCount,
          totalSMS: deviceSMSHistory.length,
          successfulSMS: deviceSMSHistory.filter(sms => sms.status === 'sent').length,
          failedSMS: deviceSMSHistory.filter(sms => sms.status === 'failed').length
        }
      };
    });
    
    const summary = {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      totalSMS: smsHistory.length,
      successfulSMS: smsHistory.filter(sms => sms.status === 'sent').length,
      failedSMS: smsHistory.filter(sms => sms.status === 'failed').length
    };
    
    res.json({
      success: true,
      devices: devicesStatus,
      summary: summary
    });
  } catch (error) {
    console.error('[Devices API] Error getting all devices SMS status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get devices SMS status',
      message: error.message
    });
  }
});

/**
 * Get SMS history for specific device
 */
router.get('/:deviceId/sms/history', authenticateToken, (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log('[Devices API] Getting SMS history for device:', deviceId);
    
    const deviceSMSHistory = smsHistory
      .filter(sms => sms.deviceId === deviceId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      history: deviceSMSHistory,
      count: deviceSMSHistory.length,
      total: smsHistory.filter(sms => sms.deviceId === deviceId).length
    });
  } catch (error) {
    console.error('[Devices API] Error getting SMS history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SMS history',
      message: error.message
    });
  }
});

/**
 * Update device status
 */
router.put('/:deviceId/status', authenticateToken, (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status, lastSeen } = req.body;
    
    console.log(`[Devices API] Updating device ${deviceId} status:`, status);
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }
    
    device.status = status;
    if (lastSeen) {
      device.lastSeen = lastSeen;
    }
    
    res.json({
      success: true,
      device: device
    });
  } catch (error) {
    console.error('[Devices API] Error updating device status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device status',
      message: error.message
    });
  }
});

/**
 * Register new device
 */
router.post('/register', authenticateToken, (req, res) => {
  try {
    const { name, type, capabilities } = req.body;
    
    console.log('[Devices API] Registering new device:', name);
    
    const newDevice = {
      id: `device_${Date.now()}`,
      name: name,
      type: type || 'android',
      status: 'online',
      lastSeen: new Date().toISOString(),
      smsCount: 0,
      capabilities: capabilities || ['sms', 'calls']
    };
    
    devices.push(newDevice);
    
    res.json({
      success: true,
      device: newDevice
    });
  } catch (error) {
    console.error('[Devices API] Error registering device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device',
      message: error.message
    });
  }
});

module.exports = router;
