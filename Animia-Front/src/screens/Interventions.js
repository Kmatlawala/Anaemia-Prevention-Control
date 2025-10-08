import React, {useRef, useState, useEffect} from 'react';
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
import DateInput from '../components/DateInput';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import dayjs from 'dayjs';
import {RadioButton, TouchableRipple} from 'react-native-paper';
import {API} from '../utils/api';

const GAP = spacing.md;
const HALF = Math.max(6, spacing.xs);

/* ---------- Small helper: Yes/No radio row ---------- */
const YesNoRow = ({label, value, onChange, error, required}) => {
  const labelColor = error ? '#D9534F' : colors.text;
  return (
    <View style={{marginBottom: GAP}}>
      <View style={styles.row}>
        <Text style={[styles.label, {color: labelColor}]}>
          {label}
          {required ? <Text style={styles.req}> *</Text> : null}
        </Text>

        <RadioButton.Group onValueChange={onChange} value={value || ''}>
          <View style={styles.options}>
            <TouchableRipple
              onPress={() => onChange('yes')}
              rippleColor="rgba(0,0,0,0.08)"
              borderless>
              <View style={styles.opt}>
                <RadioButton value="yes" />
                <Text style={styles.optText}>Yes</Text>
              </View>
            </TouchableRipple>

            <TouchableRipple
              onPress={() => onChange('no')}
              rippleColor="rgba(0,0,0,0.08)"
              borderless>
              <View style={[styles.opt, {marginLeft: spacing.sm}]}>
                <RadioButton value="no" />
                <Text style={styles.optText}>No</Text>
              </View>
            </TouchableRipple>
          </View>
        </RadioButton.Group>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const Interventions = ({route, navigation}) => {
  const beneficiaryId = route?.params?.beneficiaryId || null;

  // Search and selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [ifaYes, setIfaYes] = useState('');
  const [ifaQty, setIfaQty] = useState('');

  const [calciumYes, setCalciumYes] = useState('');
  const [calciumQty, setCalciumQty] = useState('');

  const [dewormYes, setDewormYes] = useState('');
  const [dewormingDate, setDewormingDate] = useState('');

  const [theraYes, setTheraYes] = useState('');
  const [therapeuticNotes, setTherapeuticNotes] = useState('');

  const [refYes, setRefYes] = useState('');
  const [referral, setReferral] = useState('');

  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);

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
        const response = await API.getBeneficiaries(100);
        console.log('[Interventions] API response:', response);
        
        // Extract data from response
        const beneficiaries = response?.data || response;
        console.log('[Interventions] Extracted beneficiaries:', beneficiaries);
        
        if (!Array.isArray(beneficiaries)) {
          console.warn(
            '[Interventions] API returned non-array:',
            beneficiaries,
          );
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
  };

  // ---------- validation ----------
  const runValidation = () => {
    const v = {};
    if (!selectedBeneficiary)
      v.beneficiary = 'Please select a beneficiary first.';

    if (!ifaYes) v.ifaYes = 'Required';
    if (
      ifaYes === 'yes' &&
      (!ifaQty || Number.isNaN(Number(ifaQty)) || Number(ifaQty) <= 0)
    )
      v.ifaQty = 'Enter quantity';

    if (!calciumYes) v.calciumYes = 'Required';
    if (
      calciumYes === 'yes' &&
      (!calciumQty ||
        Number.isNaN(Number(calciumQty)) ||
        Number(calciumQty) <= 0)
    )
      v.calciumQty = 'Enter quantity';

    if (!dewormYes) v.dewormYes = 'Required';
    if (dewormYes === 'yes' && !dewormingDate) v.dewormingDate = 'Select date';

    if (!theraYes) v.theraYes = 'Required';
    if (theraYes === 'yes' && !therapeuticNotes?.trim())
      v.therapeuticNotes = 'Enter details';

    if (!refYes) v.refYes = 'Required';
    if (refYes === 'yes' && !referral?.trim()) v.referral = 'Enter facility';

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

    // Check if beneficiaryId is valid
    if (!selectedBeneficiary || !selectedBeneficiary.id) {
      Alert.alert('Error', 'Please select a beneficiary first.');
      return;
    }

    setSaving(true);
    try {
      const interventionData = {
        ifa_yes: ifaYes === 'yes' ? 1 : 0,
        ifa_quantity: ifaQty ? Number(ifaQty) : null,
        calcium_yes: calciumYes === 'yes' ? 1 : 0,
        calcium_quantity: calciumQty ? Number(calciumQty) : null,
        deworm_yes: dewormYes === 'yes' ? 1 : 0,
        deworming_date: dewormingDate || null,
        therapeutic_yes: theraYes === 'yes' ? 1 : 0,
        therapeutic_notes: therapeuticNotes || null,
        referral_yes: refYes === 'yes' ? 1 : 0,
        referral_facility: referral || null,
        doctor_name: selectedBeneficiary.doctor_name || null,
      };

      console.log('Saving intervention data:', {
        beneficiaryId: selectedBeneficiary.id,
        interventionData,
      });

      const interventionResult = await API.addIntervention(
        selectedBeneficiary.id,
        interventionData,
      );

      console.log('Intervention saved successfully:', interventionResult);
      Alert.alert('Saved', 'Intervention recorded successfully.');
      navigation.goBack();
    } catch (e) {
      console.error('Intervention save error:', e);
      const errorMessage = e.data?.error || e.message || 'Unknown error';
      Alert.alert(
        'Save failed',
        `Unable to save intervention: ${errorMessage}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const err = k => (showErrors && errors[k] ? errors[k] : undefined);
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
        title="Interventions"
        variant="back"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{paddingBottom: spacing.xl}}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIconContainer}>
            <Icon name="pill" size={28} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Medical Interventions</Text>
          <Text style={styles.headerSubtitle}>
            Record treatment and medication details
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Intervention Details</Text>

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

          <YesNoRow
            label="IFA given"
            value={ifaYes}
            onChange={setIfaYes}
            error={err('ifaYes')}
            required
          />
          {ifaYes === 'yes' && (
            <Input
              placeholder="IFA quantity (tablets)"
              keyboardType="numeric"
              value={ifaQty}
              onChangeText={setIfaQty}
              style={[
                styles.input,
                showErrors && errors.ifaQty && styles.inputError,
              ]}
            />
          )}
          {!!err('ifaQty') && (
            <Text style={styles.errorText}>{err('ifaQty')}</Text>
          )}

          <YesNoRow
            label="Calcium given (if pregnant)"
            value={calciumYes}
            onChange={setCalciumYes}
            error={err('calciumYes')}
            required
          />
          {calciumYes === 'yes' && (
            <Input
              placeholder="Calcium quantity"
              keyboardType="numeric"
              value={calciumQty}
              onChangeText={setCalciumQty}
              style={[
                styles.input,
                showErrors && errors.calciumQty && styles.inputError,
              ]}
            />
          )}
          {!!err('calciumQty') && (
            <Text style={styles.errorText}>{err('calciumQty')}</Text>
          )}

          <YesNoRow
            label="Deworming done"
            value={dewormYes}
            onChange={setDewormYes}
            error={err('dewormYes')}
          />
          {dewormYes === 'yes' && (
            <>
              <DateInput
                label="Deworming Date"
                value={dewormingDate}
                onChange={setDewormingDate}
                style={{marginBottom: HALF}}
              />
              {!!err('dewormingDate') && (
                <Text style={styles.errorText}>{err('dewormingDate')}</Text>
              )}
            </>
          )}

          <YesNoRow
            label="Therapeutic management"
            value={theraYes}
            onChange={setTheraYes}
            error={err('theraYes')}
          />
          {theraYes === 'yes' && (
            <Input
              placeholder="Therapeutic details"
              value={therapeuticNotes}
              onChangeText={setTherapeuticNotes}
              multiline
              style={[
                styles.input,
                {height: 90},
                showErrors && errors.therapeuticNotes && styles.inputError,
              ]}
            />
          )}
          {!!err('therapeuticNotes') && (
            <Text style={styles.errorText}>{err('therapeuticNotes')}</Text>
          )}

          <YesNoRow
            label="Referral"
            value={refYes}
            onChange={setRefYes}
            error={err('refYes')}
          />
          {refYes === 'yes' && (
            <Input
              placeholder="Referral facility"
              value={referral}
              onChangeText={setReferral}
              style={[
                styles.input,
                showErrors && errors.referral && styles.inputError,
              ]}
            />
          )}
          {!!err('referral') && (
            <Text style={styles.errorText}>{err('referral')}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && {opacity: 0.7}]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Icon name="content-save" size={20} color="#fff" />
                <Text style={styles.saveText}>Save Interventions</Text>
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
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Field Styles
  fieldBlock: {marginBottom: GAP},
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body,
    marginLeft: spacing.sm,
    flexShrink: 1,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },

  req: {color: '#D9534F', fontWeight: '700'},
  options: {flexDirection: 'row', alignItems: 'center'},
  opt: {flexDirection: 'row', alignItems: 'center', paddingVertical: 2},
  optText: {color: colors.text, marginLeft: 2},
  input: {marginBottom: GAP},
  inputError: {borderColor: '#D9534F', borderWidth: 1},
  errorText: {
    color: '#D9534F',
    marginTop: -spacing.xs,
    marginBottom: GAP - spacing.xs,
    fontSize: 12,
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
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: GAP,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectedBeneficiaryTitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedBeneficiaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  selectedBeneficiaryDetails: {
    fontSize: 14,
    color: colors.textSecondary || '#666',
  },
  selectedBeneficiaryDoctor: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
});

export default Interventions;
