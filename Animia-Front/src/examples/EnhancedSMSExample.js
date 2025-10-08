import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import EnhancedSMSComponent from '../components/EnhancedSMSComponent';
import { sendSMSWithStorage, sendBulkSMSWithStorage } from '../utils/enhancedSMS';

/**
 * Enhanced SMS Example
 * Demonstrates SMS functionality with data storage
 */
const EnhancedSMSExample = () => {
  const [exampleBeneficiaries] = useState([
    {
      id: '1',
      name: 'John Doe',
      phone: '9876543210',
      alt_phone: '9876543211',
      doctor_phone: '9876543212',
      short_id: 'ANM001'
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '9876543213',
      alt_phone: '9876543214',
      doctor_phone: '9876543215',
      short_id: 'ANM002'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      phone: '9876543216',
      alt_phone: '9876543217',
      doctor_phone: '9876543218',
      short_id: 'ANM003'
    }
  ]);

  const [exampleScreenings] = useState([
    {
      id: '1',
      beneficiary_id: '1',
      beneficiary_name: 'John Doe',
      phone_number: '9876543210',
      screening_date: '2024-01-15',
      screening_type: 'General Health Check'
    },
    {
      id: '2',
      beneficiary_id: '2',
      beneficiary_name: 'Jane Smith',
      phone_number: '9876543213',
      screening_date: '2024-01-16',
      screening_type: 'Blood Pressure Check'
    }
  ]);

  const handleSMSComplete = (result) => {
    console.log('SMS Complete:', result);
    Alert.alert(
      'SMS Complete',
      `Type: ${result.type}\nBeneficiary: ${result.beneficiary || 'Multiple'}\nCount: ${result.count || 1}`,
      [{ text: 'OK' }]
    );
  };

  const handleTestSingleBeneficiary = async () => {
    try {
      const beneficiary = exampleBeneficiaries[0];
      const message = 'Hello! This is a test message from Animia Enhanced SMS system.';
      
      console.log('Testing single beneficiary SMS with storage...');
      const result = await sendSMSWithStorage(beneficiary, message, 'test', true);
      
      Alert.alert(
        'Single Beneficiary SMS',
        `Sent to ${result.summary.successfulSMS}/${result.summary.totalContacts} contacts\n` +
        `Storage: ${result.summary.successfulStorage} successful`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Single beneficiary SMS error:', error);
      Alert.alert('Error', 'Single beneficiary SMS failed: ' + error.message);
    }
  };

  const handleTestBulkSMS = async () => {
    try {
      const message = 'Hello! This is a bulk test message from Animia Enhanced SMS system.';
      
      console.log('Testing bulk SMS with storage...');
      const result = await sendBulkSMSWithStorage(exampleBeneficiaries, message, 'bulk_test', true);
      
      Alert.alert(
        'Bulk SMS Test',
        `Sent to ${result.summary.successfulSMS}/${result.summary.totalBeneficiaries} beneficiaries\n` +
        `Storage: ${result.summary.successfulStorage} successful\n` +
        `Bulk Storage: ${result.summary.bulkStorageSuccess ? 'Success' : 'Failed'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Bulk SMS error:', error);
      Alert.alert('Error', 'Bulk SMS failed: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enhanced SMS Example</Text>
      
      {/* Test Buttons */}
      <View style={styles.testContainer}>
        <TouchableOpacity style={styles.testButton} onPress={handleTestSingleBeneficiary}>
          <Text style={styles.testButtonText}>Test Single Beneficiary SMS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={handleTestBulkSMS}>
          <Text style={styles.testButtonText}>Test Bulk SMS</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced SMS Component */}
      <EnhancedSMSComponent 
        beneficiaries={exampleBeneficiaries}
        onSMSComplete={handleSMSComplete}
        style={styles.smsComponent}
      />

      {/* Example Data Display */}
      <View style={styles.dataContainer}>
        <Text style={styles.dataTitle}>Example Beneficiaries:</Text>
        {exampleBeneficiaries.map((beneficiary, index) => (
          <View key={beneficiary.id} style={styles.beneficiaryItem}>
            <Text style={styles.beneficiaryText}>
              {index + 1}. {beneficiary.name} (ID: {beneficiary.short_id})
            </Text>
            <Text style={styles.phoneText}>
              Primary: {beneficiary.phone} | Alt: {beneficiary.alt_phone} | Doctor: {beneficiary.doctor_phone}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.dataContainer}>
        <Text style={styles.dataTitle}>Example Screenings:</Text>
        {exampleScreenings.map((screening, index) => (
          <View key={screening.id} style={styles.screeningItem}>
            <Text style={styles.screeningText}>
              {index + 1}. {screening.beneficiary_name} - {screening.screening_type}
            </Text>
            <Text style={styles.dateText}>
              Date: {screening.screening_date} | Phone: {screening.phone_number}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.infoText}>
        This example demonstrates:
        {'\n'}• SMS to all 3 contact numbers of beneficiaries
        {'\n'}• Data storage in beneficiary and screening tables
        {'\n'}• SMS history tracking and statistics
        {'\n'}• Bulk SMS functionality
      </Text>
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
  testContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  smsComponent: {
    marginBottom: 20,
  },
  dataContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  beneficiaryItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  beneficiaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  phoneText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  screeningItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  screeningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
});

export default EnhancedSMSExample;
