import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {requestSMSPermission, checkSMSPermission} from '../utils/fixedSMS';

const SMSPermissionRequest = ({visible, onPermissionGranted, onClose}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestSMSPermission();
      if (granted) {
        Alert.alert(
          'Permission Granted',
          'SMS permission has been granted. You can now send SMS notifications to beneficiaries.',
          [
            {
              text: 'OK',
              onPress: () => {
                onPermissionGranted && onPermissionGranted();
                onClose && onClose();
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'SMS permission is required to send notifications to beneficiaries. You can grant this permission later in app settings.',
          [{text: 'OK', onPress: () => onClose && onClose()}],
        );
      }
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      Alert.alert(
        'Error',
        'Failed to request SMS permission. Please try again.',
        [{text: 'OK'}],
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip SMS Permission',
      'You can still use the app, but SMS notifications will not be available. You can grant this permission later in app settings.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          onPress: () => onClose && onClose(),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="message-text" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>SMS Permission Required</Text>
            <Text style={styles.subtitle}>
              Animia needs SMS permission to send healthcare notifications to
              beneficiaries
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.benefitItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.benefitText}>Send appointment reminders</Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.benefitText}>Notify about test results</Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.benefitText}>Send health updates</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRequestPermission}
              disabled={isRequesting}>
              <Icon name="message-text" size={20} color="white" />
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting...' : 'Grant Permission'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}>
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            You can change this permission later in your device settings
          </Text>
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
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.lg,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.large,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  benefitText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.horizontal,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.medium,
  },
  primaryButtonText: {
    ...typography.button,
    color: 'white',
    marginLeft: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SMSPermissionRequest;
