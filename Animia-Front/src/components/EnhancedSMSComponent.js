import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  sendSMSWithStorage,
  sendBulkSMSWithStorage,
  sendRegistrationSMSWithStorage,
  sendFollowUpSMSWithStorage,
  sendScreeningReminderSMSWithStorage,
  getBeneficiarySMSHistory,
  getSMSStatistics,
} from '../utils/enhancedSMS';

/**
 * Enhanced SMS Component with Data Storage
 * Supports sending SMS to beneficiary contacts and storing data
 */
const EnhancedSMSComponent = ({
  beneficiaries = [],
  onSMSComplete = () => {},
  style = {},
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendMethod, setSendMethod] = useState('direct');
  const [smsType, setSmsType] = useState('general');
  const [smsStats, setSmsStats] = useState(null);

  useEffect(() => {
    loadSMSStatistics();
  }, []);

  const loadSMSStatistics = async () => {
    try {
      const stats = await getSMSStatistics();
      setSmsStats(stats);
    } catch (error) {
      console.error('Error loading SMS statistics:', error);
    }
  };

  /**
   * Send SMS to single beneficiary with all contacts
   */
  const handleSendToBeneficiary = async beneficiary => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendSMSWithStorage(
        beneficiary,
        message,
        smsType,
        sendMethod === 'direct',
      );

      Alert.alert(
        'SMS Results',
        `Sent to ${result.summary.successfulSMS}/${result.summary.totalContacts} contacts\n` +
          `Storage: ${result.summary.successfulStorage} successful\n` +
          `Failed: ${result.summary.failedSMS} SMS, ${result.summary.failedStorage} storage`,
        [{text: 'OK'}],
      );

      onSMSComplete({
        type: 'beneficiary',
        beneficiary: beneficiary.name,
        result,
      });
      loadSMSStatistics(); // Refresh stats
    } catch (error) {
      console.error('SMS send error:', error);
      console.error(
        '[EnhancedSMSComponent] Failed to send SMS:',
        error.message,
      );
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
      const result = await sendBulkSMSWithStorage(
        beneficiaries,
        message,
        smsType,
        sendMethod === 'direct',
      );

      Alert.alert(
        'Bulk SMS Results',
        `Sent to ${result.summary.successfulSMS}/${result.summary.totalBeneficiaries} beneficiaries\n` +
          `Storage: ${result.summary.successfulStorage} successful\n` +
          `Bulk Storage: ${
            result.summary.bulkStorageSuccess ? 'Success' : 'Failed'
          }`,
        [{text: 'OK'}],
      );

      onSMSComplete({type: 'bulk', count: beneficiaries.length, result});
      loadSMSStatistics(); // Refresh stats
    } catch (error) {
      console.error('Bulk SMS error:', error);
      console.error(
        '[EnhancedSMSComponent] Failed to send bulk SMS:',
        error.message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send registration SMS
   */
  const handleRegistrationSMS = async beneficiary => {
    setIsLoading(true);
    try {
      const result = await sendRegistrationSMSWithStorage(
        beneficiary,
        sendMethod === 'direct',
      );

      Alert.alert(
        'Registration SMS',
        `Sent to ${result.summary.successfulSMS}/${result.summary.totalContacts} contacts`,
        [{text: 'OK'}],
      );

      onSMSComplete({
        type: 'registration',
        beneficiary: beneficiary.name,
        result,
      });
      loadSMSStatistics();
    } catch (error) {
      console.error('Registration SMS error:', error);
      console.error(
        '[EnhancedSMSComponent] Failed to send registration SMS:',
        error.message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send follow-up SMS
   */
  const handleFollowUpSMS = async (beneficiary, followUp) => {
    setIsLoading(true);
    try {
      const result = await sendFollowUpSMSWithStorage(
        beneficiary,
        followUp,
        sendMethod === 'direct',
      );

      Alert.alert(
        'Follow-up SMS',
        `Sent to ${result.summary.successfulSMS}/${result.summary.totalContacts} contacts`,
        [{text: 'OK'}],
      );

      onSMSComplete({type: 'follow_up', beneficiary: beneficiary.name, result});
      loadSMSStatistics();
    } catch (error) {
      console.error('Follow-up SMS error:', error);
      console.error(
        '[EnhancedSMSComponent] Failed to send follow-up SMS:',
        error.message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, style]}>
      <Text style={styles.title}>Enhanced SMS with Storage</Text>

      {/* SMS Statistics */}
      {smsStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>SMS Statistics</Text>
          <Text style={styles.statsText}>
            Total SMS: {smsStats.total_sms_sent}
          </Text>
          <Text style={styles.statsText}>
            Successful: {smsStats.successful_sms}
          </Text>
          <Text style={styles.statsText}>Failed: {smsStats.failed_sms}</Text>
          <Text style={styles.statsText}>
            Beneficiaries: {smsStats.beneficiaries_contacted}
          </Text>
        </View>
      )}

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

      {/* SMS Type Selection */}
      <View style={styles.typeContainer}>
        <Text style={styles.label}>SMS Type:</Text>
        <View style={styles.typeButtons}>
          {[
            'general',
            'registration',
            'follow_up',
            'screening',
            'intervention',
          ].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                smsType === type && styles.typeButtonActive,
              ]}
              onPress={() => setSmsType(type)}>
              <Text
                style={[
                  styles.typeButtonText,
                  smsType === type && styles.typeButtonTextActive,
                ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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

        {beneficiaries.length > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.registrationButton]}
            onPress={() => handleRegistrationSMS(beneficiaries[0])}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Sending...' : 'Send Registration SMS'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Individual Beneficiary Actions */}
      {beneficiaries.slice(0, 3).map((beneficiary, index) => (
        <View key={beneficiary.id || index} style={styles.beneficiaryContainer}>
          <Text style={styles.beneficiaryName}>{beneficiary.name}</Text>
          <TouchableOpacity
            style={[styles.button, styles.beneficiaryButton]}
            onPress={() => handleSendToBeneficiary(beneficiary)}
            disabled={isLoading}>
            <Text style={styles.buttonText}>Send to {beneficiary.name}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Sending SMS...</Text>
        </View>
      )}

      <Text style={styles.infoText}>
        This component sends SMS to all 3 contact numbers of beneficiaries and
        stores the data in beneficiary and screening tables.
      </Text>
    </ScrollView>
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
  statsContainer: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  methodContainer: {
    marginBottom: 16,
  },
  typeContainer: {
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#34C759',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
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
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkButton: {
    backgroundColor: '#34C759',
  },
  registrationButton: {
    backgroundColor: '#FF9500',
  },
  beneficiaryContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  beneficiaryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  beneficiaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default EnhancedSMSComponent;
