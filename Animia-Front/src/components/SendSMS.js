import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../theme/theme';
import { sendSMS, formatPhoneNumber, isValidPhoneNumber } from '../utils/sms';

const SendSMS = ({ visible, onClose, initialPhoneNumber = '', initialMessage = '' }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);

  const handleSendSMS = async () => {
    console.log('[SendSMS] handleSendSMS called');
    console.log('[SendSMS] Phone number:', phoneNumber);
    console.log('[SendSMS] Message:', message);
    
    if (!phoneNumber.trim()) {
      console.log('[SendSMS] No phone number provided');
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (!message.trim()) {
      console.log('[SendSMS] No message provided');
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      console.log('[SendSMS] Invalid phone number:', phoneNumber);
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    console.log('[SendSMS] Starting SMS send process');
    setSending(true);
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      console.log('[SendSMS] Formatted number:', formattedNumber);
      
      // Try regular SMS first
      let success = await sendSMS(formattedNumber, message);
      console.log('[SendSMS] SMS result (regular):', success);
      
      // If regular SMS fails, try alternative
      if (!success) {
        console.log('[SendSMS] Trying alternative SMS method...');
        const { sendSMSAlternative } = await import('../utils/sms');
        success = await sendSMSAlternative(formattedNumber, message);
        console.log('[SendSMS] SMS result (alternative):', success);
      }
      
      if (success) {
        Alert.alert('Success', 'SMS app opened successfully!');
        handleClose();
      } else {
        Alert.alert('SMS Error', 'Cannot open SMS app. Please try manually sending SMS to: ' + formattedNumber);
      }
    } catch (error) {
      console.error('[SendSMS] Error:', error);
      Alert.alert('Error', 'Failed to open SMS app');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setMessage('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Send SMS</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Enter your message"
                multiline
                numberOfLines={4}
                maxLength={160}
              />
              <Text style={styles.characterCount}>{message.length}/160</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendSMS}
              disabled={sending}
            >
              <Text style={styles.sendButtonText}>
                {sending ? 'Opening SMS...' : 'Send SMS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.md,
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
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  sendButton: {
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
});

export default SendSMS;
