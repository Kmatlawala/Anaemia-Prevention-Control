import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
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

const LoginOptionCard = ({
  icon,
  label,
  description,
  color,
  onPress,
  isLoading = false,
}) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    accessibilityRole="button"
    activeOpacity={0.8}
    disabled={isLoading}>
    <LinearGradient
      colors={[color, color + 'CC']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.cardGradient}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Icon name={icon} size={36} color="#fff" />
          )}
        </View>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
        <View style={styles.arrowContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="arrow-right" size={20} color="#fff" />
          )}
        </View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const PatientLogin = ({navigation}) => {
  const dispatch = useDispatch();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMobileLoading, setIsMobileLoading] = useState(false);
  const [isUniqueIdLoading, setIsUniqueIdLoading] = useState(false);

  React.useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        const webClientId =
          '115421219853-5ra0j5m0lpqp02s33qlm2ajo9cmkkn9j.apps.googleusercontent.com';

        GoogleSignin.configure({
          webClientId: webClientId,
          offlineAccess: true,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
          accountName: '',
          iosClientId: '',
        });
      } catch (error) {}
    };

    configureGoogleSignIn();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);

      try {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      } catch (playServicesError) {
        Alert.alert(
          'Google Play Services Required',
          'Google Play Services is required for Google Sign-In. Please install or update Google Play Services.',
        );
        return;
      }

      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      const userInfo = await GoogleSignin.signIn();
      const user = userInfo.data?.user || userInfo.user || userInfo;
      if (!user || !user.email) {
        throw new Error('Failed to get user information from Google');
      }

      const googleUser = {
        id: user.id || user.sub || `google_${user.email}`,
        name:
          user.name ||
          `${user.givenName || ''} ${user.familyName || ''}`.trim(),
        email: user.email,
        photo: user.photo || user.picture,
        givenName: user.givenName || user.given_name,
        familyName: user.familyName || user.family_name,
      };

      try {
        const beneficiariesResponse = await API.getBeneficiariesByEmail(
          googleUser.email,
        );

        if (
          !beneficiariesResponse.success ||
          beneficiariesResponse.beneficiaries.length === 0
        ) {
          Alert.alert(
            'No Profile Found',
            'No beneficiary profile found with this email address. Please contact your healthcare provider.',
          );
          return;
        }

        const beneficiaries = beneficiariesResponse.beneficiaries;

        if (beneficiaries.length === 1) {
          const beneficiary = beneficiaries[0];
          try {
            const loginResponse = await API.loginWithGoogle({
              email: googleUser.email,
              firebaseUid: googleUser.id,
            });

            if (loginResponse.success && loginResponse.token) {
              dispatch(
                loginSuccess({
                  user: {
                    id: beneficiary.id,
                    name: beneficiary.name,
                    email: beneficiary.email,
                    phone: beneficiary.phone,
                    role: 'Patient',
                  },
                  role: 'Patient',
                  token: loginResponse.token,
                  selectedBeneficiary: beneficiary,
                  loginMethod: 'google',
                  loginValue: googleUser.email,
                }),
              );

              navigation.replace('PatientDashboard', {
                record: beneficiary,
              });
            } else {
              throw new Error(loginResponse.message || 'Login failed');
            }
          } catch (loginError) {
            dispatch(
              loginSuccess({
                user: {
                  id: beneficiary.id,
                  name: beneficiary.name,
                  email: beneficiary.email,
                  phone: beneficiary.phone,
                  role: 'Patient',
                },
                role: 'Patient',
                token: 'google_token_' + Date.now(),
                selectedBeneficiary: beneficiary,
                loginMethod: 'google',
                loginValue: googleUser.email,
              }),
            );

            navigation.replace('BeneficiaryDetail', {
              record: beneficiary,
              readOnly: true,
              fromPatientList: true,
              loginMethod: 'google',
              loginValue: googleUser.email,
            });
          }
        } else {
          navigation.replace('PatientList', {
            loginMethod: 'google',
            loginValue: googleUser.email,
            googleUser: googleUser,
          });
        }
      } catch (apiError) {
        Alert.alert(
          'Error',
          apiError?.data?.message ||
            'Failed to verify your account. Please try again.',
        );
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (error.code === statusCodes.IN_PROGRESS) {
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Google Play Services',
          'Google Play Services not available. Please install or update Google Play Services.',
        );
      } else if (error.code === 'DEVELOPER_ERROR') {
        Alert.alert(
          'GOOGLE SIGN-IN ERROR',
          'DEVELOPER_ERROR\n\n' +
            'This error occurs because the RELEASE SHA-1 fingerprint is not registered in Firebase Console.\n\n' +
            'To fix:\n' +
            '1. Go to Firebase Console > Project Settings > Your Android App\n' +
            '2. Add these fingerprints:\n' +
            '   SHA-1: CE:2C:CA:E5:3D:47:4C:47:F4:D5:E1:AF:BA:B1:06:33:3E:7A:F5:7F\n' +
            '   SHA-256: 46:07:06:20:F8:58:F1:70:03:B9:F0:54:26:C0:9D:36:15:A1:E2:61:70:14:1B:D9:55:35:2E:E9:37:7D:CF:3C\n' +
            '3. Wait 5-10 minutes for changes to propagate\n' +
            '4. Rebuild and reinstall the release app\n\n' +
            'Note: Debug and Release builds need DIFFERENT SHA fingerprints!',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ],
        );
      } else {
        Alert.alert(
          'Google Sign-In Error',
          error?.message ||
            `Failed to sign in with Google. Error code: ${
              error.code || 'UNKNOWN'
            }\n\nPlease try again or contact support.`,
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleMobileLogin = () => {
    navigation.navigate('MobileLogin');
  };

  const handleUniqueIdLogin = () => {
    navigation.navigate('UniqueIdLogin');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerSection}>
        <View style={styles.brandWrap}>
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../assets/animiaIcon.png')}
              style={styles.brandIcon}
            />
          </View>
          <Text style={styles.appTitle}>Patient Login</Text>
          <Text style={styles.appSubtitle}>
            Choose your preferred login method
          </Text>
        </View>
      </View>

      <View style={styles.loginSection}>
        <View style={styles.sectionHeader}>
          <Icon name="login" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Login Options</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Select how you want to access your account
        </Text>

        <View style={styles.loginCards}>
          {}
          <LoginOptionCard
            icon="phone"
            label="Mobile Number"
            description="Login using your registered mobile number"
            color="#34A853"
            onPress={handleMobileLogin}
            isLoading={isMobileLoading}
          />
          <LoginOptionCard
            icon="card-account-details"
            label="Unique ID"
            description="Login using your 4-character unique ID"
            color="#FF6B35"
            onPress={handleUniqueIdLogin}
            isLoading={isUniqueIdLoading}
          />
        </View>
      </View>

      <View style={styles.footerSection}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Back to Role Selection</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  headerSection: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  brandWrap: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  brandIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  appTitle: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    color: colors.textSecondary,
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  loginSection: {
    paddingHorizontal: spacing.horizontal,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  loginCards: {
    gap: spacing.md,
  },

  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  cardGradient: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.subtitle,
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.body,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerSection: {
    paddingHorizontal: spacing.horizontal,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
});

export default PatientLogin;
