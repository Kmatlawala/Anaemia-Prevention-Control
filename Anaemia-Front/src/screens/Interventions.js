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
import ProgressIndicator from '../components/ProgressIndicator';
import ThankYouPopup from '../components/ThankYouPopup';
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
import {useDispatch, useSelector} from 'react-redux';
import {
  getIFARecommendation,
  getIFAPriority,
  getIFAPriorityColor,
  getIFAAgeGroup,
} from '../utils/ifaRecommendations';
import {
  fetchBeneficiaries,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
  addIntervention,
} from '../store/beneficiarySlice';
import NetworkStatus from '../components/NetworkStatus';

const GAP = spacing.md;
const HALF = Math.max(6, spacing.xs);

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
  const [showThankYou, setShowThankYou] = useState(false);
  const scrollRef = useRef(null);

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
  };

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

      const interventionResult = await dispatch(
        addIntervention({
          beneficiaryId: selectedBeneficiary.id,
          ...interventionData,
        }),
      );

      if (fromFlow) {
        setShowThankYou(true);
      } else {
        Alert.alert('Saved', 'Intervention recorded successfully.');
        navigation.goBack();
      }
    } catch (e) {
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

      {}
      {item.latest_hemoglobin && (
        <View style={styles.screeningDataContainer}>
          <Text style={styles.screeningDataTitle}>Latest Screening:</Text>
          <View style={styles.screeningDataRow}>
            <Text style={styles.screeningDataLabel}>Hb:</Text>
            <Text style={styles.screeningDataValue}>
              {item.latest_hemoglobin || 'N/A'} g/dL
            </Text>
            <Text style={styles.screeningDataLabel}>Anemia:</Text>
            <Text style={styles.screeningDataValue}>
              {item.latest_anemia_category || 'N/A'}
            </Text>
          </View>
          {item.screening_notes && (
            <Text style={styles.screeningSymptoms}>
              Symptoms: {item.screening_notes}
            </Text>
          )}
        </View>
      )}

      {}
      {item.intervention_id && (
        <View style={styles.interventionDataContainer}>
          <Text style={styles.interventionDataTitle}>Latest Intervention:</Text>
          <View style={styles.interventionDataRow}>
            <Text style={styles.interventionDataLabel}>IFA:</Text>
            <Text style={styles.interventionDataValue}>
              {item.intervention_ifa_yes
                ? `Yes (${item.intervention_ifa_quantity || 0})`
                : 'No'}
            </Text>
            <Text style={styles.interventionDataLabel}>Calcium:</Text>
            <Text style={styles.interventionDataValue}>
              {item.intervention_calcium_yes
                ? `Yes (${item.intervention_calcium_quantity || 0})`
                : 'No'}
            </Text>
          </View>
          <View style={styles.interventionDataRow}>
            <Text style={styles.interventionDataLabel}>Deworm:</Text>
            <Text style={styles.interventionDataValue}>
              {item.intervention_deworm_yes
                ? `Yes (${item.intervention_deworming_date || 'Date N/A'})`
                : 'No'}
            </Text>
            <Text style={styles.interventionDataLabel}>Referral:</Text>
            <Text style={styles.interventionDataValue}>
              {item.intervention_referral_yes
                ? `Yes (${
                    item.intervention_referral_facility || 'Facility N/A'
                  })`
                : 'No'}
            </Text>
          </View>
          {item.intervention_therapeutic_notes && (
            <Text style={styles.interventionNotes}>
              Therapeutic: {item.intervention_therapeutic_notes}
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
        title="Medical Interventions"
        variant="back"
        onBackPress={() => navigation.goBack()}
        rightIconName="pill"
        rightIconPress={() => {
          if (selectedBeneficiary) {
            navigation.navigate('Registration', {
              record: selectedBeneficiary,
              fromFlow: true,
            });
          }
        }}
      />

      <ProgressIndicator currentStep={3} totalSteps={3} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{paddingBottom: spacing.xl}}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Intervention Details</Text>

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

          {}
          {ifaYes === 'yes' && selectedBeneficiary && (
            <View style={styles.ifaRecommendationContainer}>
              {(() => {
                const age = Number(selectedBeneficiary.age) || 0;
                const gender = selectedBeneficiary.gender || 'female';
                const isPregnant = selectedBeneficiary.is_pregnant || false;
                const isLactating = selectedBeneficiary.is_lactating || false;
                const anemiaCategory =
                  selectedBeneficiary.category || 'Unknown';

                const recommendation = getIFARecommendation(
                  age,
                  gender,
                  isPregnant,
                  isLactating,
                  anemiaCategory,
                );

                const priority = getIFAPriority(
                  anemiaCategory,
                  isPregnant,
                  isLactating,
                );
                const priorityColor = getIFAPriorityColor(priority);
                const ageGroup = getIFAAgeGroup(
                  age,
                  gender,
                  isPregnant,
                  isLactating,
                );

                if (!recommendation.shouldSupplement) {
                  return (
                    <View
                      style={[
                        styles.ifaRecommendationBox,
                        {borderLeftColor: '#9E9E9E'},
                      ]}>
                      <Text style={styles.ifaRecommendationTitle}>
                        IFA Recommendation:
                      </Text>
                      <Text style={styles.ifaRecommendationText}>
                        IFA supplementation not recommended for this age
                        group/category
                      </Text>
                    </View>
                  );
                }

                return (
                  <View
                    style={[
                      styles.ifaRecommendationBox,
                      {borderLeftColor: priorityColor},
                    ]}>
                    <Text style={styles.ifaRecommendationTitle}>
                      IFA Recommendation:
                    </Text>
                    <Text style={styles.ifaRecommendationCategory}>
                      {ageGroup}
                    </Text>

                    <View style={styles.ifaRecommendationDetails}>
                      <Text style={styles.ifaRecommendationLabel}>Dosage:</Text>
                      <Text style={styles.ifaRecommendationValue}>
                        {recommendation.dosage}
                      </Text>
                    </View>

                    <View style={styles.ifaRecommendationDetails}>
                      <Text style={styles.ifaRecommendationLabel}>
                        Frequency:
                      </Text>
                      <Text style={styles.ifaRecommendationValue}>
                        {recommendation.frequency}
                      </Text>
                    </View>

                    <View style={styles.ifaRecommendationDetails}>
                      <Text style={styles.ifaRecommendationLabel}>
                        Duration:
                      </Text>
                      <Text style={styles.ifaRecommendationValue}>
                        {recommendation.duration}
                      </Text>
                    </View>

                    <View style={styles.ifaRecommendationDetails}>
                      <Text style={styles.ifaRecommendationLabel}>
                        Formulation:
                      </Text>
                      <Text style={styles.ifaRecommendationValue}>
                        {recommendation.formulation}
                      </Text>
                    </View>

                    {recommendation.color && (
                      <View style={styles.ifaRecommendationDetails}>
                        <Text style={styles.ifaRecommendationLabel}>
                          Color:
                        </Text>
                        <Text style={styles.ifaRecommendationValue}>
                          {recommendation.color}
                        </Text>
                      </View>
                    )}

                    {recommendation.notes.length > 0 && (
                      <View style={styles.ifaRecommendationNotes}>
                        <Text style={styles.ifaRecommendationNotesTitle}>
                          Notes:
                        </Text>
                        {recommendation.notes.map((note, index) => (
                          <Text
                            key={index}
                            style={styles.ifaRecommendationNote}>
                            • {note}
                          </Text>
                        ))}
                      </View>
                    )}

                    {recommendation.contraindications.length > 0 && (
                      <View style={styles.ifaRecommendationContraindications}>
                        <Text
                          style={
                            styles.ifaRecommendationContraindicationsTitle
                          }>
                          Contraindications:
                        </Text>
                        {recommendation.contraindications.map(
                          (contraindication, index) => (
                            <Text
                              key={index}
                              style={styles.ifaRecommendationContraindication}>
                              ⚠️ {contraindication}
                            </Text>
                          ),
                        )}
                      </View>
                    )}

                    {recommendation.specialInstructions.length > 0 && (
                      <View style={styles.ifaRecommendationSpecial}>
                        <Text style={styles.ifaRecommendationSpecialTitle}>
                          Special Instructions:
                        </Text>
                        {recommendation.specialInstructions.map(
                          (instruction, index) => (
                            <Text
                              key={index}
                              style={
                                styles.ifaRecommendationSpecialInstruction
                              }>
                              ℹ️ {instruction}
                            </Text>
                          ),
                        )}
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
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

      <ThankYouPopup
        visible={showThankYou}
        onClose={() => setShowThankYou(false)}
        onComplete={() => {
          setIfaYes('');
          setIfaQty('');
          setCalciumYes('');
          setCalciumQty('');
          setDewormYes('');
          setDewormingDate('');
          setTheraYes('');
          setTherapeuticNotes('');
          setRefYes('');
          setReferral('');
          setSearchQuery('');
          setSelectedBeneficiary(null);
          setShowErrors(false);
          setErrors({});
          navigation.navigate('Dashboard');
        }}
      />
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

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
    paddingHorizontal: spacing.horizontal,
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
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.sm,
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

  ifaRecommendationContainer: {
    marginTop: spacing.sm,
  },
  ifaRecommendationBox: {
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  ifaRecommendationTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ifaRecommendationCategory: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  ifaRecommendationText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  ifaRecommendationDetails: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  ifaRecommendationLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    width: 80,
  },
  ifaRecommendationValue: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  ifaRecommendationNotes: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ifaRecommendationNotesTitle: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ifaRecommendationNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 14,
  },
  ifaRecommendationContraindications: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ifaRecommendationContraindicationsTitle: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: '#F44336',
    marginBottom: spacing.xs,
  },
  ifaRecommendationContraindication: {
    fontSize: 11,
    color: '#F44336',
    marginBottom: spacing.xs,
    lineHeight: 14,
  },
  ifaRecommendationSpecial: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ifaRecommendationSpecialTitle: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  ifaRecommendationSpecialInstruction: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: spacing.xs,
    lineHeight: 14,
  },
});

export default Interventions;
