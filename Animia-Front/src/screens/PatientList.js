// src/screens/PatientList.js
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector, useDispatch} from 'react-redux';
import {loginSuccess, logout} from '../store/authSlice';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {API} from '../utils/api';
import dayjs from 'dayjs';

const PatientList = ({navigation, route}) => {
  const {loginMethod, loginValue} = route.params;
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingPatient, setSelectingPatient] = useState(false);

  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const isAuthenticated = authState?.isAuthenticated || false;

  useEffect(() => {
    loadPatients();
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

  const loadPatients = async () => {
    setLoading(true);
    try {
      let response;

      if (loginMethod === 'mobile') {
        // Get patients by phone number
        response = await API.getBeneficiariesByPhone(loginValue);
      } else if (loginMethod === 'unique_id') {
        // Get patients by unique ID
        response = await API.getBeneficiariesByUniqueId(loginValue);
      } else if (loginMethod === 'google') {
        // Get patients by email
        response = await API.getBeneficiariesByEmail(loginValue);
      } else {
        throw new Error('Invalid login method');
      }

      if (response.success) {
        const beneficiaries = response.beneficiaries || [];
        setPatients(beneficiaries);

        // If only one patient, authenticate and navigate directly
        if (beneficiaries.length === 1) {
          const patient = beneficiaries[0];

          // Get token first
          try {
            console.log(
              '[PatientList] Single patient found, authenticating...',
            );

            let authResponse;

            // For unique ID login, use unique-id-login endpoint (no OTP required)
            if (loginMethod === 'unique_id') {
              console.log('[PatientList] Using unique ID login (no OTP)...');
              authResponse = await API.loginWithUniqueId({
                uniqueId: loginValue.toUpperCase(),
                beneficiaryId: patient.id,
              });
            } else if (loginMethod === 'google') {
              // For Google login, use google-login endpoint
              console.log('[PatientList] Using Google login...');
              const googleUser = route.params?.googleUser || {};
              authResponse = await API.loginWithGoogle({
                email: loginValue,
                firebaseUid:
                  googleUser.id ||
                  googleUser.firebaseUid ||
                  `google_${loginValue}`,
                beneficiaryId: patient.id,
              });
            } else {
              // For mobile login, use select-beneficiary endpoint (requires OTP)
              console.log(
                '[PatientList] Using select beneficiary (OTP required)...',
              );
              authResponse = await API.selectBeneficiary(
                loginValue,
                patient.id,
              );
            }

            if (authResponse.success && authResponse.token) {
              console.log('[PatientList] Token received, logging in...');
              const sanitizedPatient = {
                ...patient,
                // Convert all display values to strings to prevent rendering errors
                name: String(patient.name || 'Patient'),
                short_id: String(
                  patient.short_id || patient.id_number || 'N/A',
                ),
                id_number: patient.id_number ? String(patient.id_number) : '',
                unique_id: patient.unique_id ? String(patient.unique_id) : '',
                phone: patient.phone ? String(patient.phone) : '',
                age:
                  patient.age !== undefined && patient.age !== null
                    ? String(patient.age)
                    : '',
                category: patient.category ? String(patient.category) : '',
                latest_hemoglobin:
                  patient.latest_hemoglobin !== undefined &&
                  patient.latest_hemoglobin !== null
                    ? String(patient.latest_hemoglobin)
                    : null,
                latest_anemia_category: patient.latest_anemia_category
                  ? String(patient.latest_anemia_category)
                  : null,
                intervention_ifa_quantity:
                  patient.intervention_ifa_quantity !== undefined &&
                  patient.intervention_ifa_quantity !== null
                    ? String(patient.intervention_ifa_quantity)
                    : '0',
                intervention_ifa_yes: patient.intervention_ifa_yes
                  ? true
                  : false,
                intervention_id: patient.intervention_id || null,
                doctor_name: patient.doctor_name
                  ? String(patient.doctor_name)
                  : '',
                created_at: patient.created_at
                  ? String(patient.created_at)
                  : '',
              };
              dispatch(
                loginSuccess({
                  token: authResponse.token,
                  user: authResponse.user,
                  role: authResponse.user?.role || 'Patient',
                  selectedBeneficiary: sanitizedPatient,
                  loginMethod: loginMethod,
                  loginValue: loginValue,
                }),
              );

              console.log('[PatientList] Login success, navigating...');

              // Navigate to PatientDashboard with sanitized data
              navigation.replace('PatientDashboard', {
                record: sanitizedPatient,
              });
            } else {
              throw new Error(authResponse.message || 'Failed to authenticate');
            }
          } catch (authErr) {
            console.error(
              '[PatientList] Error authenticating single patient:',
              authErr,
            );
            // Set error state to show user-friendly message
            setError(
              'Failed to authenticate. Please try again or contact support.',
            );
            setLoading(false);
          }
        }
      } else {
        setError(response.message || 'Failed to load patients');
      }
    } catch (err) {
      console.error('[Patient List] Error loading patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientPress = async patient => {
    console.log(
      '[PatientList] Patient data being passed to BeneficiaryDetail:',
      patient,
    );
    console.log(
      '[PatientList] Has hemoglobin:',
      Boolean(patient.latest_hemoglobin),
    );
    console.log(
      '[PatientList] Has intervention:',
      Boolean(patient.intervention_id),
    );

    // If already authenticated, just navigate
    if (isAuthenticated) {
      navigation.push('PatientDashboard', {
        record: patient,
      });
      return;
    }

    // Otherwise, we need to get a token first
    setSelectingPatient(true);
    try {
      console.log('[PatientList] Authenticating patient...');

      let response;

      // For unique ID login, use unique-id-login endpoint (no OTP required)
      if (loginMethod === 'unique_id') {
        console.log('[PatientList] Using unique ID login (no OTP)...');
        response = await API.loginWithUniqueId({
          uniqueId: loginValue.toUpperCase(),
          beneficiaryId: patient.id,
        });
      } else if (loginMethod === 'google') {
        // For Google login, use google-login endpoint
        console.log('[PatientList] Using Google login...');
        const googleUser = route.params?.googleUser || {};
        response = await API.loginWithGoogle({
          email: loginValue,
          firebaseUid:
            googleUser.id || googleUser.firebaseUid || `google_${loginValue}`,
          beneficiaryId: patient.id,
        });
      } else {
        // For mobile login, use select-beneficiary endpoint (requires OTP)
        console.log('[PatientList] Using select beneficiary (OTP required)...');
        response = await API.selectBeneficiary(loginValue, patient.id);
      }

      if (response.success && response.token) {
        console.log('[PatientList] Token received, logging in...');

        // Sanitize patient data to ensure all values are strings or properly formatted
        const sanitizedPatient = {
          ...patient,
          // Convert all display values to strings to prevent rendering errors
          name: String(patient.name || 'Patient'),
          short_id: String(patient.short_id || patient.id_number || 'N/A'),
          id_number: patient.id_number ? String(patient.id_number) : '',
          unique_id: patient.unique_id ? String(patient.unique_id) : '',
          phone: patient.phone ? String(patient.phone) : '',
          age:
            patient.age !== undefined && patient.age !== null
              ? String(patient.age)
              : '',
          category: patient.category ? String(patient.category) : '',
          latest_hemoglobin:
            patient.latest_hemoglobin !== undefined &&
            patient.latest_hemoglobin !== null
              ? String(patient.latest_hemoglobin)
              : null,
          latest_anemia_category: patient.latest_anemia_category
            ? String(patient.latest_anemia_category)
            : null,
          intervention_ifa_quantity:
            patient.intervention_ifa_quantity !== undefined &&
            patient.intervention_ifa_quantity !== null
              ? String(patient.intervention_ifa_quantity)
              : '0',
          intervention_ifa_yes: patient.intervention_ifa_yes ? true : false,
          intervention_id: patient.intervention_id || null,
          doctor_name: patient.doctor_name ? String(patient.doctor_name) : '',
          created_at: patient.created_at ? String(patient.created_at) : '',
        };

        // Store the token in Redux
        dispatch(
          loginSuccess({
            token: response.token,
            user: response.user,
            role: response.user?.role || 'Patient',
            selectedBeneficiary: sanitizedPatient,
            loginMethod: loginMethod,
            loginValue: loginValue,
          }),
        );

        console.log('[PatientList] Login success, navigating...');

        // Navigate to PatientDashboard with sanitized data
        navigation.push('PatientDashboard', {
          record: sanitizedPatient,
        });
      } else {
        throw new Error(response.message || 'Failed to authenticate');
      }
    } catch (err) {
      console.error('[PatientList] Error selecting patient:', err);
      Alert.alert(
        'Authentication Error',
        'Failed to authenticate. Please try logging in again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PatientLogin'),
          },
        ],
      );
    } finally {
      setSelectingPatient(false);
    }
  };

  const getStatusBadge = patient => {
    const hasScreening = patient.latest_hemoglobin;
    const hasIntervention = patient.intervention_id;

    if (hasIntervention) {
      return {
        text: 'Completed',
        color: colors.success || '#4CAF50',
        icon: 'check-circle',
      };
    } else if (hasScreening) {
      return {
        text: 'Screened',
        color: colors.warning || '#FF9800',
        icon: 'clock',
      };
    } else {
      return {
        text: 'Registered',
        color: colors.primary,
        icon: 'account',
      };
    }
  };

  const renderPatientItem = ({item}) => {
    const statusBadge = getStatusBadge(item);

    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => handlePatientPress(item)}
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Icon name="account" size={28} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName}>{item.name || '-'}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: statusBadge.color + '20'},
                ]}>
                <Icon
                  name={statusBadge.icon}
                  size={12}
                  color={statusBadge.color}
                />
                <Text style={[styles.statusText, {color: statusBadge.color}]}>
                  {statusBadge.text}
                </Text>
              </View>
            </View>
            <Text style={styles.patientId}>
              ID: {item.short_id || item.unique_id || 'N/A'}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="account" size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              Age: {item.age || 'N/A'} | {item.category || 'N/A'}
            </Text>
          </View>

          {item.latest_hemoglobin && (
            <View style={styles.detailRow}>
              <Icon name="water" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                Hb: {item.latest_hemoglobin} g/dL (
                {item.latest_anemia_category || 'N/A'})
              </Text>
            </View>
          )}

          {item.doctor_name && (
            <View style={styles.detailRow}>
              <Icon name="doctor" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>Dr. {item.doctor_name}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="calendar" size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              Registered: {dayjs(item.created_at).format('DD-MM-YYYY')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="My Patients"
          variant="back"
          role="Patient"
          showBeneficiaryIcon={true}
          rightIcon2Name="information-outline"
          onRightIcon2Press={() => navigation.navigate('Information')}
          rightIconName="logout"
          rightIconPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title="My Patients"
          variant="back"
          role="Patient"
          showBeneficiaryIcon={true}
          rightIcon2Name="information-outline"
          onRightIcon2Press={() => navigation.navigate('Information')}
          rightIconName="logout"
          rightIconPress={handleLogout}
        />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="My Patients"
        variant="back"
        role="Patient"
        showBeneficiaryIcon={true}
        rightIcon2Name="information-outline"
        onRightIcon2Press={() => navigation.navigate('Information')}
        rightIconName="logout"
        rightIconPress={handleLogout}
      />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>
            {patients.length} Patient{patients.length !== 1 ? 's' : ''} Found
          </Text>
          <Text style={styles.subtitle}>
            Tap on any patient to view their complete details
          </Text>
        </View>

        <FlatList
          data={patients}
          renderItem={renderPatientItem}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {/* Loading overlay when selecting patient */}
      {selectingPatient && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingOverlayText}>Authenticating...</Text>
          </View>
        </View>
      )}
    </View>
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
  },
  headerSection: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  listContainer: {
    paddingBottom: spacing.xl,
  },
  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  patientName: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
  },
  patientId: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  cardDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  loadingOverlayText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
});

export default PatientList;
