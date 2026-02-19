
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {API} from '../utils/api';
import {sendOTPViaBackend, sendOTPViaBeneficiarySMS} from '../utils/backendOTP';

const MobileLogin = ({navigation}) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const formatPhoneNumber = text => {
    
    return text; 
  };

  const handleMobileNumberChange = text => {
    
    const cleaned = text.replace(/[^0-9+\s-]/g, '');
    setMobileNumber(cleaned);
    setErrorMessage(''); 
    setSuccessMessage(''); 
  };

  const validateMobileNumber = number => {
    
    if (number.startsWith('+')) {
      const digits = number.replace(/\D/g, '');
      
      return digits.length >= 10 && digits.length <= 15;
    }

    const cleaned = number.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const handleSendOTP = async () => {
    if (!validateMobileNumber(mobileNumber)) {
      setErrorMessage(
        'Please enter a valid phone number in international format (e.g., +919876543210) or 10-digit Indian number',
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {

      let formattedPhone = mobileNumber;
      if (!mobileNumber.startsWith('+')) {
        
        formattedPhone = `+91${mobileNumber.replace(/\D/g, '')}`;
      }

      const backendResult = await sendOTPViaBackend(formattedPhone);

      if (backendResult.success) {
        setSuccessMessage(
          `OTP has been sent to ${mobileNumber}. Valid for 5 minutes.`,
        );

        setTimeout(() => {
          navigation.navigate('OTPVerification', {
            mobileNumber: formattedPhone, 
            type: 'mobile_login',
            useBackend: true,
            expiresIn: backendResult.expiresIn,
          });
        }, 1500);
      } else {
        setErrorMessage(backendResult.error || 'Failed to send OTP');
      }
    } catch (error) {
      setErrorMessage('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="phone" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Mobile Login</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number with country code (e.g., +919876543210)
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successContainer}>
            <Icon name="check-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <View
            style={[
              styles.inputWrapper,
              errorMessage ? styles.inputWrapperError : null,
            ]}>
            <Icon name="phone" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Enter phone number (e.g., +919876543210)"
              placeholderTextColor={colors.textSecondary}
              value={mobileNumber}
              onChangeText={handleMobileNumberChange}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSendOTP}
          disabled={isLoading || !validateMobileNumber(mobileNumber)}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Send OTP</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Icon name="information" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              OTP will be sent to your registered mobile number
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="clock" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>OTP is valid for 5 minutes</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.textSecondary} />
          <Text style={styles.backButtonText}>Back to Login Options</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.horizontal,
    paddingTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginLeft: spacing.sm,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  successText: {
    ...typography.body,
    color: colors.success,
    marginLeft: spacing.sm,
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '05',
  },
  input: {
    flex: 1,
    ...typography.subtitle,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendButtonText: {
    ...typography.subtitle,
    color: '#fff',
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  infoContainer: {
    marginBottom: spacing.xl,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});

export default MobileLogin;
