
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {useDispatch} from 'react-redux';
import {loginSuccess} from '../store/authSlice';
import {API} from '../utils/api';
import {verifyOTPCode} from '../utils/firebaseAuth';
import {
  verifyBackendOTP,
  resendOTP,
  verifyEmailOTP,
  resendEmailOTP,
} from '../utils/backendOTP';

const OTPVerification = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {
    email,
    type,
    googleUser,
    mobileNumber,
    verificationId,
    useFirebase,
    otp,
    useBackend,
  } = route.params;

  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const inputRefs = useRef([]);

  useEffect(() => {
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    setErrorMessage(''); 

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      
      setTimeout(() => {
        handleVerifyOTP(newOtp.join(''));
      }, 100);
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpToVerify = null) => {
    const otpToCheck = otpToVerify || otpCode.join('');

    if (otpToCheck.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit OTP');
      return;
    }

    if (isVerifying || isLoading) {
      return;
    }

    setIsVerifying(true);
    setIsLoading(true);
    setErrorMessage('');

    try {
      
      if (useFirebase && verificationId) {
        const verificationResult = await verifyOTPCode(
          verificationId,
          otpToCheck,
        );

        if (verificationResult.success) {
          
          try {
            const loginResponse = await API.mobileLogin(
              mobileNumber,
              otpToCheck,
            );

            if (loginResponse.success) {

              if (loginResponse.requiresSelection) {
                navigation.replace('PatientList', {
                  loginMethod: 'mobile',
                  loginValue: mobileNumber,
                });
              } else {
                
                dispatch(
                  loginSuccess({
                    user: loginResponse.user,
                    role: 'Patient',
                    token: loginResponse.token,
                    firebaseUser: verificationResult.user,
                  }),
                );

                navigation.replace('PatientList', {
                  loginMethod: 'mobile',
                  loginValue: mobileNumber,
                });
              }
            } else {
              setErrorMessage(loginResponse.message || 'Login failed');
            }
          } catch (loginError) {
            setErrorMessage('Failed to complete login. Please try again.');
          }
        } else {
          
          setErrorMessage(verificationResult.error || 'Invalid OTP');
          setOtpCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
      
      else if (useBackend) {
        
        if (type === 'email_login' && email) {
          const verificationResult = await verifyEmailOTP(email, otpToCheck);

          if (verificationResult.success) {
            
            try {
              const loginResponse = await API.emailLogin(email, otpToCheck);

              if (loginResponse.success) {

                if (loginResponse.requiresSelection) {
                  navigation.replace('PatientList', {
                    loginMethod: 'email',
                    loginValue: email,
                  });
                } else {
                  
                  dispatch(
                    loginSuccess({
                      user: loginResponse.user,
                      role: 'Patient',
                      token: loginResponse.token,
                      selectedBeneficiary: loginResponse.beneficiary,
                    }),
                  );

                  navigation.replace('BeneficiaryDetail', {
                    record: loginResponse.beneficiary,
                    readOnly: true,
                    fromPatientList: true,
                    loginMethod: 'email',
                    loginValue: email,
                  });
                }
              } else {
                setErrorMessage(loginResponse.message || 'Login failed');
              }
            } catch (loginError) {
              setErrorMessage('Failed to complete login. Please try again.');
            }
          } else {
            const errorMessage = verificationResult.remainingAttempts
              ? `Invalid OTP. ${verificationResult.remainingAttempts} attempts remaining.`
              : verificationResult.error || 'Invalid OTP';
            
            setErrorMessage(errorMessage);
            setOtpCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
          }
        }
        
        else if (type === 'mobile_login' && mobileNumber) {
          const verificationResult = await verifyBackendOTP(
            mobileNumber,
            otpToCheck,
          );

          if (verificationResult.success) {
            
            try {
              const loginResponse = await API.mobileLogin(
                mobileNumber,
                otpToCheck,
              );

              if (loginResponse.success) {

                if (loginResponse.requiresSelection) {
                  navigation.replace('PatientList', {
                    loginMethod: 'mobile',
                    loginValue: mobileNumber,
                  });
                } else {
                  
                  dispatch(
                    loginSuccess({
                      user: loginResponse.user,
                      role: 'Patient',
                      token: loginResponse.token,
                    }),
                  );

                  navigation.replace('PatientList', {
                    loginMethod: 'mobile',
                    loginValue: mobileNumber,
                  });
                }
              } else {
                setErrorMessage(loginResponse.message || 'Login failed');
              }
            } catch (loginError) {
              setErrorMessage('Failed to complete login. Please try again.');
            }
          } else {
            const errorMessage = verificationResult.remainingAttempts
              ? `Invalid OTP. ${verificationResult.remainingAttempts} attempts remaining.`
              : verificationResult.error || 'Invalid OTP';
            
            setErrorMessage(errorMessage);
            setOtpCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
          }
        } else {
          setErrorMessage('OTP verification not available. Please try again.');
        }
      } else {
        setErrorMessage('OTP verification not available. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setErrorMessage('');

    try {
      
      if (useFirebase) {
        setErrorMessage('Please go back and request a new OTP');
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
        return;
      }

      if (useBackend) {
        let result;

        if (type === 'email_login' && email) {
          result = await resendEmailOTP(email);
        }
        
        else if (type === 'mobile_login' && mobileNumber) {
          result = await resendOTP(mobileNumber);
        } else {
          setErrorMessage('Cannot resend OTP. Please try again.');
          return;
        }

        if (result.success) {
          
          setTimer(60);
          setCanResend(false);
          setErrorMessage('');
          
          Alert.alert(
            'Success',
            type === 'email_login'
              ? 'OTP has been resent to your email'
              : 'OTP has been resent successfully',
          );
        } else {
          setErrorMessage(result.error || 'Failed to resend OTP');
        }
      }
    } catch (error) {
      setErrorMessage('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const getContactInfo = () => {
    if (type === 'google_login') {
      return email;
    } else if (type === 'mobile_login') {
      return mobileNumber;
    }
    return email || mobileNumber;
  };

  const getContactType = () => {
    if (type === 'google_login') {
      return 'email';
    } else if (type === 'mobile_login') {
      return 'mobile number';
    }
    return 'contact';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="shield-check" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to your {getContactType()}
          </Text>
          <Text style={styles.contactInfo}>{getContactInfo()}</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.otpContainer}>
          {otpCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                errorMessage ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={({nativeEvent}) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (isLoading || isVerifying) && styles.verifyButtonDisabled,
          ]}
          onPress={() => handleVerifyOTP()}
          disabled={
            isLoading || isVerifying || otpCode.some(digit => digit === '')
          }>
          {isLoading || isVerifying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.verifyButtonText}>Verify OTP</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={resendLoading}>
              {resendLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Icon name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.resendButtonText}>Resend OTP</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>Resend OTP in {timer} seconds</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.textSecondary} />
          <Text style={styles.backButtonText}>Back to Login</Text>
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
    marginBottom: spacing.xs,
  },
  contactInfo: {
    ...typography.body,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text,
    backgroundColor: colors.background,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  otpInputError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  verifyButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  verifyButtonText: {
    ...typography.subtitle,
    color: '#fff',
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  resendButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
  },
  timerText: {
    ...typography.body,
    color: colors.textSecondary,
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

export default OTPVerification;
