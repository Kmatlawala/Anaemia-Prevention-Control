
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {useDispatch, useSelector} from 'react-redux';
import {loginSuccess, loginFailure} from '../store/authSlice';
import {API} from '../utils/api';

const AdminLogin = ({navigation}) => {
  const dispatch = useDispatch();
  const {isAuthenticated, user, loading} = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false);
  const [checkingAdminStatus, setCheckingAdminStatus] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {

    if (isAuthenticated && user?.role === 'Admin' && !isLoading) {
      
      navigation.reset({
        index: 0,
        routes: [{name: 'Dashboard'}],
      });
    }
  }, []); 

  const checkAdminStatus = async () => {
    try {
      setCheckingAdminStatus(true);
      const response = await API.checkAdminStatus();

      if (response.success && response.needsFirstAdmin) {
        setNeedsFirstAdmin(true);
      }
    } catch (error) {
      } finally {
      setCheckingAdminStatus(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await API.adminLogin({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (response.success) {
        
        dispatch(
          loginSuccess({
            user: {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
              role: 'Admin',
              permissions: response.user.permissions || [],
            },
            role: 'Admin',
            token: response.token,
            selectedBeneficiary: null, 
            loginMethod: null,
            loginValue: null,
          }),
        );

        navigation.replace('Dashboard');
      } else {
        dispatch(loginFailure(response.message || 'Login failed'));
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
      }
    } catch (error) {
      dispatch(loginFailure('Network error. Please try again.'));
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your system administrator to reset your password.',
      [{text: 'OK'}],
    );
  };

  const handleRegisterAdmin = () => {
    if (needsFirstAdmin) {
      navigation.navigate('FirstAdminSetup');
    } else {
      
      navigation.navigate('AdminRegistration');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="shield-account" size={64} color={colors.primary} />
            </View>
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>
              Access the Anaemia Health Management System
            </Text>
          </View>

          {}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="email" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Admin Email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="login" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Login as Admin</Text>
                </>
              )}
            </TouchableOpacity>

            {}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}>
              <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </TouchableOpacity>

            {}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegisterAdmin}>
              <Text style={styles.registerButtonText}>
                {needsFirstAdmin
                  ? 'Create First Admin Account'
                  : 'Register New Admin Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.securityInfo}>
            <View style={styles.securityItem}>
              <Icon name="shield-check" size={16} color={colors.success} />
              <Text style={styles.securityText}>
                Secure authentication with JWT tokens
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Icon name="lock" size={16} color={colors.success} />
              <Text style={styles.securityText}>
                All data is encrypted and protected
              </Text>
            </View>
          </View>

          {}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('RoleSelect');
              }
            }}>
            <Icon name="arrow-left" size={20} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>Back to Role Selection</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.horizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  formContainer: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
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
  input: {
    flex: 1,
    ...typography.subtitle,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  passwordInput: {
    marginRight: spacing.sm,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  loginButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  loginButtonText: {
    ...typography.subtitle,
    color: '#fff',
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  forgotButton: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  forgotButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  registerButton: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  registerButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  securityInfo: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  securityText: {
    ...typography.caption,
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

export default AdminLogin;
