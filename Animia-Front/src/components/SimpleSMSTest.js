import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../theme/theme';
import { sendSMS, sendSMSToBeneficiary } from '../utils/sms';

/**
 * Simple SMS Test Component
 * Test SMS functionality quickly
 */
const SimpleSMSTest = () => {
  const [phoneNumber, setPhoneNumber] = useState('+919558372935');
  const [message, setMessage] = useState('Hello! This is a test SMS from Animia app.');
  const [testing, setTesting] = useState(false);

  const testSingleSMS = async () => {
    setTesting(true);
    try {
      console.log('[SimpleSMSTest] Testing single SMS');
      const success = await sendSMS(phoneNumber, message);
      
      Alert.alert(
        'SMS Test',
        success ? 'SMS sent successfully!' : 'SMS failed',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[SimpleSMSTest] SMS error:', error);
      Alert.alert('Error', 'SMS test failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const testMultiContactSMS = async () => {
    setTesting(true);
    try {
      console.log('[SimpleSMSTest] Testing multi-contact SMS');
      
      // Create test beneficiary with multiple contacts
      const testBeneficiary = {
        name: 'Test User',
        short_id: 'TEST001',
        phone: '+919558372935',
        alt_phone: '+919876543210',
        doctor_phone: '+919876543211'
      };
      
      const result = await sendSMSToBeneficiary(testBeneficiary, message);
      
      Alert.alert(
        'Multi-Contact SMS Test',
        `SMS sent to ${result.summary.successful}/${result.summary.total} contacts`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[SimpleSMSTest] Multi-contact SMS error:', error);
      Alert.alert('Error', 'Multi-contact SMS test failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple SMS Test</Text>
        <Text style={styles.subtitle}>Quick SMS testing</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Configuration</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter test message"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testSingleSMS}
          disabled={testing}
        >
          <Icon name="phone" size={20} color="#fff" />
          <Text style={styles.buttonText}>Test Single SMS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testMultiContactSMS}
          disabled={testing}
        >
          <Icon name="account-multiple" size={20} color="#fff" />
          <Text style={styles.buttonText}>Test Multi-Contact SMS</Text>
        </TouchableOpacity>
      </View>

      {testing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Testing SMS...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Simple SMS Test Component
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SimpleSMSTest;
