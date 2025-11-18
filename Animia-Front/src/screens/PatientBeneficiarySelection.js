
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {API} from '../utils/api';
import {loginSuccess} from '../store/authSlice';

const PatientBeneficiarySelection = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {beneficiaries, loginMethod, loginValue} = route.params;
  const [loading, setLoading] = useState(false);

  const handleBeneficiarySelect = async beneficiary => {
    setLoading(true);
    try {
      let response;

      if (loginMethod === 'mobile') {
        
        response = await API.selectBeneficiary(loginValue, beneficiary.id);
      } else if (loginMethod === 'unique_id') {

        response = await API.loginWithUniqueId({
          uniqueId: loginValue.toUpperCase(),
          beneficiaryId: beneficiary.id,
        });
      } else if (loginMethod === 'google') {
        
        const googleUser = route.params?.googleUser || {};
        response = await API.loginWithGoogle({
          email: loginValue,
          firebaseUid:
            googleUser.id || googleUser.firebaseUid || `google_${loginValue}`,
          beneficiaryId: beneficiary.id,
        });
      } else {
        throw new Error('Invalid login method');
      }

      if (response.success && response.token) {
        
        dispatch(
          loginSuccess({
            user: response.user || {
              id: beneficiary.id,
              name: beneficiary.name,
              email: beneficiary.email,
              phone: beneficiary.phone,
              role: 'Patient',
            },
            role: 'Patient',
            token: response.token,
            selectedBeneficiary: response.beneficiary || beneficiary,
            loginMethod: loginMethod,
            loginValue: loginValue,
          }),
        );

        const selectedBeneficiary = response.beneficiary || beneficiary;
        navigation.replace('PatientDashboard', {
          record: selectedBeneficiary,
        });
      } else {
        Alert.alert(
          'Error',
          response.message || 'Failed to select beneficiary. Please try again.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error?.data?.message ||
          'Failed to select beneficiary. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBeneficiaryItem = ({item}) => (
    <TouchableOpacity
      style={styles.beneficiaryCard}
      onPress={() => handleBeneficiarySelect(item)}
      disabled={loading}>
      <View style={styles.beneficiaryHeader}>
        <View style={styles.beneficiaryInfo}>
          <Text style={styles.beneficiaryName}>{item.name}</Text>
          <Text style={styles.beneficiaryId}>ID: {item.short_id}</Text>
        </View>
        <Icon name="chevron-right" size={24} color={colors.primary} />
      </View>

      <View style={styles.beneficiaryDetails}>
        <View style={styles.detailRow}>
          <Icon name="phone" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>

        {item.alt_phone && (
          <View style={styles.detailRow}>
            <Icon name="phone-plus" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.alt_phone}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Icon name="account" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            Age: {item.age || 'N/A'} | {item.category || 'N/A'}
          </Text>
        </View>

        {item.doctor_name && (
          <View style={styles.detailRow}>
            <Icon name="doctor" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>Dr. {item.doctor_name}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Select Your Profile"
        variant="back"
        onBackPress={() => navigation.goBack()}
        rightIconName="account-multiple"
      />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Multiple Profiles Found</Text>
          <Text style={styles.subtitle}>
            We found {beneficiaries.length} profile(s) associated with your{' '}
            {loginMethod}. Please select the correct profile to continue.
          </Text>
        </View>

        <FlatList
          data={beneficiaries}
          renderItem={renderBeneficiaryItem}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
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
  beneficiaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  beneficiaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  beneficiaryId: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  beneficiaryDetails: {
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    marginTop: spacing.sm,
    fontSize: 16,
  },
});

export default PatientBeneficiarySelection;
