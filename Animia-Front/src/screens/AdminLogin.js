// src/screens/AdminLogin.js — fixed, cross‑platform, spec-compliant
import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Input from '../components/Input';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import {API, SERVER_CONFIG} from '../utils/api';
import {setRole} from '../utils/role';
import {loginSuccess, loginFailure, selectAuthError} from '../store/authSlice';

const AdminLogin = ({navigation}) => {
  const dispatch = useDispatch();
  const authError = useSelector(state => state.auth.error);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const canSetup = useMemo(
    () => username.trim() && password.trim() && confirm.trim(),
    [username, password, confirm],
  );

  const checkUserExists = async username => {
    try {
      await API.adminRegister(username.trim(), 'dummy_check');
      return false;
    } catch (e) {
      // If network error, assume user doesn't exist to allow registration attempt
      if (e?.status === 0 || e?.data?.includes('Network error')) {
        return false;
      }
      return e?.status === 409;
    }
  };
  const onSetup = async () => {
    if (!canSetup) {
      Alert.alert('Required', 'All fields are required');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 6 characters long',
      );
      return;
    }

    // Check if user already exists
    const userExists = await checkUserExists(username);
    if (userExists) {
      Alert.alert(
        'Username Taken',
        'This username already exists. Please choose a different username or try logging in instead.',
      );
      setUsername(''); // Clear username field
      return;
    }

    setLoading(true);
    try {
      const response = await API.adminRegister(
        username.trim(),
        password.trim(),
      );
      await setRole('Admin');
      dispatch(
        loginSuccess({
          user: username,
          role: 'Admin',
          token: response.token,
        }),
      );
      Alert.alert('Welcome', 'Admin account created successfully!');
      setSetupMode(false); // Exit setup mode after successful registration
    } catch (e) {
      if (e?.status === 0 || e?.data?.includes('Network error')) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to server. Please check your internet connection and try again.',
        );
      } else if (e?.status === 409) {
        Alert.alert(
          'Username Taken',
          'This username is already taken. Please choose a different username.',
        );
        setUsername(''); // Clear username field
      } else if (e?.status === 400) {
        Alert.alert(
          'Invalid Input',
          'Please provide valid username and password.',
        );
      } else {
        Alert.alert(
          'Registration Failed',
          'Unable to create account. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required', 'Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const response = await API.adminLogin(username.trim(), password.trim());
      await setRole('Admin');
      const authData = {
        user: username,
        role: 'Admin',
        token: response.token,
      };
      dispatch(loginSuccess(authData));
      Alert.alert('Welcome', 'Signed in as Admin');
      navigation.navigate('Dashboard');
    } catch (e) {
      if (e?.status === 0 || e?.data?.includes('Network error')) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to server. Please check your internet connection and try again.',
        );
        setLoading(false);
        return;
      }

      // Handle specific backend error responses
      if (e?.status === 404 && e?.data?.errorType === 'USER_NOT_FOUND') {
        Alert.alert(
          'User Not Found',
          'Username not found. Please create a new account.',
        );
        setSetupMode(true);
        setConfirm('');
        setPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        return;
      }

      if (e?.status === 401 && e?.data?.errorType === 'WRONG_PASSWORD') {
        Alert.alert(
          'Wrong Password',
          'The password you entered is incorrect. Please try again.',
        );
        setPassword(''); // Clear password field
        return;
      }

      // Handle legacy 401 errors (fallback for old backend)
      if (e?.status === 401) {
        Alert.alert(
          'Wrong Password',
          'The password you entered is incorrect. Please try again.',
        );
        setPassword(''); // Clear password field
        return;
      }

      if (e?.status === 400) {
        Alert.alert(
          'Invalid Input',
          'Please enter both username and password.',
        );
      } else {
        Alert.alert('Login Failed', 'Unable to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    Alert.alert(
      'Password reset',
      'Please contact an administrator to reset your password.',
    );
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Admin Login"
        variant="none"
        // onBackPress={() => navigation.navigate('RoleSelect')} // COMMENTED OUT - No back navigation
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.iconContainer}>
            <Icon name="shield-account" size={32} color={colors.white} />
          </View>
          <Text style={styles.welcomeTitle}>
            {setupMode ? 'Create Admin Account' : 'Administrator Login'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {setupMode
              ? 'Set up your administrator account to manage the system'
              : 'Sign in to access administrative features'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Icon
              name="account"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <Input
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <View style={styles.passwordContainer}>
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={!showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {setupMode && (
            <View style={styles.inputContainer}>
              <Icon
                name="lock-check"
                size={20}
                color={colors.primary}
                style={styles.inputIcon}
              />
              <View style={styles.passwordContainer}>
                <Input
                  placeholder="Confirm Password"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon
                    name={
                      !showConfirmPassword ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.btn}
            onPress={setupMode ? onSetup : onLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Icon
                  name={setupMode ? 'account-plus' : 'login'}
                  size={20}
                  color="#fff"
                  style={styles.btnIcon}
                />
                <Text style={styles.btnText}>
                  {setupMode ? 'Create Account' : 'Login'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {!setupMode && (
            <TouchableOpacity onPress={onForgot} style={styles.forgotWrap}>
              <Icon
                name="help-circle-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {setupMode && (
            <TouchableOpacity
              onPress={() => {
                setSetupMode(false);
                setConfirm('');
                setPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              style={styles.forgotWrap}>
              <Icon name="arrow-left" size={16} color={colors.primary} />
              <Text style={styles.forgotText}>Back to Login</Text>
            </TouchableOpacity>
          )}

          {setupMode && (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={async () => {
                setLoading(true);
                try {
                  await API.adminRegister('admin', 'admin');
                  Alert.alert(
                    'Setup Complete',
                    'Default admin account created successfully!\nUsername: admin\nPassword: admin\n\nYou can now login with these credentials.',
                  );
                  setSetupMode(false);
                  setUsername('admin');
                  setPassword('');
                  setConfirm('');
                } catch (e) {
                  if (e?.status === 409) {
                    Alert.alert(
                      'Already Exists',
                      'Default admin account already exists. You can login with admin/admin credentials.',
                    );
                    setSetupMode(false);
                    setUsername('admin');
                    setPassword('');
                    setConfirm('');
                  } else {
                    Alert.alert(
                      'Setup Failed',
                      'Unable to create default admin account. Please try again.',
                    );
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              activeOpacity={0.8}>
              <View style={styles.btnContent}>
                <Icon
                  name="cog"
                  size={20}
                  color="#fff"
                  style={styles.btnIcon}
                />
                <Text style={styles.btnText}>
                  Create Default Admin (admin/admin)
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!setupMode && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              onPress={() => {
                setSetupMode(true);
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              style={[styles.btn, styles.btnSecondary]}
              activeOpacity={0.8}>
              <View style={styles.btnContent}>
                <Icon
                  name="account-plus"
                  size={20}
                  color="#fff"
                  style={styles.btnIcon}
                />
                <Text style={styles.btnText}>Go to Admin Setup</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scrollContainer: {flex: 1},
  scrollContent: {paddingBottom: spacing.xl},

  // Welcome Header
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  welcomeTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: typography.weights.bold,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.horizontal,
    marginBottom: spacing.md,
    ...shadows.md,
  },

  // Input Container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },

  // Buttons
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.horizontal,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  btnSecondary: {
    backgroundColor: colors.textSecondary,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnIcon: {
    marginRight: spacing.sm,
  },
  btnText: {
    color: '#fff',
    fontWeight: typography.weights.semibold,
    fontSize: 16,
  },

  // Forgot Password
  forgotWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  forgotText: {
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: typography.weights.medium,
  },

  // Bottom Container
  bottomContainer: {
    paddingHorizontal: spacing.horizontal,
    marginTop: spacing.sm,
  },

  // Password field styles
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});

export default AdminLogin;
