import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography} from '../theme/theme';
import {
  sendSMSToBeneficiary,
  sendSMS,
  sendNativeSMS,
  sendSMSApp,
  formatPhoneNumber,
  isValidPhoneNumber,
} from '../utils/fixedSMS';
import {NativeModules} from 'react-native';

const {SMSModule} = NativeModules;

const CleanSMSComponent = ({
  visible,
  onClose,
  beneficiary = null,
  initialMessage = '',
}) => {
  const [message, setMessage] = useState(initialMessage);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [sendToAllContacts, setSendToAllContacts] = useState(true);
  const [smsResults, setSmsResults] = useState([]);
  const [smsMethod, setSmsMethod] = useState('smart'); 

  const getBeneficiaryContacts = () => {
    if (!beneficiary) return [];

    const contacts = [];
    if (beneficiary.phone && isValidPhoneNumber(beneficiary.phone)) {
      contacts.push({
        type: 'Primary Phone',
        number: formatPhoneNumber(beneficiary.phone),
      });
    }
    if (beneficiary.alt_phone && isValidPhoneNumber(beneficiary.alt_phone)) {
      contacts.push({
        type: 'Alternative Phone',
        number: formatPhoneNumber(beneficiary.alt_phone),
      });
    }
    if (
      beneficiary.doctor_phone &&
      isValidPhoneNumber(beneficiary.doctor_phone)
    ) {
      contacts.push({
        type: 'Doctor Phone',
        number: formatPhoneNumber(beneficiary.doctor_phone),
      });
    }
    return contacts;
  };

  const handleSendSMS = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    setSmsResults([]);

    try {
      if (sendToAllContacts && beneficiary) {
        
        const result = await sendSMSToBeneficiary(beneficiary, message);
        setSmsResults(result.results);

        const method = SMSModule ? 'Native SMS' : 'SMS App';
        Alert.alert(
          'SMS Results',
          `${method} sent to ${result.summary.successful}/${result.summary.total} contacts`,
          [{text: 'OK', onPress: handleClose}],
        );
      } else {
        
        if (!phoneNumber.trim()) {
          Alert.alert('Error', 'Please enter a phone number');
          return;
        }

        if (!isValidPhoneNumber(phoneNumber)) {
          Alert.alert('Error', 'Please enter a valid phone number');
          return;
        }

        let success = false;
        let method = '';

        if (smsMethod === 'native' && SMSModule) {
          success = await sendNativeSMS(phoneNumber, message);
          method = 'Native SMS';
        } else if (smsMethod === 'app') {
          success = await sendSMSApp(phoneNumber, message);
          method = 'SMS App';
        } else {
          
          success = await sendSMS(phoneNumber, message);
          method = SMSModule ? 'Native SMS' : 'SMS App';
        }

        setSmsResults([
          {
            contact: {
              type: 'Single Number',
              number: formatPhoneNumber(phoneNumber),
            },
            success: success,
            method: method,
          },
        ]);

        if (success) {
          Alert.alert('Success', `${method} sent successfully!`);
          handleClose();
        } else {
          Alert.alert('Error', `Failed to send ${method}`);
        }
      }
    } catch (error) {
      } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setPhoneNumber('');
    setSending(false);
    setSmsResults([]);
    setSendToAllContacts(true);
    onClose();
  };

  const beneficiaryContacts = getBeneficiaryContacts();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Send SMS</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {}
            {beneficiary && (
              <View style={styles.beneficiaryInfo}>
                <Text style={styles.beneficiaryName}>{beneficiary.name}</Text>
                <Text style={styles.beneficiaryId}>
                  ID: {beneficiary.short_id || beneficiary.unique_id}
                </Text>
              </View>
            )}

            {}
            <View style={styles.optionsContainer}>
              <Text style={styles.sectionTitle}>SMS Method:</Text>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  smsMethod === 'native' && styles.optionButtonSelected,
                ]}
                onPress={() => setSmsMethod('native')}
                disabled={!SMSModule}>
                <Icon
                  name={
                    smsMethod === 'native'
                      ? 'checkbox-marked'
                      : 'checkbox-blank-outline'
                  }
                  size={20}
                  color={
                    smsMethod === 'native'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    smsMethod === 'native' && styles.optionTextSelected,
                  ]}>
                  Native SMS {!SMSModule && '(Not Available)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  smsMethod === 'app' && styles.optionButtonSelected,
                ]}
                onPress={() => setSmsMethod('app')}>
                <Icon
                  name={
                    smsMethod === 'app'
                      ? 'checkbox-marked'
                      : 'checkbox-blank-outline'
                  }
                  size={20}
                  color={
                    smsMethod === 'app' ? colors.primary : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    smsMethod === 'app' && styles.optionTextSelected,
                  ]}>
                  SMS App
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  smsMethod === 'smart' && styles.optionButtonSelected,
                ]}
                onPress={() => setSmsMethod('smart')}>
                <Icon
                  name={
                    smsMethod === 'smart'
                      ? 'checkbox-marked'
                      : 'checkbox-blank-outline'
                  }
                  size={20}
                  color={
                    smsMethod === 'smart'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    smsMethod === 'smart' && styles.optionTextSelected,
                  ]}>
                  Smart (Native + Fallback)
                </Text>
              </TouchableOpacity>
            </View>

            {}
            {beneficiary && beneficiaryContacts.length > 0 && (
              <View style={styles.optionsContainer}>
                <Text style={styles.sectionTitle}>Send Options:</Text>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    sendToAllContacts && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSendToAllContacts(true)}>
                  <Icon
                    name={
                      sendToAllContacts
                        ? 'checkbox-marked'
                        : 'checkbox-blank-outline'
                    }
                    size={20}
                    color={
                      sendToAllContacts ? colors.primary : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      sendToAllContacts && styles.optionTextSelected,
                    ]}>
                    Send to All Contacts ({beneficiaryContacts.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    !sendToAllContacts && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSendToAllContacts(false)}>
                  <Icon
                    name={
                      !sendToAllContacts
                        ? 'checkbox-marked'
                        : 'checkbox-blank-outline'
                    }
                    size={20}
                    color={
                      !sendToAllContacts ? colors.primary : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      !sendToAllContacts && styles.optionTextSelected,
                    ]}>
                    Send to Single Number
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {}
            {sendToAllContacts && beneficiaryContacts.length > 0 && (
              <View style={styles.contactsContainer}>
                <Text style={styles.sectionTitle}>Contacts:</Text>
                {beneficiaryContacts.map((contact, index) => (
                  <View key={index} style={styles.contactItem}>
                    <Icon name="phone" size={16} color={colors.primary} />
                    <Text style={styles.contactText}>
                      {contact.type}: {contact.number}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {}
            {!sendToAllContacts && (
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
            )}

            {}
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

            {}
            {smsResults.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.sectionTitle}>SMS Results:</Text>
                {smsResults.map((result, index) => (
                  <View key={index} style={styles.resultItem}>
                    <Icon
                      name={result.success ? 'check-circle' : 'close-circle'}
                      size={20}
                      color={result.success ? '#4CAF50' : '#F44336'}
                    />
                    <Text style={styles.resultText}>
                      {result.contact.type}:{' '}
                      {result.success ? 'Success' : 'Failed'}
                    </Text>
                    {result.method && (
                      <Text style={styles.resultMethod}>
                        Method: {result.method}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                sending && styles.sendButtonDisabled,
              ]}
              onPress={handleSendSMS}
              disabled={sending}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>
                  {sendToAllContacts ? 'Send to All Contacts' : 'Send SMS'}
                </Text>
              )}
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
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
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    maxHeight: 400,
  },
  beneficiaryInfo: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  beneficiaryName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  beneficiaryId: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    marginBottom: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary + '20',
  },
  optionText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  contactsContainer: {
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  contactText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginLeft: spacing.sm,
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
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
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
  resultsContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  resultText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  resultMethod: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
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

export default CleanSMSComponent;
