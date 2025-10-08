import { NativeModules, Platform } from 'react-native';

const { SMSModule } = NativeModules;

/**
 * Native Android SMS Module
 * Uses custom native module for direct SMS sending
 */
class NativeSMS {
  /**
   * Send SMS using native Android module
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message content
   * @returns {Promise<boolean>} - Success status
   */
  async sendSMS(phoneNumber, message) {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Native SMS is only available on Android');
      }

      if (!SMSModule) {
        throw new Error('SMSModule not available. Make sure native module is properly linked.');
      }

      console.log('[Native SMS] Sending SMS to:', phoneNumber);
      console.log('[Native SMS] Message:', message);

      const result = await SMSModule.sendSMS(phoneNumber, message);
      
      if (result.success) {
        console.log('[Native SMS] SMS sent successfully');
        return true;
      } else {
        console.log('[Native SMS] SMS sending failed:', result.message);
        return false;
      }
    } catch (error) {
      console.error('[Native SMS] Error:', error);
      throw error;
    }
  }

  /**
   * Check SMS permission
   * @returns {Promise<boolean>} - Permission status
   */
  async checkPermission() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      if (!SMSModule) {
        return false;
      }

      const result = await SMSModule.checkSMSPermission();
      return result.hasPermission;
    } catch (error) {
      console.error('[Native SMS] Permission check error:', error);
      return false;
    }
  }

  /**
   * Check if native SMS is available
   * @returns {boolean} - Availability status
   */
  isAvailable() {
    return Platform.OS === 'android' && SMSModule !== undefined;
  }
}

// Create singleton instance
const nativeSMS = new NativeSMS();

export default nativeSMS;
