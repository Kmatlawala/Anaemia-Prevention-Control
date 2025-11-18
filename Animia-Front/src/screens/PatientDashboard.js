// src/screens/PatientDashboard.js
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useSelector, useDispatch} from 'react-redux';
import {logout} from '../store/authSlice';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {getRole} from '../utils/role';

const PatientDashboard = ({navigation, route}) => {
  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const rawBeneficiary =
    authState?.selectedBeneficiary || route?.params?.record;

  // Sanitize beneficiary data to ensure all values are properly formatted
  // Explicitly map only needed fields to avoid any raw numeric/boolean values
  const selectedBeneficiary = rawBeneficiary
    ? {
        // Essential IDs (spread the rest for backward compatibility)
        ...rawBeneficiary,
        // Override critical display fields with safe string values
        name: rawBeneficiary.name ? String(rawBeneficiary.name) : 'Patient',
        short_id: rawBeneficiary.short_id
          ? String(rawBeneficiary.short_id)
          : rawBeneficiary.id_number
          ? String(rawBeneficiary.id_number)
          : 'N/A',
        unique_id: rawBeneficiary.unique_id
          ? String(rawBeneficiary.unique_id)
          : '',
        id_number: rawBeneficiary.id_number
          ? String(rawBeneficiary.id_number)
          : '',
        latest_hemoglobin:
          rawBeneficiary.latest_hemoglobin !== undefined &&
          rawBeneficiary.latest_hemoglobin !== null
            ? String(rawBeneficiary.latest_hemoglobin)
            : null,
        latest_anemia_category: rawBeneficiary.latest_anemia_category
          ? String(rawBeneficiary.latest_anemia_category)
          : null,
        intervention_ifa_quantity:
          rawBeneficiary.intervention_ifa_quantity !== undefined &&
          rawBeneficiary.intervention_ifa_quantity !== null
            ? String(rawBeneficiary.intervention_ifa_quantity)
            : null,
        intervention_ifa_yes: rawBeneficiary.intervention_ifa_yes
          ? true
          : false,
        intervention_id: rawBeneficiary.intervention_id || null,
        category: rawBeneficiary.category
          ? String(rawBeneficiary.category)
          : null,
      }
    : null;

  const [isPatient, setIsPatient] = useState(false);

  // Debug: Log the beneficiary data
  useEffect(() => {
    try {
      console.log(
        '[PatientDashboard] Beneficiary name:',
        selectedBeneficiary?.name,
      );
      console.log(
        '[PatientDashboard] Beneficiary hemoglobin:',
        selectedBeneficiary?.latest_hemoglobin,
        typeof selectedBeneficiary?.latest_hemoglobin,
      );
      console.log(
        '[PatientDashboard] Beneficiary IFA qty:',
        selectedBeneficiary?.intervention_ifa_quantity,
        typeof selectedBeneficiary?.intervention_ifa_quantity,
      );
    } catch (err) {
      console.error('[PatientDashboard] Error logging data:', err);
    }
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const r = await getRole();
        const role = r ? String(r).toLowerCase() : '';
        setIsPatient(role === 'patient');
      } catch (error) {
        console.warn('Error getting role:', error);
        setIsPatient(true); // Default to patient if error
      }
    };
    checkRole();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [{name: 'RoleSelect'}],
            });
          },
        },
      ],
      {cancelable: true},
    );
  };

  const handleBackPress = () => {
    // Get navigation state to check if PatientList is in the stack
    const navigationState = navigation.getState();
    const routes = navigationState?.routes || [];

    // Check if PatientList exists in the navigation stack
    const hasPatientList = routes.some(route => route.name === 'PatientList');

    // If PatientList is in the stack, navigate to it
    if (hasPatientList) {
      navigation.navigate('PatientList', {
        loginMethod: authState?.loginMethod,
        loginValue: authState?.loginValue,
      });
    } else if (navigation.canGoBack()) {
      // If we can go back but PatientList is not in stack, just go back
      navigation.goBack();
    } else {
      // If no previous screen and no PatientList, ask to logout
      Alert.alert(
        'Logout',
        'Do you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              dispatch(logout());
              navigation.reset({
                index: 0,
                routes: [{name: 'RoleSelect'}],
              });
            },
          },
        ],
        {cancelable: true},
      );
    }
  };

  if (!selectedBeneficiary) {
    return (
      <View style={styles.container}>
        <Header
          title="Patient Dashboard"
          role="Patient"
          rightIconName="logout"
          rightIconPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </View>
    );
  }

  const menuOptions = [
    {
      key: 'information',
      icon: 'information-outline',
      label: 'Information',
      description: 'View health information and guidelines',
      color: colors.info, // Theme info color (blue)
      screen: 'Information',
    },
    {
      key: 'ifa-tracker',
      icon: 'pill',
      label: 'IFA Tracker',
      description: 'Track your Iron Folic Acid medication',
      color: colors.accent, // Theme accent color (success green) - distinct from info blue
      screen: 'IFATracker',
      params: {
        record: selectedBeneficiary,
      },
    },
    {
      key: 'detail',
      icon: 'account-details',
      label: 'My Details',
      description: 'View your complete health profile',
      color: colors.secondary, // Theme secondary color (warm saffron/orange)
      screen: 'BeneficiaryDetail',
      params: {
        unique_id: String(
          selectedBeneficiary.unique_id ||
            selectedBeneficiary.short_id ||
            'N/A',
        ),
        record: selectedBeneficiary,
        readOnly: true,
        fromPatientList: true,
        fromPatientDashboard: true,
      },
    },
  ];

  const handleMenuPress = option => {
    if (option.params) {
      navigation.navigate(option.screen, option.params);
    } else {
      navigation.navigate(option.screen);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Patient Dashboard"
        variant="back"
        role="Patient"
        onBackPress={handleBackPress}
        rightIcon2Name="information-outline"
        onRightIcon2Press={() => navigation.navigate('Information')}
        rightIconName="logout"
        rightIconPress={handleLogout}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={48} color={colors.primary} />
          </View>
          <Text style={styles.welcomeName}>
            {String(selectedBeneficiary.name || 'Patient')}
          </Text>
          <Text style={styles.welcomeId}>
            ID:{' '}
            {String(
              selectedBeneficiary.short_id ||
                selectedBeneficiary.id_number ||
                'N/A',
            )}
          </Text>
          {selectedBeneficiary.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {selectedBeneficiary.category === 'Pregnant'
                  ? 'PREGNANT'
                  : selectedBeneficiary.category === 'Under5'
                  ? 'CHILD (BELOW 5)'
                  : selectedBeneficiary.category === 'Adolescent'
                  ? 'ADOLESCENT (10-19)'
                  : String(selectedBeneficiary.category).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        {(selectedBeneficiary.latest_hemoglobin ||
          selectedBeneficiary.intervention_id) && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Quick Overview</Text>
            <View style={styles.statsRow}>
              {selectedBeneficiary.latest_hemoglobin && (
                <View style={styles.statCard}>
                  <Icon name="blood-bag" size={24} color={colors.primary} />
                  <Text style={styles.statValue}>
                    {String(selectedBeneficiary.latest_hemoglobin)} g/dL
                  </Text>
                  <Text style={styles.statLabel}>Hemoglobin</Text>
                </View>
              )}
              {selectedBeneficiary.latest_anemia_category && (
                <View style={styles.statCard}>
                  <Icon name="alert-circle" size={24} color={colors.warning} />
                  <Text style={styles.statValue}>
                    {String(selectedBeneficiary.latest_anemia_category)}
                  </Text>
                  <Text style={styles.statLabel}>Anemia Status</Text>
                </View>
              )}
              {selectedBeneficiary.intervention_ifa_yes && (
                <View style={styles.statCard}>
                  <Icon name="pill" size={24} color={colors.secondary} />
                  <Text style={styles.statValue}>
                    {String(selectedBeneficiary.intervention_ifa_quantity || 0)}
                  </Text>
                  <Text style={styles.statLabel}>IFA Tablets</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu</Text>
          {menuOptions.map((option, index) => (
            <TouchableOpacity
              key={option.key}
              style={styles.menuCard}
              onPress={() => handleMenuPress(option)}
              activeOpacity={0.8}>
              <LinearGradient
                colors={[option.color, option.color + 'CC']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.menuGradient}>
                <View style={styles.menuContent}>
                  <View style={styles.menuIconContainer}>
                    <Icon name={option.icon} size={32} color="#fff" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuLabel}>{option.label}</Text>
                    <Text style={styles.menuDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
  },
  welcomeSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  welcomeName: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  welcomeId: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  menuCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  menuGradient: {
    padding: spacing.lg,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    ...typography.subtitle,
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  menuDescription: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default PatientDashboard;
