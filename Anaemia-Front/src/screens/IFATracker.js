
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import Header from '../components/Header';
import DOTTracker from '../components/DOTTracker';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {getRole} from '../utils/role';

const IFATracker = ({navigation, route}) => {
  const authState = useSelector(state => state.auth);
  const selectedBeneficiary =
    authState?.selectedBeneficiary || route?.params?.record;
  const [isPatient, setIsPatient] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const r = await getRole();
        const role = r ? String(r).toLowerCase() : '';
        setIsPatient(role === 'patient');
      } catch (error) {
        setIsPatient(true);
      }
    };
    checkRole();
  }, []);

  if (!selectedBeneficiary || !selectedBeneficiary.id) {
    return (
      <View style={styles.container}>
        <Header
          title="IFA Tracker"
          variant="back"
          role="Patient"
          onBackPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('PatientDashboard', {
                record: selectedBeneficiary,
              });
            }
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </View>
    );
  }

  const hasIFA =
    Boolean(selectedBeneficiary.intervention_ifa_yes) ||
    Boolean(selectedBeneficiary.intervention_id);

  return (
    <View style={styles.container}>
      <Header
        title="IFA Tracker"
        variant="back"
        role="Patient"
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('PatientDashboard', {
              record: selectedBeneficiary,
            });
          }
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {hasIFA ? (
          <DOTTracker
            beneficiaryId={selectedBeneficiary.id}
            onUpdate={() => {
              
              }}
          />
        ) : (
          <View style={styles.noIFAContainer}>
            <Icon name="pill-off" size={64} color={colors.textSecondary} />
            <Text style={styles.noIFATitle}>No IFA Prescribed</Text>
            <Text style={styles.noIFAText}>
              IFA (Iron Folic Acid) medication has not been prescribed for you
              yet. Please contact your healthcare provider for more information.
            </Text>
          </View>
        )}
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
  noIFAContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    ...shadows.sm,
  },
  noIFATitle: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  noIFAText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default IFATracker;
