
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

const UniqueIdLogin = ({navigation}) => {
  const dispatch = useDispatch();
  const [uniqueId, setUniqueId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatUniqueId = text => {

    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const limited = cleaned.slice(0, 4);

    return limited;
  };

  const handleUniqueIdChange = text => {
    const formatted = formatUniqueId(text);
    setUniqueId(formatted);
  };

  const validateUniqueId = id => {
    
    const alphanumericRegex = /^[A-Z0-9]{4}$/;
    return alphanumericRegex.test(id.toUpperCase());
  };

  const handleLogin = async () => {
    if (!validateUniqueId(uniqueId)) {
      Alert.alert(
        'Invalid Unique ID',
        'Please enter a valid 4-character unique ID (letters and numbers)',
      );
      return;
    }

    setIsLoading(true);
    try {
      
      const response = await API.loginWithUniqueId({
        uniqueId: uniqueId.toUpperCase(),
      });

      if (response.success) {

        if (response.requiresSelection) {
          navigation.replace('PatientList', {
            loginMethod: 'unique_id',
            loginValue: uniqueId,
          });
        } else {
          
          dispatch(
            loginSuccess({
              user: response.user,
              role: 'Patient',
              token: response.token,
            }),
          );

          navigation.replace('PatientList', {
            loginMethod: 'unique_id',
            loginValue: uniqueId,
          });
        }
      } else {
        Alert.alert(
          'Error',
          response.message ||
            'Failed to authenticate with unique ID. Please try again.',
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to login. Please try again.');
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
            <Icon
              name="card-account-details"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>Unique ID Login</Text>
          <Text style={styles.subtitle}>
            Enter your 4-character unique ID to login
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Icon
              name="card-account-details"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter 4-character unique ID"
              placeholderTextColor={colors.textSecondary}
              value={uniqueId}
              onChangeText={handleUniqueIdChange}
              keyboardType="default"
              autoCapitalize="characters"
              maxLength={4}
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading || !validateUniqueId(uniqueId)}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="login" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>Login</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Icon name="information" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Your unique ID was provided during registration
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="shield-check" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              This is a secure and quick login method
            </Text>
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
  input: {
    flex: 1,
    ...typography.subtitle,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
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

export default UniqueIdLogin;
