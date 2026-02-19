import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  getAvailableDevices,
  sendSMSToAllDevices,
  sendBeneficiarySMSToAllDevices,
  sendBulkSMSToAllDevices,
  getDevicesSMSStatus,
} from '../utils/multiDeviceSMS';

const MultiDeviceSMSComponent = ({
  beneficiaries = [],
  onSMSComplete = () => {},
  style = {},
}) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);

  useEffect(() => {
    loadDevices();
    loadDeviceStatus();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await getAvailableDevices();
      setDevices(deviceList);
      setSelectedDevices(deviceList.map(d => d.id)); 
    } catch (error) {
      }
  };

  const loadDeviceStatus = async () => {
    try {
      const status = await getDevicesSMSStatus();
      setDeviceStatus(status);
    } catch (error) {
      }
  };

  const toggleDeviceSelection = deviceId => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId],
    );
  };

  const handleSendToAllDevices = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (selectedDevices.length === 0) {
      Alert.alert('Error', 'Please select at least one device');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendSMSToAllDevices('9876543210', message); 

      Alert.alert(
        'Multi-Device SMS Results',
        `Sent to ${result.summary.successful}/${result.summary.total} devices\n` +
          `Failed: ${result.summary.failed}`,
        [{text: 'OK'}],
      );

      onSMSComplete({type: 'multi_device', result});
      loadDeviceStatus(); 
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  };

  const handleSendBeneficiaryToAllDevices = async beneficiary => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendBeneficiarySMSToAllDevices(
        beneficiary,
        message,
        true,
      );

      Alert.alert(
        'Beneficiary Multi-Device SMS',
        `Sent to ${result.overallSummary.successfulAttempts}/${result.overallSummary.totalAttempts} attempts\n` +
          `Devices: ${result.overallSummary.totalDevices}\n` +
          `Contacts: ${result.overallSummary.totalContacts}`,
        [{text: 'OK'}],
      );

      onSMSComplete({
        type: 'beneficiary_multi_device',
        beneficiary: beneficiary.name,
        result,
      });
      loadDeviceStatus();
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  };

  const handleSendBulkToAllDevices = async () => {
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
      const result = await sendBulkSMSToAllDevices(
        beneficiaries,
        message,
        true,
      );

      Alert.alert(
        'Bulk Multi-Device SMS',
        `Sent to ${result.overallSummary.successfulAttempts}/${result.overallSummary.totalAttempts} attempts\n` +
          `Devices: ${result.overallSummary.totalDevices}\n` +
          `Beneficiaries: ${result.overallSummary.totalBeneficiaries}`,
        [{text: 'OK'}],
      );

      onSMSComplete({
        type: 'bulk_multi_device',
        count: beneficiaries.length,
        result,
      });
      loadDeviceStatus();
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, style]}>
      <Text style={styles.title}>Multi-Device SMS</Text>

      {}
      {deviceStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Device Status</Text>
          <Text style={styles.statusText}>
            Total Devices: {deviceStatus.summary.total}
          </Text>
          <Text style={styles.statusText}>
            Online: {deviceStatus.summary.online}
          </Text>
          <Text style={styles.statusText}>
            Offline: {deviceStatus.summary.offline}
          </Text>
          <Text style={styles.statusText}>
            Total SMS Sent: {deviceStatus.summary.totalSMS}
          </Text>
        </View>
      )}

      {}
      <View style={styles.deviceContainer}>
        <Text style={styles.label}>Select Devices:</Text>
        {devices.map(device => (
          <TouchableOpacity
            key={device.id}
            style={[
              styles.deviceButton,
              selectedDevices.includes(device.id) &&
                styles.deviceButtonSelected,
            ]}
            onPress={() => toggleDeviceSelection(device.id)}>
            <Text
              style={[
                styles.deviceButtonText,
                selectedDevices.includes(device.id) &&
                  styles.deviceButtonTextSelected,
              ]}>
              {device.name} ({device.id})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {}
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

      {}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.allDevicesButton]}
          onPress={handleSendToAllDevices}
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send to All Devices'}
          </Text>
        </TouchableOpacity>

        {beneficiaries.length > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.bulkButton]}
            onPress={handleSendBulkToAllDevices}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading
                ? 'Sending...'
                : `Send Bulk to All Devices (${beneficiaries.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {}
      {beneficiaries.slice(0, 3).map((beneficiary, index) => (
        <View key={beneficiary.id || index} style={styles.beneficiaryContainer}>
          <Text style={styles.beneficiaryName}>{beneficiary.name}</Text>
          <TouchableOpacity
            style={[styles.button, styles.beneficiaryButton]}
            onPress={() => handleSendBeneficiaryToAllDevices(beneficiary)}
            disabled={isLoading}>
            <Text style={styles.buttonText}>Send to All Devices</Text>
          </TouchableOpacity>
        </View>
      ))}

      {}
      {devices.map(device => (
        <View key={device.id} style={styles.deviceResultContainer}>
          <Text style={styles.deviceResultTitle}>{device.name}</Text>
          <Text style={styles.deviceResultText}>ID: {device.id}</Text>
          <Text style={styles.deviceResultText}>
            Status: {device.online ? 'Online' : 'Offline'}
          </Text>
          {device.lastSMS && (
            <Text style={styles.deviceResultText}>
              Last SMS: {device.lastSMS}
            </Text>
          )}
          <Text style={styles.deviceResultText}>
            SMS Count: {device.smsCount || 0}
          </Text>
        </View>
      ))}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Sending SMS to devices...</Text>
        </View>
      )}

      <Text style={styles.infoText}>
        This component sends SMS across multiple devices. Each device will
        attempt to send the SMS to all 3 contact numbers of beneficiaries.
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
  statusContainer: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  deviceContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  deviceButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
    alignItems: 'center',
  },
  deviceButtonSelected: {
    backgroundColor: '#007AFF',
  },
  deviceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  deviceButtonTextSelected: {
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
  allDevicesButton: {
    backgroundColor: '#007AFF',
  },
  bulkButton: {
    backgroundColor: '#34C759',
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
    backgroundColor: '#FF9500',
  },
  deviceResultContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deviceResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  deviceResultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
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

export default MultiDeviceSMSComponent;
