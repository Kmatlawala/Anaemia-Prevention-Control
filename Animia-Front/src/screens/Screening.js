
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
import ProgressIndicator from '../components/ProgressIndicator';
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
import {useDispatch, useSelector} from 'react-redux';
import {
  getAnemiaClassification,
  getAgeGroup,
  getAnemiaColor,
} from '../utils/anemiaClassification';
import {
  fetchBeneficiaries,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
  addScreening,
} from '../store/beneficiarySlice';
import NetworkStatus from '../components/NetworkStatus';

const GAP = spacing.md; 
const HALF = Math.max(6, spacing.xs); 

const Screening = ({route, navigation}) => {
  const dispatch = useDispatch();
  const beneficiaryId = route?.params?.beneficiaryId || null;
  const beneficiaryData = route?.params?.beneficiaryData || null;
  const fromFlow = route?.params?.fromFlow || false;

  const beneficiaries = useSelector(selectBeneficiaries);
  const beneficiaryLoading = useSelector(selectBeneficiaryLoading);
  const beneficiaryError = useSelector(selectBeneficiaryError);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [visitType, setVisitType] = useState('Primary');
  const [hb, setHb] = useState('');
  const [pallor, setPallor] = useState('');
  const [pallorLocation, setPallorLocation] = useState([]);
  const [anemiaCategory, setAnemiaCategory] = useState('');
  const [hemoglobinLevel, setHemoglobinLevel] = useState('');
  const [symptoms, setSymptoms] = useState([]);

  const anemiaSymptoms = [
    'Fatigue',
    'Weakness',
    'Shortness of breath',
    'Dizziness',
    'Pale skin',
    'Irregular heartbeat',
    'Cold hands and feet',
    'Headache',
    'Chest pain',
    'Brittle nails',
    'Hair loss',
    'Sore tongue',
  ];

  const toggleSymptom = symptom => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom],
    );
  };

  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);

  const parsedHb = useMemo(() => {
    const v = parseFloat(String(hb).replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  }, [hb]);

  useEffect(() => {
    if (selectedBeneficiary && Number.isFinite(parsedHb) && parsedHb > 0) {
      
      const age = selectedBeneficiary.age || 0;
      const gender = selectedBeneficiary.gender || 'female';
      const isPregnant = selectedBeneficiary.is_pregnant || false;

      const ageGroup = getAgeGroup(age, gender, isPregnant);

      const classification = getAnemiaClassification(
        parsedHb,
        ageGroup,
        gender,
        isPregnant,
      );

      if (classification.category !== 'Unknown') {
        setAnemiaCategory(classification.category);
      }
    }
  }, [parsedHb, selectedBeneficiary]);

  useEffect(() => {
    if (pallor !== 'yes') {
      setPallorLocation([]);
    }
  }, [pallor]);

  useEffect(() => {
    dispatch(fetchBeneficiaries());
  }, [dispatch]);

  useEffect(() => {
    if (fromFlow && beneficiaryData) {
      setSelectedBeneficiary(beneficiaryData);
      setSearchQuery(beneficiaryData.name);
    }
  }, [fromFlow, beneficiaryData]);

  useEffect(() => {
    const searchBeneficiaries = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        
        await dispatch(fetchBeneficiaries());

        const allBeneficiaries = beneficiaries;
        if (!Array.isArray(allBeneficiaries) || allBeneficiaries.length === 0) {
          setSearchResults([]);
          setShowSearchResults(false);
          return;
        }

        const filtered = allBeneficiaries.filter(
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

        const transformedBeneficiaries = filtered.map(beneficiary => ({
          ...beneficiary,
          latest_screening: beneficiary.latest_hemoglobin
            ? {
                hemoglobin: beneficiary.latest_hemoglobin,
                anemia_category: beneficiary.latest_anemia_category,
                notes: beneficiary.screening_notes,
                created_at: beneficiary.last_screening_date,
              }
            : null,
          latest_intervention: beneficiary.intervention_id
            ? {
                ifa_yes: beneficiary.intervention_ifa_yes,
                ifa_quantity: beneficiary.intervention_ifa_quantity,
                calcium_yes: beneficiary.intervention_calcium_yes,
                calcium_quantity: beneficiary.intervention_calcium_quantity,
                deworm_yes: beneficiary.intervention_deworm_yes,
                deworming_date: beneficiary.intervention_deworming_date,
                therapeutic_yes: beneficiary.intervention_therapeutic_yes,
                therapeutic_notes: beneficiary.intervention_therapeutic_notes,
                referral_yes: beneficiary.intervention_referral_yes,
                referral_facility: beneficiary.intervention_referral_facility,
                created_at: beneficiary.last_intervention_date,
              }
            : null,
        }));
        setSearchResults(transformedBeneficiaries);
        setShowSearchResults(true);
      } catch (error) {
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

    setTimeout(() => {
      
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

    if (String(hb).trim() === '') v.hb = 'Enter Hb value';
    else if (!Number.isFinite(parsedHb)) v.hb = 'Enter a valid number';
    else if (parsedHb <= 0 || parsedHb > 25)
      v.hb = 'Hb must be between 0–25 g/dL';

    if (!pallor) v.pallor = 'Select pallor';
    if (pallor === 'yes' && (!pallorLocation || pallorLocation.length === 0)) {
      v.pallorLocation = 'Please select at least one pallor location';
    }
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
        symptoms:
          Array.isArray(symptoms) && symptoms.length > 0
            ? symptoms.join(', ')
            : null,
        type: 'Primary', 
        classification: pallor || null,
        severity: severity(),
        anemiaCategory: anemiaCategory || null,
        createdAt,
        beneficiaryId: selectedBeneficiary.id,
      };

      const symptomsString =
        Array.isArray(symptoms) && symptoms.length > 0
          ? symptoms.join(', ')
          : null;

      const screeningResult = await dispatch(
        addScreening({
          beneficiaryId: selectedBeneficiary.id,
          hemoglobin: visit.hb,
          notes: symptomsString,
          anemia_category: visit.anemiaCategory,
          pallor: pallor,
          pallor_location:
            pallor === 'yes' && pallorLocation.length > 0
              ? pallorLocation.join(', ')
              : null,
          visit_type: 'Primary', 
          severity: visit.severity,
          doctor_name: selectedBeneficiary.doctor_name,
        }),
      );

      if (visit.hb < 7) {
        
        await API.addFollowup(selectedBeneficiary.id, {
          followup_date: createdAt,
          notes: `Severe anaemia (Hb <7). Hb=${visit.hb}`,
        });
        
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

      if (fromFlow) {
        
        const updatedBeneficiary = {
          ...selectedBeneficiary,
          category: anemiaCategory,
          latest_anemia_category: anemiaCategory,
          
          age: selectedBeneficiary.age || 0,
          
          gender: selectedBeneficiary.gender || 'female',
          is_pregnant: selectedBeneficiary.is_pregnant || false,
          is_lactating: selectedBeneficiary.is_lactating || false,
        };

        navigation.navigate('Interventions', {
          beneficiaryData: updatedBeneficiary,
          fromFlow: true,
        });
      } else {
        
        setHb('');
        setPallor('');
        setPallorLocation([]);
        setAnemiaCategory('');
        setSymptoms([]);
        setSearchQuery('');
        setSelectedBeneficiary(null);
        setShowErrors(false);
        setErrors({});
        navigation.goBack();
      }
    } catch (e) {
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

      {}
      {item.latest_screening && (
        <View style={styles.screeningDataContainer}>
          <Text style={styles.screeningDataTitle}>Latest Screening:</Text>
          <View style={styles.screeningDataRow}>
            <Text style={styles.screeningDataLabel}>Hb:</Text>
            <Text style={styles.screeningDataValue}>
              {item.latest_screening.hemoglobin || 'N/A'} g/dL
            </Text>
            <Text style={styles.screeningDataLabel}>Anemia:</Text>
            <Text style={styles.screeningDataValue}>
              {item.latest_screening.anemia_category || 'N/A'}
            </Text>
          </View>
          {item.latest_screening.notes && (
            <Text style={styles.screeningSymptoms}>
              Symptoms: {item.latest_screening.notes}
            </Text>
          )}
        </View>
      )}

      {}
      {item.latest_intervention && (
        <View style={styles.interventionDataContainer}>
          <Text style={styles.interventionDataTitle}>Latest Intervention:</Text>
          <View style={styles.interventionDataRow}>
            <Text style={styles.interventionDataLabel}>IFA:</Text>
            <Text style={styles.interventionDataValue}>
              {item.latest_intervention.ifa_yes
                ? `Yes (${item.latest_intervention.ifa_quantity || 0})`
                : 'No'}
            </Text>
            <Text style={styles.interventionDataLabel}>Calcium:</Text>
            <Text style={styles.interventionDataValue}>
              {item.latest_intervention.calcium_yes
                ? `Yes (${item.latest_intervention.calcium_quantity || 0})`
                : 'No'}
            </Text>
          </View>
          <View style={styles.interventionDataRow}>
            <Text style={styles.interventionDataLabel}>Deworm:</Text>
            <Text style={styles.interventionDataValue}>
              {item.latest_intervention.deworm_yes
                ? `Yes (${
                    item.latest_intervention.deworming_date || 'Date N/A'
                  })`
                : 'No'}
            </Text>
            <Text style={styles.interventionDataLabel}>Referral:</Text>
            <Text style={styles.interventionDataValue}>
              {item.latest_intervention.referral_yes
                ? `Yes (${
                    item.latest_intervention.referral_facility || 'Facility N/A'
                  })`
                : 'No'}
            </Text>
          </View>
          {item.latest_intervention.therapeutic_notes && (
            <Text style={styles.interventionNotes}>
              Therapeutic: {item.latest_intervention.therapeutic_notes}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <NetworkStatus />
      <Header
        title="Health Screening"
        variant="back"
        onBackPress={() => navigation.goBack()}
        rightIconName="stethoscope"
        rightIconPress={() => {
          if (selectedBeneficiary) {
            navigation.navigate('Registration', {
              record: selectedBeneficiary,
              fromFlow: true,
            });
          }
        }}
      />

      <ProgressIndicator currentStep={2} totalSteps={3} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{paddingBottom: spacing.xl}}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Screening Details</Text>

          {}
          {!fromFlow ? (
            <>
              {}
              <View style={styles.fieldBlock}>
                <View style={styles.fieldHeader}>
                  <Icon
                    name="account-search"
                    size={20}
                    color={colors.primary}
                  />
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
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                        <Text style={styles.searchLoadingText}>
                          Searching...
                        </Text>
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

              {}
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
            </>
          ) : (
            
            selectedBeneficiary && (
              <View style={styles.selectedBeneficiaryContainer}>
                <Text style={styles.selectedBeneficiaryTitle}>
                  Beneficiary Details:
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
            )
          )}

          {}
          <View style={styles.fieldBlock}>
            <View style={styles.inlineLabel}>
              <Text style={styles.label}>Visit Type: </Text>
              <Text style={styles.primaryText}>Primary</Text>
            </View>
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

            {}
            {selectedBeneficiary &&
              Number.isFinite(parsedHb) &&
              parsedHb > 0 && (
                <View style={styles.autoClassificationContainer}>
                  {(() => {
                    const age = selectedBeneficiary.age || 0;
                    const gender = selectedBeneficiary.gender || 'female';
                    const isPregnant = selectedBeneficiary.is_pregnant || false;
                    const ageGroup = getAgeGroup(age, gender, isPregnant);
                    const classification = getAnemiaClassification(
                      parsedHb,
                      ageGroup,
                      gender,
                      isPregnant,
                    );
                    const color = getAnemiaColor(classification.severity);

                    return (
                      <View
                        style={[
                          styles.classificationBox,
                          {borderLeftColor: color},
                        ]}>
                        <Text style={styles.classificationTitle}>
                          WHO Classification:
                        </Text>
                        <Text style={[styles.classificationCategory, {color}]}>
                          {classification.category}
                        </Text>
                        <Text style={styles.classificationDescription}>
                          {classification.description}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              )}
          </View>

          <YesNoField
            label="Pallor"
            value={pallor}
            onChange={setPallor}
            error={showErrors ? errors.pallor : undefined}
            required
            style={{marginBottom: GAP}}
          />

          {}
          {pallor === 'yes' && (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>
                Pallor Location
                {showErrors && errors.pallorLocation ? (
                  <Text style={styles.req}> *</Text>
                ) : null}
              </Text>
              <View style={styles.pallorLocationContainer}>
                {['Tongue', 'Conjunctiva', 'Palm'].map((location, index) => {
                  const isSelected = pallorLocation.includes(location);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.pallorLocationCheckbox,
                        isSelected && styles.pallorLocationCheckboxSelected,
                      ]}
                      onPress={() => {
                        setPallorLocation(prev =>
                          prev.includes(location)
                            ? prev.filter(loc => loc !== location)
                            : [...prev, location],
                        );
                      }}
                      activeOpacity={0.7}>
                      <Icon
                        name={
                          isSelected
                            ? 'checkbox-marked'
                            : 'checkbox-blank-outline'
                        }
                        size={24}
                        color={
                          isSelected ? colors.primary : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.pallorLocationText,
                          isSelected && styles.pallorLocationTextSelected,
                        ]}>
                        {location}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {showErrors && errors.pallorLocation && (
                <Text style={styles.errorText}>{errors.pallorLocation}</Text>
              )}
            </View>
          )}

          <View style={[styles.fieldBlock, {marginBottom: GAP}]}>
            <Text style={styles.label}>Symptoms</Text>
            <View style={styles.symptomsContainer}>
              {anemiaSymptoms.map((symptom, index) => {
                const isSelected = symptoms.includes(symptom);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.symptomCheckbox,
                      isSelected && styles.symptomCheckboxSelected,
                    ]}
                    onPress={() => toggleSymptom(symptom)}
                    activeOpacity={0.7}>
                    <Icon
                      name={
                        isSelected
                          ? 'checkbox-marked'
                          : 'checkbox-blank-outline'
                      }
                      size={24}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.symptomText,
                        isSelected && styles.symptomTextSelected,
                      ]}>
                      {symptom}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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

  card: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.horizontal,
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
    paddingHorizontal: spacing.horizontal,
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
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
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
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
  },
  searchLoadingText: {
    marginLeft: spacing.xs,
    color: colors.text,
  },
  noResultsText: {
    textAlign: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
    color: colors.textSecondary || '#666',
    fontStyle: 'italic',
  },

  selectedBeneficiaryContainer: {
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
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

  screeningDataContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  screeningDataTitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screeningDataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  screeningDataLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  screeningDataValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginRight: spacing.md,
  },
  screeningSymptoms: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 14,
  },

  interventionDataContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary || '#4CAF50',
  },
  interventionDataTitle: {
    fontSize: 12,
    color: colors.secondary || '#4CAF50',
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interventionDataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  interventionDataLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  interventionDataValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginRight: spacing.md,
  },
  interventionNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 14,
  },

  autoClassificationContainer: {
    marginTop: spacing.sm,
  },
  classificationBox: {
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  classificationTitle: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  classificationCategory: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  classificationDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  classificationDetails: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  req: {
    color: '#D9534F',
    fontWeight: '700',
  },
  pallorLocationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  pallorLocationCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    minWidth: 140,
    flex: 1,
    maxWidth: '48%',
  },
  pallorLocationCheckboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pallorLocationText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  pallorLocationTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  symptomCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    minWidth: 140,
    flex: 1,
    maxWidth: '48%',
  },
  symptomCheckboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  symptomText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  symptomTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  inlineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});

export default Screening;
