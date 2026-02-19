
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
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
  platform,
} from '../theme/theme';
import {setRole, clearRole, getRole} from '../utils/role';
import {useDispatch} from 'react-redux';
import {loginSuccess} from '../store/authSlice';
import {API} from '../utils/api';

const RoleCard = ({
  icon,
  label,
  color,
  description,
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

const RoleSelect = ({navigation}) => {
  const dispatch = useDispatch();
  const [isPatientLoading, setIsPatientLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '115421219853-5ra0j5m0lpqp02s33qlm2ajo9cmkkn9j.apps.googleusercontent.com',
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsPatientLoading(true);

      await GoogleSignin.hasPlayServices();

      const userInfo = await GoogleSignin.signIn();
      
      const {user} = userInfo;
      const googleUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        givenName: user.givenName,
        familyName: user.familyName,
      };

      await clearRole();
      await setRole('Patient');

      try {
        const response = await API.patientLoginWithGoogle({
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          photo: googleUser.photo,
        });

        if (response && response.token) {
          dispatch(
            loginSuccess({
              user: {
                role: 'Patient',
                ...googleUser,
              },
              role: 'Patient',
              token: response.token,
              googleUser: googleUser,
            }),
          );
        } else {
          throw new Error('No token received from backend');
        }
      } catch (apiError) {
        
        dispatch(
          loginSuccess({
            user: {
              role: 'Patient',
              ...googleUser,
            },
            role: 'Patient',
            token: 'google_patient_token_' + Date.now(),
            googleUser: googleUser,
          }),
        );
      }

      navigation.replace('Dashboard');
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
      setIsPatientLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    try {
      setIsAdminLoading(true);
      await clearRole();
      await setRole('Admin');
      await new Promise(resolve => setTimeout(resolve, 200));
      navigation.navigate('AdminLogin');
    } catch (error) {
      Alert.alert('Error', 'Failed to set admin role. Please try again.');
    } finally {
      setIsAdminLoading(false);
    }
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
          <Text style={styles.appTitle}>Anaemia Health</Text>
          <Text style={styles.appSubtitle}>
            Anaemia Shield
          </Text>
        </View>
      </View>

      <View style={styles.roleSection}>
        <View style={styles.sectionHeader}>
          <Icon name="account-group" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Choose Your Role</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Select how you'll be using the application
        </Text>

        <View style={styles.roleCards}>
          <RoleCard
            icon="account"
            label="Patient Login"
            description="Login as Patient using various methods"
            color="#4285F4"
            onPress={() => navigation.navigate('PatientLogin')}
            isLoading={isPatientLoading}
          />
          <RoleCard
            icon="shield-account"
            label="Administrator"
            description="Manage system and patient data"
            color={colors.primary}
            onPress={handleAdminLogin}
            isLoading={isAdminLoading}
          />
        </View>
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

  roleSection: {
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
  roleCards: {
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
});

export default RoleSelect;
