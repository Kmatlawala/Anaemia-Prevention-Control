import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { 
  sendSmartSMS, 
  sendDirectSMSNative, 
  sendSMS, 
  sendSmartBulkSMS,
  formatPhoneNumber,
  isValidPhoneNumber 
} from '../utils/sms';
import SMSComponent from '../components/SMSComponent';

/**
 * Example usage of SMS functionality
 * This file demonstrates how to use different SMS methods
 */
const SMSExample = () => {
  const [exampleBeneficiaries] = useState([
    { name: 'John Doe', phone: '9876543210' },
    { name: 'Jane Smith', phone: '9876543211' },
    { name: 'Bob Johnson', phone: '9876543212' },
  ]);

  /**
   * Example 1: Send single SMS using smart method
   */
  const handleSmartSMS = async () => {
    try {
      const phoneNumber = '9876543210';
      const message = 'Hello! This is a test message from Animia.';
      
      const success = await sendSmartSMS(phoneNumber, message, true); // preferDirect = true
      
      if (success) {
        Alert.alert('Success', 'SMS sent successfully using smart method!');
      } else {
        Alert.alert('Error', 'Failed to send SMS');
      }
    } catch (error) {
      Alert.alert('Error', 'SMS error: ' + error.message);
    }
  };

  /**
   * Example 2: Send SMS using direct method only
   */
  const handleDirectSMS = async () => {
    try {
      const phoneNumber = '9876543210';
      const message = 'Hello! This is a direct SMS from Animia.';
      
      const success = await sendDirectSMSNative(phoneNumber, message);
      
      if (success) {
        Alert.alert('Success', 'Direct SMS sent successfully!');
      } else {
        Alert.alert('Error', 'Failed to send direct SMS');
      }
    } catch (error) {
      Alert.alert('Error', 'Direct SMS error: ' + error.message);
    }
  };

  /**
   * Example 3: Send SMS using SMS app method only
   */
  const handleSMSApp = async () => {
    try {
      const phoneNumber = '9876543210';
      const message = 'Hello! This will open SMS app.';
      
      const success = await sendSMS(phoneNumber, message);
      
      if (success) {
        Alert.alert('Success', 'SMS app opened successfully!');
      } else {
        Alert.alert('Error', 'Failed to open SMS app');
      }
    } catch (error) {
      Alert.alert('Error', 'SMS app error: ' + error.message);
    }
  };

  /**
   * Example 4: Send bulk SMS
   */
  const handleBulkSMS = async () => {
    try {
      const phoneNumbers = ['9876543210', '9876543211', '9876543212'];
      const message = 'Hello! This is a bulk message from Animia.';
      
      const success = await sendSmartBulkSMS(phoneNumbers, message, true);
      
      if (success) {
        Alert.alert('Success', 'Bulk SMS initiated!');
      } else {
        Alert.alert('Error', 'Failed to initiate bulk SMS');
      }
    } catch (error) {
      Alert.alert('Error', 'Bulk SMS error: ' + error.message);
    }
  };

  /**
   * Example 5: Phone number validation
   */
  const handlePhoneValidation = () => {
    const testNumbers = [
      '9876543210',
      '+919876543210',
      '919876543210',
      '123', // invalid
      'abc', // invalid
    ];

    testNumbers.forEach(number => {
      const isValid = isValidPhoneNumber(number);
      const formatted = formatPhoneNumber(number);
      console.log(`Number: ${number} | Valid: ${isValid} | Formatted: ${formatted}`);
    });

    Alert.alert('Phone Validation', 'Check console for validation results');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Examples</Text>
      
      {/* Example Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleSmartSMS}>
          <Text style={styles.buttonText}>Smart SMS (Auto Method)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleDirectSMS}>
          <Text style={styles.buttonText}>Direct SMS Only</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSMSApp}>
          <Text style={styles.buttonText}>SMS App Only</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleBulkSMS}>
          <Text style={styles.buttonText}>Bulk SMS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handlePhoneValidation}>
          <Text style={styles.buttonText}>Phone Validation Test</Text>
        </TouchableOpacity>
      </View>

      {/* SMS Component */}
      <SMSComponent 
        beneficiaries={exampleBeneficiaries}
        onSMSComplete={(result) => {
          console.log('SMS Complete:', result);
          Alert.alert('SMS Complete', `Type: ${result.type}, Success: ${result.success}`);
        }}
        style={styles.smsComponent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  smsComponent: {
    marginTop: 20,
  },
});

export default SMSExample;
