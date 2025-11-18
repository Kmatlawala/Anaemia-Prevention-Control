import { NativeModules, Platform } from 'react-native';

const { SMSModule } = NativeModules;

class NativeSMS {
  
  async sendSMS(phoneNumber, message) {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Native SMS is only available on Android');
      }

      if (!SMSModule) {
        throw new Error('SMSModule not available. Make sure native module is properly linked.');
      }

      const result = await SMSModule.sendSMS(phoneNumber, message);
      
      if (result.success) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

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
      return false;
    }
  }

  isAvailable() {
    return Platform.OS === 'android' && SMSModule !== undefined;
  }
}

const nativeSMS = new NativeSMS();

export default nativeSMS;
