// src/screens/Screening.js
import React, {useMemo, useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Input from '../components/Input';
import Select from '../components/Select';
import Header from '../components/Header';
import YesNoField from '../components/YesNoField';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import dayjs from 'dayjs';
import {API} from '../utils/api';
import {sendPushToSelf} from '../utils/notifications';

const GAP = spacing.md; // vertical gap between fields
const HALF = Math.max(6, spacing.xs); // small inner gaps

const Screening = ({route, navigation}) => {
  const beneficiaryId = route?.params?.beneficiaryId || null;

  // Search and selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form states
  const [visitType, setVisitType] = useState('Primary');
  const [hb, setHb] = useState('');
  const [pallor, setPallor] = useState('');
  const [anemiaCategory, setAnemiaCategory] = useState('');
  const [hemoglobinLevel, setHemoglobinLevel] = useState('');
  const [symptoms, setSymptoms] = useState([]);

  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);

  const parsedHb = useMemo(() => {
    const v = parseFloat(String(hb).replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  }, [hb]);

  // Search functionality
  useEffect(() => {
    const searchBeneficiaries = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await API.getBeneficiariesWithData(100);
        console.log('[Screening] API response:', response);

        // Extract data from response
        const beneficiaries = response?.data || response;
        console.log('[Screening] Extracted beneficiaries:', beneficiaries);

        if (!Array.isArray(beneficiaries)) {
          console.warn('[Screening] API returned non-array:', beneficiaries);
          setSearchResults([]);
          setShowSearchResults(false);
          return;
        }

        const filtered = beneficiaries.filter(
          beneficiary =>
            beneficiary.name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            beneficiary.short_id
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            beneficiary.id_number
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            beneficiary.phone?.includes(searchQuery) ||
            beneficiary.doctor_name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()),
        );
        setSearchResults(filtered);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchBeneficiaries, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleBeneficiarySelect = beneficiary => {
    setSelectedBeneficiary(beneficiary);
    setSearchQuery(beneficiary.name);
    setShowSearchResults(false);

    // Focus on visit type field
    setTimeout(() => {
      // You can add focus logic here if needed
    }, 100);
  };

  const severity = () => {
    const v = parsedHb;
    if (!Number.isFinite(v)) return 'unknown';
    if (v >= 11) return 'normal';
    if (v >= 8) return 'mild';
    if (v >= 7) return 'moderate';
    return 'severe';
  };

  const runValidation = () => {
    const v = {};

    if (!selectedBeneficiary) v.beneficiary = 'Please select a beneficiary';
    if (!visitType) v.visitType = 'Visit type is required';

    if (String(hb).trim() === '') v.hb = 'Enter Hb value';
    else if (!Number.isFinite(parsedHb)) v.hb = 'Enter a valid number';
    else if (parsedHb <= 0 || parsedHb > 25)
      v.hb = 'Hb must be between 0–25 g/dL';

    if (!pallor) v.pallor = 'Select pallor';
    return v;
  };

  const onSave = async () => {
    const v = runValidation();
    if (Object.keys(v).length) {
      setErrors(v);
      setShowErrors(true);
      scrollRef.current?.scrollTo({y: 0, animated: true});
      return;
    }

    // Additional check for selectedBeneficiary
    if (!selectedBeneficiary || !selectedBeneficiary.id) {
      Alert.alert('Error', 'Please select a beneficiary first.');
      return;
    }

    setSaving(true);
    try {
      const createdAt = dayjs().toISOString();
      const visit = {
        hb: parsedHb,
        mcv: null,
        symptoms: symptoms || null,
        type: visitType,
        classification: pallor || null,
        severity: severity(),
        anemiaCategory: anemiaCategory || null,
        createdAt,
        beneficiaryId: selectedBeneficiary.id,
      };

      console.log('Saving screening data:', {
        beneficiaryId: selectedBeneficiary.id,
        hemoglobin: visit.hb,
        anemia_category: visit.anemiaCategory,
        notes: visit.symptoms,
        doctor_name: selectedBeneficiary.doctor_name,
      });

      // Persist to backend (MySQL)
      const screeningResult = await API.addScreening(selectedBeneficiary.id, {
        beneficiaryId: selectedBeneficiary.id,
        hemoglobin: visit.hb,
        notes: visit.symptoms || null,
        anemia_category: visit.anemiaCategory,
        doctor_name: selectedBeneficiary.doctor_name,
      });

      console.log('Screening saved successfully:', screeningResult);

      if (visit.hb < 7) {
        // Create a minimal follow-up entry as referral
        await API.addFollowup(selectedBeneficiary.id, {
          followup_date: createdAt,
          notes: `Severe anaemia (Hb <7). Hb=${visit.hb}`,
        });
        // Push an FCM alert locally. Replace with targeted push(s) via backend as needed.
        await sendPushToSelf(
          'Severe Anaemia Alert',
          'Severe Anaemia detected (Hb <7). Please seek immediate care.',
          {type: 'alert', severity: 'severe'},
        );
      }

      Alert.alert(
        'Saved',
        `Screening saved successfully. Severity: ${visit.severity}`,
      );
      setVisitType('Primary');
      setHb('');
      setPallor('');
      setAnemiaCategory('');
      setSymptoms('');
      setSearchQuery('');
      setSelectedBeneficiary(null);
      setShowErrors(false);
      setErrors({});
      navigation.goBack();
    } catch (e) {
      console.error('Screening save error:', e);
      const errorMessage = e.data?.error || e.message || 'Unknown error';
      Alert.alert('Save failed', `Unable to save screening: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const sev = severity();
  const errStyle = key =>
    showErrors && errors[key] ? styles.inputError : null;
  const errText = key =>
    showErrors && errors[key] ? (
      <Text style={styles.errorText}>{errors[key]}</Text>
    ) : null;

  const renderSearchResult = ({item}) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleBeneficiarySelect(item)}>
      <Text style={styles.searchResultName}>{item.name}</Text>
      <Text style={styles.searchResultDetails}>
        Short ID: {item.short_id || 'N/A'} | ID: {item.id_number || 'N/A'} |
        Phone: {item.phone || 'N/A'}
      </Text>
      {item.doctor_name && (
        <Text style={styles.searchResultDoctor}>
          Doctor: {item.doctor_name}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <Header
        title="Screening"
        variant="back"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{paddingBottom: spacing.xl}}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIconContainer}>
            <Icon name="stethoscope" size={28} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Health Screening</Text>
          <Text style={styles.headerSubtitle}>
            Record hemoglobin levels and health assessments
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Screening Details</Text>

          {/* Beneficiary Search */}
          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Icon name="account-search" size={20} color={colors.primary} />
              <Text style={styles.label}>Search Beneficiary</Text>
            </View>
            <View style={styles.inputContainer}>
              <Icon
                name="magnify"
                size={18}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <Input
                placeholder="Enter name, ID, phone, or doctor name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, errStyle('beneficiary')]}
              />
            </View>
            {errText('beneficiary')}

            {showSearchResults && (
              <View style={styles.searchResultsContainer}>
                {isSearching ? (
                  <View style={styles.searchLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.searchLoadingText}>Searching...</Text>
                  </View>
                ) : searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={item => item.id.toString()}
                    style={styles.searchResultsList}
                    nestedScrollEnabled
                  />
                ) : (
                  <Text style={styles.noResultsText}>
                    No beneficiaries found
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Selected Beneficiary Info */}
          {selectedBeneficiary && (
            <View style={styles.selectedBeneficiaryContainer}>
              <Text style={styles.selectedBeneficiaryTitle}>
                Selected Beneficiary:
              </Text>
              <Text style={styles.selectedBeneficiaryName}>
                {selectedBeneficiary.name}
              </Text>
              <Text style={styles.selectedBeneficiaryDetails}>
                Short ID: {selectedBeneficiary.short_id || 'N/A'} | ID:{' '}
                {selectedBeneficiary.id_number || 'N/A'} | Phone:{' '}
                {selectedBeneficiary.phone || 'N/A'}
              </Text>
              {selectedBeneficiary.doctor_name && (
                <Text style={styles.selectedBeneficiaryDoctor}>
                  Doctor: {selectedBeneficiary.doctor_name}
                </Text>
              )}
            </View>
          )}

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Visit Type</Text>
            <Select
              value={visitType}
              onChange={setVisitType}
              options={[
                {label: 'Primary', value: 'Primary'},
                {label: 'Follow-up', value: 'Follow-up'},
              ]}
              style={errStyle('visitType')}
            />
            {errText('visitType')}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Hb (g/dL)</Text>
            <Input
              keyboardType="numeric"
              value={hb}
              onChangeText={setHb}
              style={errStyle('hb')}
            />
            {errText('hb')}
          </View>

          <YesNoField
            label="Pallor"
            value={pallor}
            onChange={setPallor}
            error={showErrors ? errors.pallor : undefined}
            required
            style={{marginBottom: GAP}}
          />

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Anemia Category</Text>
            <Select
              value={anemiaCategory}
              onChange={setAnemiaCategory}
              options={[
                {label: 'No anemia', value: 'No anemia'},
                {label: 'Mild', value: 'Mild'},
                {label: 'Moderate', value: 'Moderate'},
                {label: 'Severe', value: 'Severe'},
              ]}
              style={{marginBottom: GAP}}
            />
          </View>

          <View style={[styles.fieldBlock, {marginBottom: GAP}]}>
            <Text style={styles.label}>Symptoms</Text>
            <Input
              placeholder="(fatigue, pallor…)"
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              style={{height: 84}}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              sev === 'severe' && {backgroundColor: colors.error},
            ]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Icon name="content-save" size={20} color="#fff" />
                <Text style={styles.saveText}>Save Screening</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  cardTitle: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: spacing.lg,
  },

  // Field Styles
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: {
    ...typography.body,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...typography.body,
  },

  inputError: {
    borderColor: '#D9534F',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#D9534F',
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },

  // Search results styles
  searchResultsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 200,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  searchResultDetails: {
    fontSize: 14,
    color: colors.textSecondary || '#666',
  },
  searchResultDoctor: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  searchLoadingText: {
    marginLeft: spacing.xs,
    color: colors.text,
  },
  noResultsText: {
    textAlign: 'center',
    padding: spacing.sm,
    color: colors.textSecondary || '#666',
    fontStyle: 'italic',
  },

  // Selected beneficiary styles
  selectedBeneficiaryContainer: {
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '20',
    ...shadows.sm,
  },
  selectedBeneficiaryTitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedBeneficiaryName: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  selectedBeneficiaryDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  selectedBeneficiaryDoctor: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  autoFilledText: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },

  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.md,
    minHeight: 56,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
    fontSize: 16,
  },
});

export default Screening;
