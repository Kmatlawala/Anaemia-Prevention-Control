import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  sendSmartSMS,
  sendSmartBulkSMS,
  formatPhoneNumber,
  isValidPhoneNumber,
} from '../utils/sms';

/**
 * SMS Component for sending SMS messages
 * Supports both single and bulk SMS sending
 */
const SMSComponent = ({
  beneficiaries = [],
  onSMSComplete = () => {},
  style = {},
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendMethod, setSendMethod] = useState('direct'); // 'direct' or 'app'

  /**
   * Send single SMS
   */
  const handleSendSMS = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      Alert.alert('Error', 'Please enter phone number and message');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      const success = await sendSmartSMS(
        formattedNumber,
        message,
        sendMethod === 'direct',
      );

      if (success) {
        console.log('[SMSComponent] SMS sent successfully!');
        setPhoneNumber('');
        setMessage('');
        onSMSComplete({
          type: 'single',
          phoneNumber: formattedNumber,
          success: true,
        });
      } else {
        console.error('[SMSComponent] Failed to send SMS');
        onSMSComplete({
          type: 'single',
          phoneNumber: formattedNumber,
          success: false,
        });
      }
    } catch (error) {
      console.error('SMS send error:', error);
      console.error('[SMSComponent] Failed to send SMS:', error.message);
      onSMSComplete({type: 'single', phoneNumber: phoneNumber, success: false});
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send bulk SMS to all beneficiaries
   */
  const handleSendBulkSMS = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (beneficiaries.length === 0) {
      Alert.alert('Error', 'No beneficiaries found');
      return;
    }

    setIsLoading(true);
    try {
      const success = await sendSmartBulkSMS(
        beneficiaries
          .map(b => b.phone)
          .filter(phone => phone && isValidPhoneNumber(phone)),
        message,
        sendMethod === 'direct',
      );

      if (success) {
        onSMSComplete({
          type: 'bulk',
          beneficiaries: beneficiaries.length,
          success: true,
        });
      } else {
        onSMSComplete({
          type: 'bulk',
          beneficiaries: beneficiaries.length,
          success: false,
        });
      }
    } catch (error) {
      console.error('Bulk SMS send error:', error);
      console.error('[SMSComponent] Failed to send bulk SMS:', error.message);
      onSMSComplete({
        type: 'bulk',
        beneficiaries: beneficiaries.length,
        success: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Send SMS</Text>

      {/* Send Method Selection */}
      <View style={styles.methodContainer}>
        <Text style={styles.label}>Send Method:</Text>
        <View style={styles.methodButtons}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              sendMethod === 'direct' && styles.methodButtonActive,
            ]}
            onPress={() => setSendMethod('direct')}>
            <Text
              style={[
                styles.methodButtonText,
                sendMethod === 'direct' && styles.methodButtonTextActive,
              ]}>
              Direct SMS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton,
              sendMethod === 'app' && styles.methodButtonActive,
            ]}
            onPress={() => setSendMethod('app')}>
            <Text
              style={[
                styles.methodButtonText,
                sendMethod === 'app' && styles.methodButtonTextActive,
              ]}>
              SMS App
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Phone Number Input (for single SMS) */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number:</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter phone number (e.g., 9876543210)"
          keyboardType="phone-pad"
          editable={!isLoading}
        />
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Message:</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter your message..."
          multiline
          numberOfLines={4}
          editable={!isLoading}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.sendButton]}
          onPress={handleSendSMS}
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send SMS'}
          </Text>
        </TouchableOpacity>

        {beneficiaries.length > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.bulkButton]}
            onPress={handleSendBulkSMS}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading
                ? 'Sending...'
                : `Send to All (${beneficiaries.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Text */}
      <Text style={styles.infoText}>
        {sendMethod === 'direct'
          ? 'Direct SMS: Sends SMS directly without opening SMS app (Android only)'
          : 'SMS App: Opens device SMS app with pre-filled message'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  methodContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#007AFF',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  bulkButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default SMSComponent;
