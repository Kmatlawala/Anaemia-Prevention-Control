
import React, {useState} from 'react';
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
import {useDispatch} from 'react-redux';
import {loginSuccess} from '../store/authSlice';
import {API} from '../utils/api';

const AdminRegistration = ({navigation}) => {
  const dispatch = useDispatch();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

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

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await API.adminRegister({
        name: name.trim(),
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
          }),
        );

        Alert.alert(
          'Registration Successful!',
          `Welcome ${response.user.name}! Your admin account has been created successfully.`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Dashboard'),
            },
          ],
        );
      } else {
        Alert.alert(
          'Registration Failed',
          response.message || 'Failed to create admin account',
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create admin account. Please try again.');
    } finally {
      setIsLoading(false);
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
              <Icon name="account-plus" size={64} color={colors.primary} />
            </View>
            <Text style={styles.title}>Admin Registration</Text>
            <Text style={styles.subtitle}>
              Create a new administrator account
            </Text>
          </View>

          {}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="account" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

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

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock-check"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {}
            <TouchableOpacity
              style={[
                styles.registerButton,
                isLoading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="account-plus" size={20} color="#fff" />
                  <Text style={styles.registerButtonText}>
                    Create Admin Account
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.securityInfo}>
            <View style={styles.securityItem}>
              <Icon name="shield-check" size={16} color={colors.success} />
              <Text style={styles.securityText}>
                All information is securely encrypted
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Icon name="lock" size={16} color={colors.success} />
              <Text style={styles.securityText}>
                Password is securely hashed
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Icon name="account-check" size={16} color={colors.success} />
              <Text style={styles.securityText}>Email must be unique</Text>
            </View>
          </View>

          {}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={20} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>Back to Admin Login</Text>
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
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  registerButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  registerButtonText: {
    ...typography.subtitle,
    color: '#fff',
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
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

export default AdminRegistration;
