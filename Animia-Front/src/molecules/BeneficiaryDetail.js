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
  setLoading,
  setError,
  selectCurrentBeneficiary,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
} from '../store/beneficiarySlice';

const BeneficiaryDetail = ({route, navigation}) => {
  const dispatch = useDispatch();
  const {unique_id, record, readOnly} = route.params || {};
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
  const isScannerOpenRef = useRef(false);
  const data = currentBeneficiary;
  useEffect(() => {
    if (record) {
      dispatch(setCurrentBeneficiary(record));
    } else if (!data && uid && !hasCompleteData) {
      load();
    }
  }, [uid, record, hasCompleteData]);

  // Check if record already has screening/intervention data
  const hasCompleteData = useMemo(() => {
    const hasData =
      record &&
      (Boolean(record.latest_hemoglobin) || Boolean(record.intervention_id));
    return hasData;
  }, [record]);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const r = await getRole();
        const role = r ? String(r).toLowerCase() : '';
        setIsPatient(role === 'patient');
        setIsAdmin(role === 'admin');
      } catch (error) {
        console.warn('Error getting role:', error);
        setIsPatient(false);
        setIsAdmin(false);
      }
    };

    checkRole();
  }, []);

  const shouldShowReadOnly = Boolean(
    readOnly ||
      isPatient ||
      (data && (data.latest_hemoglobin || data.intervention_id) && !isAdmin),
  );
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
          dispatch(setCurrentBeneficiary(beneficiary));
        } else {
          dispatch(setError('Beneficiary not found.'));
          Alert.alert('Error', 'Beneficiary not found.');
        }
      } else {
        console.warn('Failed to fetch beneficiaries:', fetchResult.payload);
        dispatch(setError('Unable to load beneficiary.'));
        Alert.alert('Error', 'Unable to load beneficiary.');
      }
    } catch (e) {
      console.warn('load err', e);
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

      // Use Redux thunk for offline support
      const updateResult = await dispatch(
        updateBeneficiary({id: data.id, updates: payload}),
      );

      // Check if update was successful
      if (updateResult.type.endsWith('/rejected')) {
        console.error(
          '[BeneficiaryDetail] Update operation rejected:',
          updateResult.payload,
        );
        throw new Error(updateResult.payload || 'Update operation failed');
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
          console.warn(
            '[BeneficiaryDetail] Failed to send multi-contact SMS:',
            smsError,
          );
        }
      } catch (notifError) {
        console.warn('Failed to send notification:', notifError);
      }

      Alert.alert('Saved', 'Beneficiary updated.');
      navigation.goBack();
    } catch (e) {
      console.warn('save err', e);
      Alert.alert('Error', 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!data || !record) return false;
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
      'calcium_qty',
      'short_id',
    ];
    for (const k of keys) {
      const a = data[k] ?? null;
      const b = record[k] ?? null;
      if (String(a ?? '') !== String(b ?? '')) return true;
    }
    return false;
  }, [data, record]);

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
        <Header title="Beneficiary" onMenuPress={() => navigation.goBack()} />
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
        onBackPress={() => navigation.goBack()}
        variant="back"
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

      <ScrollView contentContainerStyle={{padding: spacing.md}}>
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
            {/* Display screening data if available */}
            {Boolean(data.latest_hemoglobin || data.screening_id) && (
              <View style={styles.screeningSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="heart-pulse" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Latest Screening</Text>
                </View>
                {Boolean(data.latest_hemoglobin) && (
                  <View style={styles.infoItem}>
                    <Icon name="blood-bag" size={20} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Hemoglobin (Hb)</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {data.latest_hemoglobin} g/dL
                        </Text>
                      ) : (
                        <Input
                          placeholder="Hb value"
                          keyboardType="decimal-pad"
                          value={
                            data.latest_hemoglobin
                              ? String(data.latest_hemoglobin)
                              : ''
                          }
                          onChangeText={v => onChange('latest_hemoglobin', v)}
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.latest_anemia_category) && (
                  <View style={styles.infoItem}>
                    <Icon
                      name="alert-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Anemia Category</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {data.latest_anemia_category}
                        </Text>
                      ) : (
                        <Input
                          placeholder="Anemia Category"
                          value={data.latest_anemia_category || ''}
                          onChangeText={v =>
                            onChange('latest_anemia_category', v)
                          }
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.latest_pallor) && (
                  <View style={styles.infoItem}>
                    <Icon name="face-woman" size={20} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Pallor</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {data.latest_pallor}
                        </Text>
                      ) : (
                        <Input
                          placeholder="Pallor"
                          value={data.latest_pallor || ''}
                          onChangeText={v => onChange('latest_pallor', v)}
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.latest_visit_type) && (
                  <View style={styles.infoItem}>
                    <Icon
                      name="hospital-box"
                      size={20}
                      color={colors.primary}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Visit Type</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {data.latest_visit_type}
                        </Text>
                      ) : (
                        <Input
                          placeholder="Visit Type"
                          value={data.latest_visit_type || ''}
                          onChangeText={v => onChange('latest_visit_type', v)}
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.latest_severity) && (
                  <View style={styles.infoItem}>
                    <Icon name="alert" size={20} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Severity</Text>
                      {shouldShowReadOnly ? (
                        <Text
                          style={[
                            styles.infoValue,
                            data.latest_severity === 'severe' && {
                              color: colors.error,
                            },
                            data.latest_severity === 'moderate' && {
                              color: '#FF8C00',
                            },
                            data.latest_severity === 'mild' && {
                              color: '#FFA500',
                            },
                          ]}>
                          {data.latest_severity}
                        </Text>
                      ) : (
                        <Input
                          placeholder="Severity"
                          value={data.latest_severity || ''}
                          onChangeText={v => onChange('latest_severity', v)}
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.screening_notes) && (
                  <View style={styles.infoItem}>
                    <Icon name="note-text" size={20} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Screening Notes</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {data.screening_notes}
                        </Text>
                      ) : (
                        <Input
                          placeholder="Screening Notes"
                          value={data.screening_notes || ''}
                          onChangeText={v => onChange('screening_notes', v)}
                          style={styles.inlineInput}
                          multiline
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.last_screening_date) && (
                  <View style={styles.infoItem}>
                    <Icon name="calendar" size={20} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Last Screening Date</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {dayjs(data.last_screening_date).format('DD-MM-YYYY')}
                        </Text>
                      ) : (
                        <Input
                          placeholder="DD-MM-YYYY"
                          value={
                            data.last_screening_date
                              ? dayjs(data.last_screening_date).format(
                                  'DD-MM-YYYY',
                                )
                              : ''
                          }
                          onChangeText={v => onChange('last_screening_date', v)}
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Display intervention data if available */}
            {Boolean(data.intervention_id) && (
              <View style={styles.interventionSection}>
                <View style={styles.sectionHeader}>
                  <Icon
                    name="medical-bag"
                    size={20}
                    color={colors.secondary || '#4CAF50'}
                  />
                  <Text style={styles.sectionTitle}>Latest Intervention</Text>
                </View>
                <View style={styles.infoItem}>
                  <Icon
                    name="pill"
                    size={20}
                    color={colors.secondary || '#4CAF50'}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>IFA (Iron Folic Acid)</Text>
                    {Boolean(data.intervention_ifa_yes) && (
                      <Text style={styles.infoValue}>
                        Yes ({data.intervention_ifa_quantity || 0} tablets)
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <Icon
                    name="bone"
                    size={20}
                    color={colors.secondary || '#4CAF50'}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Calcium</Text>
                    {Boolean(data.intervention_calcium_yes) && (
                      <Text style={styles.infoValue}>
                        Yes ({data.intervention_calcium_quantity || 0} tablets)
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <Icon
                    name="shield-check"
                    size={20}
                    color={colors.secondary || '#4CAF50'}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Deworming</Text>
                    {Boolean(data.intervention_deworm_yes) && (
                      <Text style={styles.infoValue}>
                        Yes ({data.intervention_deworming_date || 'Date N/A'})
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <Icon
                    name="hospital-building"
                    size={20}
                    color={colors.secondary || '#4CAF50'}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Referral</Text>
                    {Boolean(data.intervention_referral_yes) && (
                      <Text style={styles.infoValue}>
                        Yes (
                        {data.intervention_referral_facility || 'Facility N/A'})
                      </Text>
                    )}
                  </View>
                </View>
                {Boolean(data.intervention_therapeutic_yes) && (
                  <View style={styles.infoItem}>
                    <Icon
                      name="medical-bag"
                      size={20}
                      color={colors.secondary || '#4CAF50'}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>
                        Therapeutic Management
                      </Text>
                      <Text style={styles.infoValue}>Yes</Text>
                    </View>
                  </View>
                )}
                {Boolean(data.intervention_therapeutic_notes) && (
                  <View style={styles.infoItem}>
                    <Icon
                      name="note-text"
                      size={20}
                      color={colors.secondary || '#4CAF50'}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Therapeutic Notes</Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {data.intervention_therapeutic_notes}
                        </Text>
                      ) : (
                        <Input
                          placeholder="Therapeutic Notes"
                          value={data.intervention_therapeutic_notes || ''}
                          onChangeText={v =>
                            onChange('intervention_therapeutic_notes', v)
                          }
                          style={styles.inlineInput}
                          multiline
                        />
                      )}
                    </View>
                  </View>
                )}
                {Boolean(data.last_intervention_date) && (
                  <View style={styles.infoItem}>
                    <Icon
                      name="calendar"
                      size={20}
                      color={colors.secondary || '#4CAF50'}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>
                        Last Intervention Date
                      </Text>
                      {shouldShowReadOnly ? (
                        <Text style={styles.infoValue}>
                          {dayjs(data.last_intervention_date).format(
                            'DD-MM-YYYY',
                          )}
                        </Text>
                      ) : (
                        <Input
                          placeholder="DD-MM-YYYY"
                          value={
                            data.last_intervention_date
                              ? dayjs(data.last_intervention_date).format(
                                  'DD-MM-YYYY',
                                )
                              : ''
                          }
                          onChangeText={v =>
                            onChange('last_intervention_date', v)
                          }
                          style={styles.inlineInput}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Save button for admin users */}
          {!shouldShowReadOnly && data && (
            <View style={styles.actionButtons}>
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
      </ScrollView>

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
  saveBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
    minHeight: 56,
  },
  saveBtnDisabled: {
    backgroundColor: '#9bb5d9',
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
    backgroundColor: colors.secondary || '#4CAF50',
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

  // Screening and Intervention Section Styles
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
    borderTopColor: (colors.secondary || '#4CAF50') + '30',
    gap: spacing.sm,
  },
});

export default BeneficiaryDetail;
