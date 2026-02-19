// src/screens/BeneficiaryDetail.js
import React, {useEffect, useRef, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {logout} from '../store/authSlice';
import store from '../store/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import Input from '../components/Input';
import {API} from '../utils/api';
import {getRole} from '../utils/role';
import SendSMS from '../components/SendSMS';
import CleanSMSComponent from '../components/CleanSMSComponent';
import NetworkStatus from '../components/NetworkStatus';
import {useFocusEffect} from '@react-navigation/native';
import {
  setCurrentBeneficiary,
  updateBeneficiary,
  fetchBeneficiaries,
  updateIntervention,
  addIntervention,
  addScreening,
  setLoading,
  setError,
  selectCurrentBeneficiary,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
} from '../store/beneficiarySlice';

// Helper function to get anemia category color (using theme colors)
const getAnemiaColor = category => {
  if (!category) return colors.textSecondary;
  const cat = String(category).toLowerCase();
  if (cat.includes('severe')) return colors.severe; // '#EF4444' (red)
  if (cat.includes('moderate')) return colors.moderate; // '#F97316' (dark orange)
  if (cat.includes('mild')) return colors.mild; // '#F59E0B' (orange)
  if (cat.includes('non') || cat.includes('normal')) return colors.normal; // '#10B981' (green)
  return colors.unknown; // '#6B7280' (gray)
};

const BeneficiaryDetail = ({route, navigation}) => {
  const dispatch = useDispatch();
  const {
    unique_id,
    record,
    readOnly,
    fromPatientList,
    loginMethod,
    loginValue,
    fromFollowUp,
    fromPatientDashboard,
  } = route.params || {};
  const uid = unique_id || (record && record.unique_id);
  const currentBeneficiary = useSelector(selectCurrentBeneficiary);
  const loading = useSelector(selectBeneficiaryLoading);
  const error = useSelector(selectBeneficiaryError);
  const [saving, setSaving] = useState(false);
  const [imgModal, setImgModal] = useState({visible: false, uri: null});
  const [smsModal, setSmsModal] = useState({
    visible: false,
    phoneNumber: '',
    message: '',
  });
  const [isPatient, setIsPatient] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previousScreening, setPreviousScreening] = useState(null);
  const [previousIntervention, setPreviousIntervention] = useState(null);
  const isScannerOpenRef = useRef(false);
  const originalRecordRef = useRef(null);
  const previousDataFetchedRef = useRef(false); // Track if previous data has been fetched
  const data = currentBeneficiary;

  // Form state for NEW screening (empty by default)
  const [newHb, setNewHb] = useState('');
  const [newPallor, setNewPallor] = useState('');
  const [newPallorLocation, setNewPallorLocation] = useState([]); // Array for checkboxes like Screening.js
  const [newSymptoms, setNewSymptoms] = useState([]);
  const [newAnemiaCategory, setNewAnemiaCategory] = useState(''); // Auto-calculated

  // Form state for NEW intervention (empty by default)
  const [newIfaYes, setNewIfaYes] = useState('');
  const [newIfaQty, setNewIfaQty] = useState('');
  const [newCalciumYes, setNewCalciumYes] = useState('');
  const [newCalciumQty, setNewCalciumQty] = useState('');
  const [newDewormYes, setNewDewormYes] = useState('');
  const [newDewormingDate, setNewDewormingDate] = useState('');
  const [newTheraYes, setNewTheraYes] = useState('');
  const [newTherapeuticNotes, setNewTherapeuticNotes] = useState('');
  const [newRefYes, setNewRefYes] = useState('');
  const [newReferral, setNewReferral] = useState('');

  const authState = useSelector(state => state.auth);
  const userRole = authState?.role;
  const selectedBeneficiary = authState?.selectedBeneficiary || data;

  // Parse Hb value (like Screening.js)
  const parsedNewHb = useMemo(() => {
    const v = parseFloat(String(newHb).replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  }, [newHb]);

  // Auto-classify anemia when HB is entered (like Screening.js)
  useEffect(() => {
    if (data && Number.isFinite(parsedNewHb) && parsedNewHb > 0) {
      const loadClassification = async () => {
        try {
          const {getAgeGroup, getAnemiaClassification} = await import(
            '../utils/anemiaClassification'
          );
          const age = data.age || 0;
          const gender = data.gender || 'female';
          const isPregnant =
            data.is_pregnant || data.category === 'Pregnant' || false;
          const ageGroup = getAgeGroup(age, gender, isPregnant);
          const classification = getAnemiaClassification(
            parsedNewHb,
            ageGroup,
            gender,
            isPregnant,
          );

          if (classification.category !== 'Unknown') {
            setNewAnemiaCategory(classification.category);
          }
        } catch (error) {
          // Classification failed, continue without it
        }
      };
      loadClassification();
    } else {
      setNewAnemiaCategory('');
    }
  }, [parsedNewHb, data]);

  // Clear pallor location when pallor is changed to 'no' (like Screening.js)
  useEffect(() => {
    if (newPallor !== 'yes') {
      setNewPallorLocation([]);
    }
  }, [newPallor]);

  useEffect(() => {
    if (record) {
      originalRecordRef.current = record;
      dispatch(setCurrentBeneficiary(record));
      if (isFromPatientList) {
        if (
          record.id &&
          (record.intervention_ifa_yes === undefined ||
            record.intervention_ifa_yes === null)
        ) {
          load();
        }
        return;
      }
    }

    if (!isFromPatientList && !data && uid && !hasCompleteData) {
      load();
    }
  }, [uid, record, hasCompleteData, isFromPatientList]);

  // Check if record already has screening/intervention data
  const hasCompleteData = useMemo(() => {
    const hasData =
      record &&
      (Boolean(record.latest_hemoglobin) || Boolean(record.intervention_id));
    return hasData;
  }, [record]);

  // Check if we're coming from PatientList (readOnly mode)
  const isFromPatientList = Boolean(fromPatientList && readOnly && record);

  // Reset previous data fetch flag when beneficiary ID changes
  useEffect(() => {
    previousDataFetchedRef.current = false;
  }, [data?.id]);

  // Fetch previous screening and intervention data for all users
  // If no previous data, use current data for display
  // Once fetched, previous data remains static even when current data is updated
  useEffect(() => {
    const fetchPreviousData = async () => {
      // Only fetch if not already fetched for this beneficiary
      if (data?.id && !previousDataFetchedRef.current) {
        try {
          const historyResponse = await API.getBeneficiaryHistory(data.id);

          if (historyResponse?.success) {
            const screenings = historyResponse.screenings || [];
            const interventions = historyResponse.interventions || [];

            // Get the second most recent (index 1) - previous data
            // Index 0 is the latest/current, index 1 is the previous
            if (screenings.length > 1) {
              setPreviousScreening(screenings[1]);
            } else if (screenings.length === 1 && data.latest_hemoglobin) {
              // If no previous data, use current data for display
              setPreviousScreening({
                hemoglobin: data.latest_hemoglobin,
                anemia_category: data.latest_anemia_category,
                pallor: data.latest_pallor,
                pallor_location: data.latest_pallor_location,
                notes: data.screening_notes,
                created_at: data.last_screening_date,
              });
            } else {
              setPreviousScreening(null);
            }

            if (interventions.length > 1) {
              setPreviousIntervention(interventions[1]);
            } else if (interventions.length === 1 && data.intervention_id) {
              // If no previous data, use current data for display
              setPreviousIntervention({
                ifa_yes: data.intervention_ifa_yes,
                ifa_quantity: data.intervention_ifa_quantity,
                calcium_yes: data.intervention_calcium_yes,
                calcium_quantity: data.intervention_calcium_quantity,
                deworm_yes: data.intervention_deworm_yes,
                deworming_date: data.intervention_deworming_date,
                therapeutic_yes: data.intervention_therapeutic_yes,
                therapeutic_notes: data.intervention_therapeutic_notes,
                referral_yes: data.intervention_referral_yes,
                referral_facility: data.intervention_referral_facility,
                created_at: data.last_intervention_date,
              });
            } else {
              setPreviousIntervention(null);
            }

            // Mark as fetched so it won't update when current data changes
            previousDataFetchedRef.current = true;
          } else if (data.latest_hemoglobin || data.intervention_id) {
            // If API fails but we have current data, use it for display
            if (data.latest_hemoglobin) {
              setPreviousScreening({
                hemoglobin: data.latest_hemoglobin,
                anemia_category: data.latest_anemia_category,
                pallor: data.latest_pallor,
                pallor_location: data.latest_pallor_location,
                notes: data.screening_notes,
                created_at: data.last_screening_date,
              });
            }
            if (data.intervention_id) {
              setPreviousIntervention({
                ifa_yes: data.intervention_ifa_yes,
                ifa_quantity: data.intervention_ifa_quantity,
                calcium_yes: data.intervention_calcium_yes,
                calcium_quantity: data.intervention_calcium_quantity,
                deworm_yes: data.intervention_deworm_yes,
                deworming_date: data.intervention_deworming_date,
                therapeutic_yes: data.intervention_therapeutic_yes,
                therapeutic_notes: data.intervention_therapeutic_notes,
                referral_yes: data.intervention_referral_yes,
                referral_facility: data.intervention_referral_facility,
                created_at: data.last_intervention_date,
              });
            }
            previousDataFetchedRef.current = true;
          }
        } catch (error) {
          // On error, use current data if available
          if (data.latest_hemoglobin) {
            setPreviousScreening({
              hemoglobin: data.latest_hemoglobin,
              anemia_category: data.latest_anemia_category,
              pallor: data.latest_pallor,
              pallor_location: data.latest_pallor_location,
              notes: data.screening_notes,
              created_at: data.last_screening_date,
            });
          } else {
            setPreviousScreening(null);
          }
          if (data.intervention_id) {
            setPreviousIntervention({
              ifa_yes: data.intervention_ifa_yes,
              ifa_quantity: data.intervention_ifa_quantity,
              calcium_yes: data.intervention_calcium_yes,
              calcium_quantity: data.intervention_calcium_quantity,
              deworm_yes: data.intervention_deworm_yes,
              deworming_date: data.intervention_deworming_date,
              therapeutic_yes: data.intervention_therapeutic_yes,
              therapeutic_notes: data.intervention_therapeutic_notes,
              referral_yes: data.intervention_referral_yes,
              referral_facility: data.intervention_referral_facility,
              created_at: data.last_intervention_date,
            });
          } else {
            setPreviousIntervention(null);
          }
          previousDataFetchedRef.current = true;
        }
      } else if (!data?.id) {
        // Reset when no data
        setPreviousScreening(null);
        setPreviousIntervention(null);
        previousDataFetchedRef.current = false;
      }
    };

    fetchPreviousData();
  }, [data?.id]);

  useEffect(() => {
    const checkRole = async () => {
      try {
        // Check role from both AsyncStorage and Redux state
        const r = await getRole();
        const role = r ? String(r).toLowerCase() : '';
        const reduxRole = userRole ? String(userRole).toLowerCase() : '';

        // Use Redux role if available, otherwise use AsyncStorage role
        const finalRole = reduxRole || role;
        const isPatientRole = finalRole === 'patient';
        const isAdminRole = finalRole === 'admin';

        setIsPatient(isPatientRole);
        setIsAdmin(isAdminRole);
      } catch (error) {
        // Fallback: check Redux state
        const reduxRole = userRole ? String(userRole).toLowerCase() : '';
        setIsPatient(reduxRole === 'patient');
        setIsAdmin(reduxRole === 'admin');
      }
    };

    checkRole();
  }, [userRole]);

  // Pre-populate form fields for Admin when NOT from follow-up
  useEffect(() => {
    // Only pre-populate if:
    // 1. User is admin
    // 2. NOT from follow-up screen
    // 3. Has existing data
    // 4. Forms are currently empty (to avoid overwriting user input)
    if (isAdmin && !fromFollowUp && data) {
      // Pre-populate screening fields if empty and data exists
      if (!newHb && data.latest_hemoglobin) {
        setNewHb(String(data.latest_hemoglobin));
      }
      if (!newPallor && data.latest_pallor) {
        setNewPallor(data.latest_pallor);
      }
      if (newPallorLocation.length === 0 && data.latest_pallor_location) {
        setNewPallorLocation(data.latest_pallor_location.split(', '));
      }
      if (newSymptoms.length === 0 && data.screening_notes) {
        // Try to parse symptoms from notes
        setNewSymptoms([]);
      }
      if (!newAnemiaCategory && data.latest_anemia_category) {
        setNewAnemiaCategory(data.latest_anemia_category);
      }

      // Pre-populate intervention fields if empty and data exists
      if (
        !newIfaYes &&
        data.intervention_ifa_yes !== undefined &&
        data.intervention_ifa_yes !== null
      ) {
        const ifaValue =
          data.intervention_ifa_yes === 1 ||
          data.intervention_ifa_yes === true ||
          data.intervention_ifa_yes === 'yes'
            ? 'yes'
            : 'no';
        setNewIfaYes(ifaValue);
      }
      if (!newIfaQty && data.intervention_ifa_quantity) {
        setNewIfaQty(String(data.intervention_ifa_quantity));
      }
      if (
        !newCalciumYes &&
        data.intervention_calcium_yes !== undefined &&
        data.intervention_calcium_yes !== null
      ) {
        const calciumValue =
          data.intervention_calcium_yes === 1 ||
          data.intervention_calcium_yes === true ||
          data.intervention_calcium_yes === 'yes'
            ? 'yes'
            : 'no';
        setNewCalciumYes(calciumValue);
      }
      if (!newCalciumQty && data.intervention_calcium_quantity) {
        setNewCalciumQty(String(data.intervention_calcium_quantity));
      }
      if (
        !newDewormYes &&
        data.intervention_deworm_yes !== undefined &&
        data.intervention_deworm_yes !== null
      ) {
        const dewormValue =
          data.intervention_deworm_yes === 1 ||
          data.intervention_deworm_yes === true ||
          data.intervention_deworm_yes === 'yes'
            ? 'yes'
            : 'no';
        setNewDewormYes(dewormValue);
      }
      if (!newDewormingDate && data.intervention_deworming_date) {
        setNewDewormingDate(
          dayjs(data.intervention_deworming_date).format('DD-MM-YYYY'),
        );
      }
      if (
        !newTheraYes &&
        data.intervention_therapeutic_yes !== undefined &&
        data.intervention_therapeutic_yes !== null
      ) {
        const theraValue =
          data.intervention_therapeutic_yes === 1 ||
          data.intervention_therapeutic_yes === true ||
          data.intervention_therapeutic_yes === 'yes'
            ? 'yes'
            : 'no';
        setNewTheraYes(theraValue);
      }
      if (!newTherapeuticNotes && data.intervention_therapeutic_notes) {
        setNewTherapeuticNotes(data.intervention_therapeutic_notes);
      }
      if (!newRefYes && data.intervention_referral_facility) {
        setNewRefYes('yes');
      }
      if (!newReferral && data.intervention_referral_facility) {
        setNewReferral(data.intervention_referral_facility);
      }
    }
  }, [isAdmin, fromFollowUp, data]);

  const shouldShowReadOnly = Boolean(
    readOnly ||
      isPatient ||
      (data && (data.latest_hemoglobin || data.intervention_id) && !isAdmin),
  );

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

  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        navigation.goBack();
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
    }, [navigation]),
  );

  const load = async () => {
    dispatch(setLoading(true));
    try {
      // If coming from PatientList, check if we have complete intervention data
      if (isFromPatientList && record) {
        // If record has intervention data, use it directly
        if (
          record.intervention_ifa_yes !== undefined &&
          record.intervention_ifa_yes !== null
        ) {
          dispatch(setCurrentBeneficiary(record));
          dispatch(setLoading(false));
          return;
        }

        // If missing intervention data, try to fetch complete beneficiary data
        if (record.id) {
          try {
            const beneficiaryData = await API.getBeneficiary(record.id);
            if (beneficiaryData) {
              // Merge with existing record data to preserve all fields
              const completeData = {...record, ...beneficiaryData};
              dispatch(setCurrentBeneficiary(completeData));
              dispatch(setLoading(false));
              return;
            }
          } catch (fetchError) {
            // Fallback to using record data even if incomplete
            dispatch(setCurrentBeneficiary(record));
            dispatch(setLoading(false));
            return;
          }
        }

        // If no ID, just use the record as-is
        dispatch(setCurrentBeneficiary(record));
        dispatch(setLoading(false));
        return;
      }

      // If record already has complete data, don't make API call
      if (hasCompleteData) {
        dispatch(setLoading(false));
        return;
      }

      // Use Redux thunk to fetch beneficiaries (with offline support)
      const fetchResult = await dispatch(fetchBeneficiaries());

      if (fetchResult.type.endsWith('/fulfilled')) {
        // Get beneficiaries from Redux store
        const beneficiaries = fetchResult.payload || [];
        const beneficiary = beneficiaries.find(
          b => b.short_id === uid || b.unique_id === uid,
        );

        if (beneficiary) {
          // Store original record for comparison
          originalRecordRef.current = beneficiary;
          dispatch(setCurrentBeneficiary(beneficiary));
        } else {
          dispatch(setError('Beneficiary not found.'));
          Alert.alert('Error', 'Beneficiary not found.');
        }
      } else {
        dispatch(setError('Unable to load beneficiary.'));
        Alert.alert('Error', 'Unable to load beneficiary.');
      }
    } catch (e) {
      dispatch(setError('Unable to load beneficiary.'));
      Alert.alert('Error', 'Unable to load beneficiary.');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const onChange = (key, value) => {
    dispatch(setCurrentBeneficiary({...data, [key]: value}));
  };

  const onSave = async () => {
    if (readOnly) return;
    if (!data?.id) {
      Alert.alert('Error', 'Missing record id');
      return;
    }
    setSaving(true);
    try {
      // 1. Update beneficiary basic info (if changed)
      const payload = {
        name: data.name || null,
        age: data.age ?? null,
        gender: data.gender || null,
        phone: data.phone || null,
        address: data.address || null,
        id_number: data.id_number || data.id_masked || null,
        aadhaar_hash: data.aadhaar_hash || null,
        dob: data.dob || null,
        category: data.category || null,
        alt_phone: data.alt_phone || null,
        doctor_name: data.doctor_name || null,
        doctor_phone: data.doctor_phone || null,
        registration_date: data.registration_date || null,
        location: data.location || null,
        front_document: data.front_document || data.front_document_uri || null,
        back_document: data.back_document || data.back_document_uri || null,
        follow_up_due: data.follow_up_due || null,
        hb: data.hb ?? null,
        calcium_qty: data.calcium_qty ?? null,
        short_id: data.short_id || null,
      };

      const updateResult = await dispatch(
        updateBeneficiary({id: data.id, updates: payload}),
      );

      if (updateResult.type.endsWith('/rejected')) {
        throw new Error(updateResult.payload || 'Update operation failed');
      }

      // 2. Save NEW SCREENING if Hb is filled (no mandatory validations)
      const hasNewScreeningData = newHb && newHb.trim() !== '';
      if (isAdmin && hasNewScreeningData) {
        // Validate only Hb format (if entered)
        const parsedHb = parseFloat(String(newHb).replace(',', '.'));
        if (!Number.isFinite(parsedHb) || parsedHb <= 0 || parsedHb > 25) {
          Alert.alert(
            'Validation Error',
            'Please enter valid Hemoglobin value (0-25 g/dL)',
          );
          setSaving(false);
          return;
        }
        // Pallor location validation only if pallor is Yes
        if (
          newPallor === 'yes' &&
          (!newPallorLocation || newPallorLocation.length === 0)
        ) {
          Alert.alert(
            'Validation Error',
            'Please select at least one pallor location when Pallor is Yes',
          );
          setSaving(false);
          return;
        }

        // Auto-classify anemia based on WHO criteria (like Screening.js)
        const {getAgeGroup, getAnemiaClassification} = await import(
          '../utils/anemiaClassification'
        );
        const age = data.age || 0;
        const gender = data.gender || 'female';
        const isPregnant =
          data.is_pregnant || data.category === 'Pregnant' || false;
        const ageGroup = getAgeGroup(age, gender, isPregnant);
        const classification = getAnemiaClassification(
          parsedHb,
          ageGroup,
          gender,
          isPregnant,
        );

        const screeningData = {
          beneficiaryId: data.id,
          hemoglobin: parsedHb,
          anemia_category:
            classification.category !== 'Unknown'
              ? classification.category
              : null,
          notes:
            Array.isArray(newSymptoms) && newSymptoms.length > 0
              ? newSymptoms.join(', ')
              : null,
          pallor: newPallor || null,
          pallor_location:
            newPallor === 'yes' && newPallorLocation.length > 0
              ? newPallorLocation.join(', ')
              : null,
          visit_type: 'Follow-up',
          doctor_name: data.doctor_name || null,
        };

        try {
          await dispatch(addScreening(screeningData));
          // Clear form
          setNewHb('');
          setNewPallor('');
          setNewPallorLocation([]);
          setNewSymptoms([]);
          setNewAnemiaCategory('');
        } catch (screeningError) {
          Alert.alert(
            'Warning',
            'Beneficiary updated but screening save failed',
          );
        }
      }

      // 3. Save NEW INTERVENTION if any field is filled (no mandatory validations)
      const hasNewInterventionData =
        newIfaYes || newCalciumYes || newDewormYes || newTheraYes || newRefYes;
      if (isAdmin && hasNewInterventionData) {
        // Validate only conditional fields (when Yes is selected)
        if (newIfaYes === 'yes' && (!newIfaQty || Number(newIfaQty) <= 0)) {
          Alert.alert(
            'Validation Error',
            'Please enter IFA quantity when IFA is Yes',
          );
          setSaving(false);
          return;
        }
        if (
          newCalciumYes === 'yes' &&
          (!newCalciumQty || Number(newCalciumQty) <= 0)
        ) {
          Alert.alert(
            'Validation Error',
            'Please enter Calcium quantity when Calcium is Yes',
          );
          setSaving(false);
          return;
        }
        if (newDewormYes === 'yes' && !newDewormingDate) {
          Alert.alert(
            'Validation Error',
            'Please enter deworming date when Deworming is Yes',
          );
          setSaving(false);
          return;
        }
        if (newTheraYes === 'yes' && !newTherapeuticNotes?.trim()) {
          Alert.alert(
            'Validation Error',
            'Please enter therapeutic details when Therapeutic Management is Yes',
          );
          setSaving(false);
          return;
        }
        if (newRefYes === 'yes' && !newReferral?.trim()) {
          Alert.alert(
            'Validation Error',
            'Please enter referral facility when Referral is Yes',
          );
          setSaving(false);
          return;
        }

        const interventionData = {
          ifa_yes: newIfaYes === 'yes' ? 1 : newIfaYes === 'no' ? 0 : null,
          ifa_quantity: newIfaQty ? Number(newIfaQty) : null,
          calcium_yes:
            newCalciumYes === 'yes' ? 1 : newCalciumYes === 'no' ? 0 : null,
          calcium_quantity: newCalciumQty ? Number(newCalciumQty) : null,
          deworm_yes:
            newDewormYes === 'yes' ? 1 : newDewormYes === 'no' ? 0 : null,
          deworming_date: newDewormingDate || null,
          therapeutic_yes:
            newTheraYes === 'yes' ? 1 : newTheraYes === 'no' ? 0 : null,
          therapeutic_notes: newTherapeuticNotes || null,
          referral_yes: newRefYes === 'yes' ? 1 : newRefYes === 'no' ? 0 : null,
          referral_facility: newReferral || null,
          doctor_name: data.doctor_name || null,
        };

        try {
          await dispatch(
            addIntervention({
              beneficiaryId: data.id,
              ...interventionData,
            }),
          );
          // Clear form
          setNewIfaYes('');
          setNewIfaQty('');
          setNewCalciumYes('');
          setNewCalciumQty('');
          setNewDewormYes('');
          setNewDewormingDate('');
          setNewTheraYes('');
          setNewTherapeuticNotes('');
          setNewRefYes('');
          setNewReferral('');
        } catch (interventionError) {
          Alert.alert(
            'Warning',
            'Beneficiary updated but intervention save failed',
          );
        }
      }

      try {
        const {sendPushToSelf} = await import('../utils/notifications');
        await sendPushToSelf(
          'Beneficiary Updated',
          `Beneficiary ${data.name} has been updated successfully.`,
          {type: 'beneficiary_updated', id: String(data.id)},
        );
        try {
          const {sendSMSToBeneficiary} = await import('../utils/fixedSMS');
          const message = `Hello ${data.name}, your profile has been updated in Anaemia. Please contact us if you have any questions.`;
          const smsResult = await sendSMSToBeneficiary(data, message);
        } catch (smsError) {
          // SMS sending failed, continue
        }
      } catch (notifError) {
        // Notification sending failed, continue
      }

      Alert.alert('Saved', 'All changes saved successfully!');
      // Reload data to show updated screening/intervention
      await load();
    } catch (e) {
      Alert.alert('Error', 'Save failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!data) return false;
    const originalRecord = originalRecordRef.current || record;
    if (!originalRecord) return false;

    // Check if any NEW screening fields are filled
    const hasNewScreeningData = newHb || newPallor || newSymptoms;
    if (hasNewScreeningData) {
      return true;
    }

    // Check if any NEW intervention fields are filled
    const hasNewInterventionData =
      newIfaYes || newCalciumYes || newDewormYes || newTheraYes || newRefYes;
    if (hasNewInterventionData) {
      return true;
    }

    // Check beneficiary basic info changes
    const keys = [
      'name',
      'age',
      'gender',
      'phone',
      'address',
      'id_number',
      'aadhaar_hash',
      'dob',
      'category',
      'alt_phone',
      'doctor_name',
      'doctor_phone',
      'registration_date',
      'location',
      'follow_up_due',
      'hb',
      'latest_hemoglobin',
      'latest_anemia_category',
      'calcium_qty',
      'short_id',
    ];
    for (const k of keys) {
      const a = data[k] ?? null;
      const b = originalRecord[k] ?? null;
      // Handle numeric fields (hb, latest_hemoglobin) - compare as numbers
      if (k === 'hb' || k === 'latest_hemoglobin') {
        const aNum = a !== null && a !== undefined ? Number(a) : null;
        const bNum = b !== null && b !== undefined ? Number(b) : null;
        if (aNum !== bNum && !(aNum === null && bNum === null)) {
          return true;
        }
      } else {
        if (String(a ?? '') !== String(b ?? '')) {
          return true;
        }
      }
    }

    return false;
  }, [
    data,
    record,
    newHb,
    newPallor,
    newSymptoms,
    newIfaYes,
    newCalciumYes,
    newDewormYes,
    newTheraYes,
    newRefYes,
  ]);

  const openImage = uri => setImgModal({visible: true, uri});

  const scanAndSave = null;

  if (loading)
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );

  if (!data) {
    return (
      <View style={{flex: 1, backgroundColor: colors.background}}>
        <Header
          title="Beneficiary"
          onMenuPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.reset({
                index: 0,
                routes: [{name: 'RoleSelect'}],
              });
            }
          }}
          rightIcon2Name={userRole === 'Patient' ? 'information-outline' : ''}
          onRightIcon2Press={
            userRole === 'Patient'
              ? () => navigation.navigate('Information')
              : undefined
          }
          rightIconName={userRole === 'Patient' ? 'logout' : ''}
          rightIconPress={userRole === 'Patient' ? handleLogout : undefined}
        />
        <View style={{padding: spacing.md}}>
          <Text>No data available.</Text>
          <Text style={{marginTop: 10, fontSize: 12, color: '#666'}}>
            Debug: uid={uid}, record={record ? 'Yes' : 'No'}, loading={loading}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <NetworkStatus />
      <Header
        title="Beneficiary Details"
        onBackPress={
          // Don't show back button if patient logged in directly (single beneficiary) and can't go back
          isPatient &&
          fromPatientList &&
          !navigation.canGoBack() &&
          !fromPatientDashboard
            ? undefined
            : () => {
                // If coming from PatientDashboard, navigate back to it
                if (fromPatientDashboard && selectedBeneficiary) {
                  navigation.navigate('PatientDashboard', {
                    record: selectedBeneficiary,
                  });
                } else if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // If no previous screen, navigate to role selection
                  navigation.reset({
                    index: 0,
                    routes: [{name: 'RoleSelect'}],
                  });
                }
              }
        }
        variant="back"
        role={userRole}
        showBeneficiaryIcon={
          // Show beneficiary icon if patient logged in directly (single beneficiary) and can't go back
          isPatient && fromPatientList && !navigation.canGoBack()
        }
        rightIcon2Name={userRole === 'Patient' ? 'information-outline' : ''}
        onRightIcon2Press={
          userRole === 'Patient'
            ? () => navigation.navigate('Information')
            : undefined
        }
        rightIconName={userRole === 'Patient' ? 'logout' : ''}
        rightIconPress={userRole === 'Patient' ? handleLogout : undefined}
      />

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={48} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          {data.name && <Text style={styles.profileName}>{data.name}</Text>}
          <Text style={styles.profileId}>
            {data.short_id ||
              data.id_number ||
              data.id_masked ||
              data.unique_id ||
              'No ID'}
          </Text>
          {data.category && (
            <Text style={styles.profileCategory}>
              {data.category === 'Pregnant'
                ? 'PREGNANT'
                : data.category === 'Under5'
                ? 'CHILD (BELOW 5)'
                : data.category === 'Adolescent'
                ? 'ADOLESCENT (10-19)'
                : data.category === 'WoRA'
                ? 'WOMEN OF REPRODUCTIVE AGE'
                : String(data.category).toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      <View style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={{padding: spacing.md, paddingBottom: 100}}
          style={{flex: 1}}>
          <View style={styles.card}>
            {/* Always show basic info and screening/intervention data */}
            <View style={styles.infoSection}>
              {/* Basic Information - editable for admin, read-only for others */}
              <View style={styles.infoItem}>
                <Icon name="calendar" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Registration Date</Text>
                  {shouldShowReadOnly ? (
                    data.registration_date && (
                      <Text style={styles.infoValue}>
                        {dayjs(data.registration_date).format('DD-MM-YYYY')}
                      </Text>
                    )
                  ) : (
                    <Input
                      placeholder="DD-MM-YYYY"
                      value={
                        data.registration_date
                          ? dayjs(data.registration_date).format('DD-MM-YYYY')
                          : ''
                      }
                      onChangeText={v => onChange('registration_date', v)}
                      style={styles.inlineInput}
                    />
                  )}
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="account" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Age</Text>
                  {shouldShowReadOnly ? (
                    data.age != null && (
                      <Text style={styles.infoValue}>{String(data.age)}</Text>
                    )
                  ) : (
                    <Input
                      placeholder="Age"
                      keyboardType="number-pad"
                      value={data.age != null ? String(data.age) : ''}
                      onChangeText={v => onChange('age', v.replace(/\D/g, ''))}
                      style={styles.inlineInput}
                    />
                  )}
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="phone" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  {shouldShowReadOnly ? (
                    data.phone && (
                      <Text style={styles.infoValue}>{data.phone}</Text>
                    )
                  ) : (
                    <Input
                      placeholder="Phone"
                      keyboardType="phone-pad"
                      value={data.phone || ''}
                      onChangeText={v => onChange('phone', v)}
                      style={styles.inlineInput}
                    />
                  )}
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="map-marker" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  {shouldShowReadOnly ? (
                    data.address && (
                      <Text style={styles.infoValue}>{data.address}</Text>
                    )
                  ) : (
                    <Input
                      placeholder="Address"
                      value={data.address || ''}
                      onChangeText={v => onChange('address', v)}
                      style={styles.inlineInput}
                      multiline
                    />
                  )}
                </View>
              </View>
              {/* Screening Data Display - Read-only for Patient */}
              {!isAdmin && data && (
                <View style={styles.screeningCard}>
                  <View style={styles.cardHeaderSection}>
                    <View style={styles.cardIconContainer}>
                      <Icon
                        name="heart-pulse"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.cardSectionTitle}>Screening Data</Text>
                  </View>

                  {/* Hemoglobin - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="blood-bag" size={18} color={colors.primary} />
                      <Text style={styles.fieldLabel}>
                        Hemoglobin (Hb) g/dL
                      </Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.latest_hemoglobin
                          ? `${data.latest_hemoglobin} g/dL`
                          : 'Not recorded'}
                      </Text>
                      {data.latest_anemia_category && (
                        <Text
                          style={[
                            styles.readOnlySubValue,
                            {
                              color: getAnemiaColor(
                                data.latest_anemia_category,
                              ),
                            },
                          ]}>
                          {data.latest_anemia_category}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Pallor - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="face-woman"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.fieldLabel}>Pallor</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.latest_pallor
                          ? data.latest_pallor === 'yes'
                            ? 'Yes'
                            : 'No'
                          : 'Not recorded'}
                      </Text>
                      {data.latest_pallor === 'yes' &&
                        data.latest_pallor_location && (
                          <Text style={styles.readOnlySubValue}>
                            Location: {data.latest_pallor_location}
                          </Text>
                        )}
                    </View>
                  </View>

                  {/* Symptoms - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="note-text" size={18} color={colors.primary} />
                      <Text style={styles.fieldLabel}>Symptoms</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.screening_notes || 'No symptoms recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Screening Date */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="calendar" size={18} color={colors.primary} />
                      <Text style={styles.fieldLabel}>Screening Date</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.last_screening_date
                          ? dayjs(data.last_screening_date).format('DD-MM-YYYY')
                          : 'Not recorded'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Previous Screening Section (for Admin from Follow-Up only) */}
              {isAdmin && fromFollowUp && previousScreening && (
                <View
                  style={[
                    {
                      padding: spacing.md,
                      marginBottom: spacing.md,
                      backgroundColor: colors.primary + '08',
                      borderRadius: borderRadius.lg,
                      borderLeftWidth: 4,
                      borderLeftColor: colors.primary,
                      ...shadows.sm,
                    },
                  ]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: spacing.sm,
                    }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.primary + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.sm,
                      }}>
                      <Icon
                        name="heart-pulse"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          fontSize: 15,
                          fontWeight: typography.weights.bold,
                          color: colors.primary,
                        },
                      ]}>
                      Previous Screening
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: spacing.xs,
                    }}>
                    {previousScreening.hemoglobin && (
                      <View
                        style={{
                          backgroundColor: colors.primary + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.primary + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.semibold,
                              color: colors.primary,
                            },
                          ]}>
                          Hb: {previousScreening.hemoglobin} g/dL
                        </Text>
                      </View>
                    )}
                    {Boolean(previousScreening.anemia_category) && (
                      <View
                        style={{
                          backgroundColor:
                            getAnemiaColor(previousScreening.anemia_category) +
                            '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor:
                            getAnemiaColor(previousScreening.anemia_category) +
                            '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.semibold,
                              color: getAnemiaColor(
                                previousScreening.anemia_category,
                              ),
                            },
                          ]}>
                          {previousScreening.anemia_category}
                        </Text>
                      </View>
                    )}
                    {Boolean(previousScreening.pallor) && (
                      <View
                        style={{
                          backgroundColor: colors.textSecondary + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.textSecondary + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.medium,
                              color: colors.text,
                            },
                          ]}>
                          Pallor: {previousScreening.pallor}
                          {previousScreening.pallor === 'yes' &&
                            previousScreening.pallor_location &&
                            ` (${previousScreening.pallor_location})`}
                        </Text>
                      </View>
                    )}
                    {Boolean(
                      previousScreening.created_at ||
                        previousScreening.screening_date,
                    ) && (
                      <View
                        style={{
                          backgroundColor: colors.background,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.medium,
                              color: colors.textSecondary,
                            },
                          ]}>
                          {dayjs(
                            previousScreening.created_at ||
                              previousScreening.screening_date,
                          ).format('DD-MM-YYYY')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {Boolean(previousScreening.notes) && (
                    <View
                      style={{
                        marginTop: spacing.sm,
                        padding: spacing.sm,
                        backgroundColor: colors.surface,
                        borderRadius: borderRadius.md,
                        borderLeftWidth: 2,
                        borderLeftColor: colors.primary,
                      }}>
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            fontSize: 12,
                            color: colors.textSecondary,
                            fontStyle: 'italic',
                          },
                        ]}>
                        💡 Symptoms: {previousScreening.notes}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Screening Form - Only show for Admin */}
              {isAdmin && (
                <View style={styles.screeningCard}>
                  <View style={styles.cardHeaderSection}>
                    <View style={styles.cardIconContainer}>
                      <Icon
                        name="heart-pulse"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.cardSectionTitle}>
                      {fromFollowUp ? 'New Screening' : 'Current Screening'}
                    </Text>
                  </View>

                  {/* Hemoglobin Field - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="blood-bag" size={18} color={colors.primary} />
                      <Text style={styles.fieldLabel}>
                        Hemoglobin (Hb) g/dL
                      </Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyValue}>Not recorded</Text>
                      </View>
                    ) : (
                      <>
                        <Input
                          placeholder="Enter Hb value (g/dL)"
                          keyboardType="decimal-pad"
                          value={newHb}
                          onChangeText={setNewHb}
                          style={styles.fieldInput}
                        />
                        {/* Auto-classification display (like Screening.js) */}
                        {Number.isFinite(parsedNewHb) && parsedNewHb > 0 && (
                          <View style={styles.autoClassificationContainer}>
                            {(() => {
                              const loadClassification = async () => {
                                const {
                                  getAgeGroup,
                                  getAnemiaClassification,
                                  getAnemiaColor,
                                } = await import(
                                  '../utils/anemiaClassification'
                                );
                                const age = data.age || 0;
                                const gender = data.gender || 'female';
                                const isPregnant =
                                  data.is_pregnant ||
                                  data.category === 'Pregnant' ||
                                  false;
                                const ageGroup = getAgeGroup(
                                  age,
                                  gender,
                                  isPregnant,
                                );
                                const classification = getAnemiaClassification(
                                  parsedNewHb,
                                  ageGroup,
                                  gender,
                                  isPregnant,
                                );
                                const color = getAnemiaColor(
                                  classification.severity,
                                );

                                return (
                                  <View
                                    style={[
                                      styles.classificationBox,
                                      {borderLeftColor: color},
                                    ]}>
                                    <Text style={styles.classificationTitle}>
                                      WHO Classification:
                                    </Text>
                                    <Text
                                      style={[
                                        styles.classificationCategory,
                                        {color},
                                      ]}>
                                      {classification.category}
                                    </Text>
                                    <Text
                                      style={styles.classificationDescription}>
                                      {classification.description}
                                    </Text>
                                  </View>
                                );
                              };

                              if (newAnemiaCategory) {
                                const {
                                  getAnemiaColor,
                                } = require('../utils/anemiaClassification');
                                const color = getAnemiaColor(newAnemiaCategory);
                                return (
                                  <View
                                    style={[
                                      styles.classificationBox,
                                      {borderLeftColor: color},
                                    ]}>
                                    <Text style={styles.classificationTitle}>
                                      WHO Classification:
                                    </Text>
                                    <Text
                                      style={[
                                        styles.classificationCategory,
                                        {color},
                                      ]}>
                                      {newAnemiaCategory}
                                    </Text>
                                  </View>
                                );
                              }
                              return null;
                            })()}
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  {/* Pallor - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="face-woman"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.fieldLabel}>Pallor</Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyValue}>Not recorded</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.yesNoFieldContainer}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newPallor === 'yes' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewPallor('yes')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newPallor === 'yes' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              Yes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newPallor === 'no' && styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewPallor('no')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newPallor === 'no' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {/* Pallor Location Checkboxes - Show only when pallor is Yes (like Screening.js) */}
                        {newPallor === 'yes' && (
                          <View style={styles.pallorLocationContainer}>
                            {['Tongue', 'Conjunctiva', 'Palm'].map(
                              (location, index) => {
                                const isSelected =
                                  newPallorLocation.includes(location);
                                return (
                                  <TouchableOpacity
                                    key={index}
                                    style={[
                                      styles.pallorLocationCheckbox,
                                      isSelected &&
                                        styles.pallorLocationCheckboxSelected,
                                    ]}
                                    onPress={() => {
                                      setNewPallorLocation(prev =>
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
                                        isSelected
                                          ? colors.primary
                                          : colors.textSecondary
                                      }
                                    />
                                    <Text
                                      style={[
                                        styles.pallorLocationText,
                                        isSelected &&
                                          styles.pallorLocationTextSelected,
                                      ]}>
                                      {location}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              },
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  {/* Symptoms - Always show, always empty - All 12 symptoms from Screening.js */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="note-text" size={18} color={colors.primary} />
                      <Text style={styles.fieldLabel}>Symptoms</Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyValue}>
                          No symptoms recorded
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.symptomsContainer}>
                        {[
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
                        ].map((symptom, index) => {
                          const isSelected = newSymptoms.includes(symptom);
                          return (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.symptomCheckbox,
                                isSelected && styles.symptomCheckboxSelected,
                              ]}
                              onPress={() => {
                                setNewSymptoms(prev =>
                                  prev.includes(symptom)
                                    ? prev.filter(s => s !== symptom)
                                    : [...prev, symptom],
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
                                  isSelected
                                    ? colors.primary
                                    : colors.textSecondary
                                }
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
                    )}
                  </View>
                </View>
              )}

              {/* Intervention Data Display - Read-only for Patient */}
              {!isAdmin && data && (
                <View style={styles.interventionCard}>
                  <View style={styles.cardHeaderSection}>
                    <View
                      style={[
                        styles.cardIconContainer,
                        {backgroundColor: colors.secondary + '15'},
                      ]}>
                      <Icon
                        name="medical-bag"
                        size={24}
                        color={colors.secondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.cardSectionTitle,
                        {color: colors.secondary},
                      ]}>
                      Intervention Data
                    </Text>
                  </View>

                  {/* IFA - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="pill" size={18} color={colors.secondary} />
                      <Text style={styles.fieldLabel}>
                        IFA (Iron Folic Acid)
                      </Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.intervention_ifa_yes === 'yes' ||
                        data.intervention_ifa_yes === true ||
                        data.intervention_ifa_yes === 1
                          ? 'Yes'
                          : data.intervention_ifa_yes === 'no' ||
                            data.intervention_ifa_yes === false ||
                            data.intervention_ifa_yes === 0
                          ? 'No'
                          : 'Not given'}
                      </Text>
                      {(data.intervention_ifa_yes === 'yes' ||
                        data.intervention_ifa_yes === true ||
                        data.intervention_ifa_yes === 1) &&
                        data.intervention_ifa_quantity && (
                          <Text style={styles.readOnlySubValue}>
                            Quantity: {data.intervention_ifa_quantity} tablets
                          </Text>
                        )}
                    </View>
                  </View>

                  {/* Calcium - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="bone" size={18} color={colors.secondary} />
                      <Text style={styles.fieldLabel}>Calcium</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.intervention_calcium_yes === 'yes' ||
                        data.intervention_calcium_yes === true ||
                        data.intervention_calcium_yes === 1
                          ? 'Yes'
                          : data.intervention_calcium_yes === 'no' ||
                            data.intervention_calcium_yes === false ||
                            data.intervention_calcium_yes === 0
                          ? 'No'
                          : 'Not given'}
                      </Text>
                      {(data.intervention_calcium_yes === 'yes' ||
                        data.intervention_calcium_yes === true ||
                        data.intervention_calcium_yes === 1) &&
                        data.intervention_calcium_quantity && (
                          <Text style={styles.readOnlySubValue}>
                            Quantity: {data.intervention_calcium_quantity}{' '}
                            tablets
                          </Text>
                        )}
                    </View>
                  </View>

                  {/* Deworming - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="shield-check"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>Deworming</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.intervention_deworm_yes === 'yes' ||
                        data.intervention_deworm_yes === true ||
                        data.intervention_deworm_yes === 1
                          ? 'Yes'
                          : data.intervention_deworm_yes === 'no' ||
                            data.intervention_deworm_yes === false ||
                            data.intervention_deworm_yes === 0
                          ? 'No'
                          : 'Not done'}
                      </Text>
                      {(data.intervention_deworm_yes === 'yes' ||
                        data.intervention_deworm_yes === true ||
                        data.intervention_deworm_yes === 1) &&
                        data.intervention_deworming_date && (
                          <Text style={styles.readOnlySubValue}>
                            Date:{' '}
                            {dayjs(data.intervention_deworming_date).format(
                              'DD-MM-YYYY',
                            )}
                          </Text>
                        )}
                    </View>
                  </View>

                  {/* Therapeutic Management - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="medical-bag"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>
                        Therapeutic Management
                      </Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.intervention_therapeutic_yes === 'yes' ||
                        data.intervention_therapeutic_yes === true ||
                        data.intervention_therapeutic_yes === 1
                          ? 'Yes'
                          : data.intervention_therapeutic_yes === 'no' ||
                            data.intervention_therapeutic_yes === false ||
                            data.intervention_therapeutic_yes === 0
                          ? 'No'
                          : 'Not done'}
                      </Text>
                      {(data.intervention_therapeutic_yes === 'yes' ||
                        data.intervention_therapeutic_yes === true ||
                        data.intervention_therapeutic_yes === 1) &&
                        data.intervention_therapeutic_notes && (
                          <Text style={styles.readOnlySubValue}>
                            {data.intervention_therapeutic_notes}
                          </Text>
                        )}
                    </View>
                  </View>

                  {/* Referral - Read Only */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="hospital-building"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>Referral</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.intervention_referral_facility || 'No referral'}
                      </Text>
                    </View>
                  </View>

                  {/* Intervention Date */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="calendar"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>Intervention Date</Text>
                    </View>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyValue}>
                        {data.last_intervention_date
                          ? dayjs(data.last_intervention_date).format(
                              'DD-MM-YYYY',
                            )
                          : 'Not recorded'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Previous Intervention Section (for Admin from Follow-Up only) */}
              {isAdmin && fromFollowUp && previousIntervention && (
                <View
                  style={[
                    {
                      padding: spacing.md,
                      marginBottom: spacing.md,
                      backgroundColor: colors.secondary + '08',
                      borderRadius: borderRadius.lg,
                      borderLeftWidth: 4,
                      borderLeftColor: colors.secondary,
                      ...shadows.sm,
                    },
                  ]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: spacing.sm,
                    }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.secondary + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.sm,
                      }}>
                      <Icon
                        name="medical-bag"
                        size={18}
                        color={colors.secondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          fontSize: 15,
                          fontWeight: typography.weights.bold,
                          color: colors.secondary,
                        },
                      ]}>
                      {isAdmin ? 'Previous Intervention' : 'Intervention'}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: spacing.xs,
                    }}>
                    {Boolean(previousIntervention.ifa_yes) && (
                      <View
                        style={{
                          backgroundColor: colors.error + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.error + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.semibold,
                              color: colors.error,
                            },
                          ]}>
                          💊 IFA: {previousIntervention.ifa_quantity || 0}{' '}
                          tablets
                        </Text>
                      </View>
                    )}
                    {Boolean(previousIntervention.calcium_yes) && (
                      <View
                        style={{
                          backgroundColor: colors.info + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.info + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.semibold,
                              color: colors.info,
                            },
                          ]}>
                          🦴 Calcium:{' '}
                          {previousIntervention.calcium_quantity || 0} tablets
                        </Text>
                      </View>
                    )}
                    {Boolean(previousIntervention.deworm_yes) && (
                      <View
                        style={{
                          backgroundColor: colors.success + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.success + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.medium,
                              color: colors.success,
                            },
                          ]}>
                          🛡️ Deworming:{' '}
                          {previousIntervention.deworming_date
                            ? dayjs(previousIntervention.deworming_date).format(
                                'DD-MM-YYYY',
                              )
                            : 'Date N/A'}
                        </Text>
                      </View>
                    )}
                    {Boolean(previousIntervention.referral_yes) && (
                      <View
                        style={{
                          backgroundColor: colors.warning + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.warning + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.medium,
                              color: colors.warning,
                            },
                          ]}>
                          🏥 Referral:{' '}
                          {previousIntervention.referral_facility ||
                            'Facility N/A'}
                        </Text>
                      </View>
                    )}
                    {Boolean(previousIntervention.therapeutic_yes) && (
                      <View
                        style={{
                          backgroundColor: colors.secondary + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderColor: colors.secondary + '30',
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.semibold,
                              color: colors.secondary,
                            },
                          ]}>
                          ✅ Therapeutic: Yes
                        </Text>
                      </View>
                    )}
                    {Boolean(
                      previousIntervention.created_at ||
                        previousIntervention.intervention_date,
                    ) && (
                      <View
                        style={{
                          backgroundColor: colors.background,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: borderRadius.md,
                        }}>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              fontSize: 13,
                              fontWeight: typography.weights.medium,
                              color: colors.textSecondary,
                            },
                          ]}>
                          📅{' '}
                          {dayjs(
                            previousIntervention.created_at ||
                              previousIntervention.intervention_date,
                          ).format('DD-MM-YYYY')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {Boolean(previousIntervention.therapeutic_notes) && (
                    <View
                      style={{
                        marginTop: spacing.sm,
                        padding: spacing.sm,
                        backgroundColor: colors.surface,
                        borderRadius: borderRadius.md,
                        borderLeftWidth: 2,
                        borderLeftColor: colors.secondary,
                      }}>
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            fontSize: 12,
                            color: colors.textSecondary,
                            fontStyle: 'italic',
                          },
                        ]}>
                        📝 Notes: {previousIntervention.therapeutic_notes}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Intervention Form - Only show for Admin */}
              {isAdmin && (
                <View style={styles.interventionCard}>
                  <View style={styles.cardHeaderSection}>
                    <View
                      style={[
                        styles.cardIconContainer,
                        {backgroundColor: colors.secondary + '15'},
                      ]}>
                      <Icon
                        name="medical-bag"
                        size={24}
                        color={colors.secondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.cardSectionTitle,
                        {color: colors.secondary},
                      ]}>
                      {fromFollowUp
                        ? 'New Intervention'
                        : 'Current Intervention'}
                    </Text>
                  </View>

                  {/* IFA Field - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="pill" size={18} color={colors.secondary} />
                      <Text style={styles.fieldLabel}>
                        IFA (Iron Folic Acid)
                      </Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text
                          style={[
                            styles.readOnlyValue,
                            {color: colors.textSecondary},
                          ]}>
                          Not given
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.yesNoFieldContainer}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newIfaYes === 'yes' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewIfaYes('yes')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newIfaYes === 'yes' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              Yes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newIfaYes === 'no' && styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewIfaYes('no')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newIfaYes === 'no' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {newIfaYes === 'yes' && (
                          <>
                            <Input
                              placeholder="IFA quantity (tablets)"
                              keyboardType="numeric"
                              value={newIfaQty}
                              onChangeText={setNewIfaQty}
                              style={[
                                styles.fieldInput,
                                {marginTop: spacing.sm},
                              ]}
                            />
                            {/* IFA Recommendation Display (like Interventions.js) */}
                            {data && (
                              <View style={styles.ifaRecommendationContainer}>
                                {(() => {
                                  const age = Number(data.age) || 0;
                                  const gender = data.gender || 'female';
                                  // Check both is_pregnant field and category field for pregnant status
                                  const isPregnant =
                                    data.is_pregnant ||
                                    data.category === 'Pregnant' ||
                                    false;
                                  const isLactating =
                                    data.is_lactating || false;
                                  // Use latest_anemia_category (from most recent screening)
                                  // Don't use data.category if it's 'Pregnant', 'Under5', etc. as it's not an anemia category
                                  const anemiaCategory =
                                    data.latest_anemia_category || 'Unknown';

                                  const {
                                    getIFARecommendation,
                                    getIFAPriority,
                                    getIFAPriorityColor,
                                    getIFAAgeGroup,
                                  } = require('../utils/ifaRecommendations');

                                  const recommendation = getIFARecommendation(
                                    age,
                                    gender,
                                    isPregnant,
                                    isLactating,
                                    anemiaCategory,
                                  );

                                  if (!recommendation.shouldSupplement) {
                                    return (
                                      <View
                                        style={[
                                          styles.ifaRecommendationBox,
                                          {borderLeftColor: colors.unknown},
                                        ]}>
                                        <Text
                                          style={styles.ifaRecommendationTitle}>
                                          IFA Recommendation:
                                        </Text>
                                        <Text
                                          style={styles.ifaRecommendationText}>
                                          IFA supplementation not recommended
                                          for this age group/category
                                        </Text>
                                      </View>
                                    );
                                  }

                                  const priority = getIFAPriority(
                                    anemiaCategory,
                                    isPregnant,
                                    isLactating,
                                  );
                                  const priorityColor =
                                    getIFAPriorityColor(priority);
                                  const ageGroup = getIFAAgeGroup(
                                    age,
                                    gender,
                                    isPregnant,
                                    isLactating,
                                  );

                                  return (
                                    <View
                                      style={[
                                        styles.ifaRecommendationBox,
                                        {borderLeftColor: priorityColor},
                                      ]}>
                                      <Text
                                        style={styles.ifaRecommendationTitle}>
                                        IFA Recommendation:
                                      </Text>
                                      <Text
                                        style={
                                          styles.ifaRecommendationCategory
                                        }>
                                        {ageGroup}
                                      </Text>

                                      <View
                                        style={styles.ifaRecommendationDetails}>
                                        <Text
                                          style={styles.ifaRecommendationLabel}>
                                          Dosage:
                                        </Text>
                                        <Text
                                          style={styles.ifaRecommendationValue}>
                                          {recommendation.dosage}
                                        </Text>
                                      </View>

                                      <View
                                        style={styles.ifaRecommendationDetails}>
                                        <Text
                                          style={styles.ifaRecommendationLabel}>
                                          Frequency:
                                        </Text>
                                        <Text
                                          style={styles.ifaRecommendationValue}>
                                          {recommendation.frequency}
                                        </Text>
                                      </View>

                                      <View
                                        style={styles.ifaRecommendationDetails}>
                                        <Text
                                          style={styles.ifaRecommendationLabel}>
                                          Duration:
                                        </Text>
                                        <Text
                                          style={styles.ifaRecommendationValue}>
                                          {recommendation.duration}
                                        </Text>
                                      </View>

                                      <View
                                        style={styles.ifaRecommendationDetails}>
                                        <Text
                                          style={styles.ifaRecommendationLabel}>
                                          Formulation:
                                        </Text>
                                        <Text
                                          style={styles.ifaRecommendationValue}>
                                          {recommendation.formulation}
                                        </Text>
                                      </View>

                                      {recommendation.color && (
                                        <View
                                          style={
                                            styles.ifaRecommendationDetails
                                          }>
                                          <Text
                                            style={
                                              styles.ifaRecommendationLabel
                                            }>
                                            Color:
                                          </Text>
                                          <Text
                                            style={
                                              styles.ifaRecommendationValue
                                            }>
                                            {recommendation.color}
                                          </Text>
                                        </View>
                                      )}

                                      {recommendation.notes.length > 0 && (
                                        <View
                                          style={styles.ifaRecommendationNotes}>
                                          <Text
                                            style={
                                              styles.ifaRecommendationNotesTitle
                                            }>
                                            Notes:
                                          </Text>
                                          {recommendation.notes.map(
                                            (note, index) => (
                                              <Text
                                                key={index}
                                                style={
                                                  styles.ifaRecommendationNote
                                                }>
                                                • {note}
                                              </Text>
                                            ),
                                          )}
                                        </View>
                                      )}

                                      {recommendation.contraindications.length >
                                        0 && (
                                        <View
                                          style={
                                            styles.ifaRecommendationContraindications
                                          }>
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
                                                style={
                                                  styles.ifaRecommendationContraindication
                                                }>
                                                ⚠️ {contraindication}
                                              </Text>
                                            ),
                                          )}
                                        </View>
                                      )}

                                      {recommendation.specialInstructions
                                        .length > 0 && (
                                        <View
                                          style={
                                            styles.ifaRecommendationSpecial
                                          }>
                                          <Text
                                            style={
                                              styles.ifaRecommendationSpecialTitle
                                            }>
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
                          </>
                        )}
                      </>
                    )}
                  </View>
                  {/* Calcium Field - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon name="bone" size={18} color={colors.secondary} />
                      <Text style={styles.fieldLabel}>Calcium</Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text
                          style={[
                            styles.readOnlyValue,
                            {color: colors.textSecondary},
                          ]}>
                          Not given
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.yesNoFieldContainer}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newCalciumYes === 'yes' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewCalciumYes('yes')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newCalciumYes === 'yes' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              Yes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newCalciumYes === 'no' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewCalciumYes('no')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newCalciumYes === 'no' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {newCalciumYes === 'yes' && (
                          <Input
                            placeholder="Calcium quantity (tablets)"
                            keyboardType="numeric"
                            value={newCalciumQty}
                            onChangeText={setNewCalciumQty}
                            style={[styles.fieldInput, {marginTop: spacing.sm}]}
                          />
                        )}
                      </>
                    )}
                  </View>

                  {/* Deworming Field - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="shield-check"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>Deworming</Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text
                          style={[
                            styles.readOnlyValue,
                            {color: colors.textSecondary},
                          ]}>
                          Not done
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.yesNoFieldContainer}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newDewormYes === 'yes' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewDewormYes('yes')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newDewormYes === 'yes' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              Yes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newDewormYes === 'no' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewDewormYes('no')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newDewormYes === 'no' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {newDewormYes === 'yes' && (
                          <Input
                            placeholder="Deworming date (DD-MM-YYYY)"
                            value={newDewormingDate}
                            onChangeText={setNewDewormingDate}
                            style={[styles.fieldInput, {marginTop: spacing.sm}]}
                          />
                        )}
                      </>
                    )}
                  </View>

                  {/* Therapeutic Management Field - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="medical-bag"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>
                        Therapeutic Management
                      </Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text
                          style={[
                            styles.readOnlyValue,
                            {color: colors.textSecondary},
                          ]}>
                          No
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.yesNoFieldContainer}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newTheraYes === 'yes' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewTheraYes('yes')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newTheraYes === 'yes' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              Yes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newTheraYes === 'no' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewTheraYes('no')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newTheraYes === 'no' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {newTheraYes === 'yes' && (
                          <Input
                            placeholder="Therapeutic details"
                            value={newTherapeuticNotes}
                            onChangeText={setNewTherapeuticNotes}
                            style={[styles.fieldInput, {marginTop: spacing.sm}]}
                            multiline
                          />
                        )}
                      </>
                    )}
                  </View>

                  {/* Referral Field - Always show, always empty */}
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldHeader}>
                      <Icon
                        name="hospital-building"
                        size={18}
                        color={colors.secondary}
                      />
                      <Text style={styles.fieldLabel}>Referral</Text>
                    </View>
                    {shouldShowReadOnly ? (
                      <View style={styles.readOnlyField}>
                        <Text
                          style={[
                            styles.readOnlyValue,
                            {color: colors.textSecondary},
                          ]}>
                          No referral
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.yesNoFieldContainer}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newRefYes === 'yes' &&
                                styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewRefYes('yes')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newRefYes === 'yes' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              Yes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButtonNew,
                              newRefYes === 'no' && styles.yesNoButtonActiveNew,
                            ]}
                            onPress={() => setNewRefYes('no')}>
                            <Text
                              style={[
                                styles.yesNoButtonTextNew,
                                newRefYes === 'no' &&
                                  styles.yesNoButtonTextActiveNew,
                              ]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {newRefYes === 'yes' && (
                          <Input
                            placeholder="Referral facility name"
                            value={newReferral}
                            onChangeText={setNewReferral}
                            style={[styles.fieldInput, {marginTop: spacing.sm}]}
                          />
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Save button for admin users - Fixed at bottom */}
        {!shouldShowReadOnly && data && (
          <View style={styles.fixedFooter}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!isDirty || saving) && styles.saveBtnDisabled,
              ]}
              onPress={onSave}
              disabled={saving || !isDirty}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.saveBtnContent}>
                  <Icon name="content-save" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Documents section removed as per requirements */}

      <Modal
        visible={imgModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setImgModal({visible: false, uri: null})}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.95)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <TouchableOpacity
            style={{position: 'absolute', top: 40, right: 20}}
            onPress={() => setImgModal({visible: false, uri: null})}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {imgModal.uri ? (
            <Image
              source={{uri: imgModal.uri}}
              style={{width: '100%', height: '80%'}}
              resizeMode="contain"
            />
          ) : (
            <Text style={{color: '#fff'}}>No image</Text>
          )}
        </View>
      </Modal>
      <SendSMS
        visible={smsModal.visible}
        onClose={() =>
          setSmsModal({visible: false, phoneNumber: '', message: ''})
        }
        initialPhoneNumber={smsModal.phoneNumber}
        initialMessage={smsModal.message}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  profileId: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  profileCategory: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card and Container
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    marginBottom: spacing.md,
  },

  // Read-only styles
  readOnlyContainer: {
    padding: spacing.md,
  },
  infoSection: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  infoContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },

  // Editable styles
  editableContainer: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formField: {
    flex: 1,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: typography.weights.semibold,
    ...typography.body,
  },
  input: {
    marginBottom: 0,
  },
  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  yesNoButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yesNoButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  yesNoButtonTextActive: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  inlineInput: {
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  // Action buttons
  actionButtons: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.md,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
    minHeight: 56,
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
    ...shadows.sm,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
    fontSize: 16,
  },

  smsBtn: {
    backgroundColor: colors.secondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
    minHeight: 56,
  },
  smsBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsBtnText: {
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
    fontSize: 16,
  },

  // Legacy styles (keeping for compatibility)
  name: {fontSize: 18, fontWeight: '700', color: colors.text},
  sub: {color: colors.text, marginTop: 6},
  small: {color: colors.text, marginTop: 6},
  sectionTitle: {fontWeight: '700', color: colors.text},
  docBox: {
    flex: 1,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docImage: {width: '100%', height: '100%'},
  docPlaceholder: {alignItems: 'center', justifyContent: 'center'},
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  smallBtnText: {color: '#fff', marginLeft: 8},

  // Screening and Intervention Card Styles (New Design - No Borders)
  screeningCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  interventionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardSectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.body,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  readOnlyField: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  readOnlyValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  readOnlySubValue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  yesNoFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  yesNoButtonNew: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoButtonActiveNew: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yesNoButtonTextNew: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  yesNoButtonTextActiveNew: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },

  // Old Screening and Intervention Section Styles (Keep for backward compatibility)
  screeningSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.primary + '30',
    gap: spacing.sm,
  },
  interventionSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.secondary + '30',
    gap: spacing.sm,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Styles from Screening.js - Auto-classification
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

  // Styles from Screening.js - Pallor Location
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

  // Styles from Screening.js - Symptoms
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

  // IFA Recommendation styles (from Interventions.js)
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
    color: colors.error,
    marginBottom: spacing.xs,
  },
  ifaRecommendationContraindication: {
    fontSize: 11,
    color: colors.error,
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

export default BeneficiaryDetail;
