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
import Select from '../components/Select';
import {API} from '../utils/api';
import {getRole} from '../utils/role';
import SendSMS from '../components/SendSMS';
import CleanSMSComponent from '../components/CleanSMSComponent';
import {useFocusEffect} from '@react-navigation/native';
import {
  setCurrentBeneficiary,
  updateIntervention,
  setLoading,
  setError,
  selectCurrentBeneficiary,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
} from '../store/beneficiarySlice';

const BeneficiaryDetail = ({route, navigation}) => {
  const dispatch = useDispatch();
  const {unique_id, record, readOnly} = route.params || {};
  const uid = unique_id || (record && record.unique_id);

  console.log('BeneficiaryDetail params:', {unique_id, record, readOnly, uid});

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
  const isScannerOpenRef = useRef(false);

  const data = currentBeneficiary;
  const original = record;

  useEffect(() => {
    if (record) {
      console.log('Using record data:', record);
      dispatch(setCurrentBeneficiary(record));
    } else if (!data && uid) {
      console.log('Loading data for uid:', uid);
      load();
    }
  }, [uid, record]);

  useEffect(() => {
    if (record && !original) setOriginal(record);
  }, [record, original]);
  useEffect(() => {
    (async () => {
      try {
        const r = await getRole();
        setIsPatient(String(r || '').toLowerCase() === 'patient');
      } catch (_) {}
    })();
  }, []);

  console.log('Data :: :: ', data);
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
    console.log('Loading beneficiary with uid:', uid);
    dispatch(setLoading(true));
    try {
      const row = await API.getBeneficiaryByUniqueId(uid);
      console.log('Loaded beneficiary:', row);
      dispatch(setCurrentBeneficiary(row));
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
    console.log('readOnly :: :: ', readOnly);
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
      const updated = await API.updateBeneficiary(data.id, payload);
      dispatch(setCurrentBeneficiary(updated));

      // Send notification after successful update
      try {
        const {sendPushToSelf} = await import('../utils/notifications');
        await sendPushToSelf(
          'Beneficiary Updated',
          `Beneficiary ${data.name} has been updated successfully.`,
          {type: 'beneficiary_updated', id: String(data.id)},
        );
        console.log('Notification sent for beneficiary update');

        // Send SMS to all beneficiary contacts
        try {
          const {sendSMSToBeneficiary} = await import('../utils/fixedSMS');
          const message = `Hello ${data.name}, your profile has been updated in Animia. Please contact us if you have any questions.`;
          console.log('[BeneficiaryDetail] SMS message:', message);

          // Send SMS to all contacts (primary, alternative, doctor)
          const smsResult = await sendSMSToBeneficiary(data, message);
          console.log(
            '[BeneficiaryDetail] Multi-contact SMS result:',
            smsResult,
          );
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
    if (!data || !original) return false;
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
      const b = original[k] ?? null;
      if (String(a ?? '') !== String(b ?? '')) return true;
    }
    return false;
  }, [data, original]);

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
          <Text style={styles.profileName}>{data.name}</Text>
          <Text style={styles.profileId}>
            {data.short_id ||
              data.id_number ||
              data.id_masked ||
              data.unique_id}
          </Text>
          <Text style={styles.profileCategory}>
            {data.category || 'No category'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: spacing.md}}>
        <View style={styles.card}>
          {readOnly || isPatient ? (
            <View style={styles.readOnlyContainer}>
              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Registration Date</Text>
                    <Text style={styles.infoValue}>
                      {data.registration_date
                        ? dayjs(data.registration_date).format('YYYY-MM-DD')
                        : '-'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="account" size={20} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Age</Text>
                    <Text style={styles.infoValue}>
                      {data.age != null ? String(data.age) : '-'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="phone" size={20} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{data.phone || '-'}</Text>
                  </View>
                </View>

                {!!data.address && (
                  <View style={styles.infoItem}>
                    <Icon name="map-marker" size={20} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Address</Text>
                      <Text style={styles.infoValue}>{data.address}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.editableContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="account-edit" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Name</Text>
                  <Input
                    placeholder="Name"
                    value={data.name || ''}
                    onChangeText={v => onChange('name', v)}
                    style={styles.input}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>Age</Text>
                  <Input
                    placeholder="Age"
                    keyboardType="number-pad"
                    value={data.age != null ? String(data.age) : ''}
                    onChangeText={v => onChange('age', v.replace(/\D/g, ''))}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Category</Text>
                <Select
                  label="Category"
                  value={data.category || ''}
                  onChange={v => onChange('category', v)}
                  options={[
                    {label: 'Pregnant', value: 'Pregnant'},
                    {label: 'Child (Below 5)', value: 'Under5'},
                    {label: 'Adolescent (10–19)', value: 'Adolescent'},
                    {label: 'Women of Reproductive Age', value: 'WoRA'},
                  ]}
                />
              </View>

              <View style={styles.sectionHeader}>
                <Icon name="phone" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Phone</Text>
                  <Input
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    value={data.phone || ''}
                    onChangeText={v => onChange('phone', v)}
                    style={styles.input}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>Alternate Phone</Text>
                  <Input
                    placeholder="Alternate Phone"
                    keyboardType="phone-pad"
                    value={data.alt_phone || ''}
                    onChangeText={v => onChange('alt_phone', v)}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Icon name="medical-bag" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Medical Information</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Doctor Name</Text>
                  <Input
                    placeholder="Doctor Name"
                    value={data.doctor_name || ''}
                    onChangeText={v => onChange('doctor_name', v)}
                    style={styles.input}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>Doctor Phone</Text>
                  <Input
                    placeholder="Doctor Phone"
                    keyboardType="phone-pad"
                    value={data.doctor_phone || ''}
                    onChangeText={v => onChange('doctor_phone', v)}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>HB (g/dL)</Text>
                  <Input
                    placeholder="HB"
                    keyboardType="decimal-pad"
                    value={data.hb != null ? String(data.hb) : ''}
                    onChangeText={v => onChange('hb', v)}
                    style={styles.input}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>Calcium (mg)</Text>
                  <Input
                    placeholder="Calcium"
                    keyboardType="number-pad"
                    value={
                      data.calcium_qty != null ? String(data.calcium_qty) : ''
                    }
                    onChangeText={v =>
                      onChange('calcium_qty', v.replace(/\D/g, ''))
                    }
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Address</Text>
                <Input
                  placeholder="Address"
                  value={data.address || ''}
                  onChangeText={v => onChange('address', v)}
                  style={[styles.input, {height: 88}]}
                  multiline
                />
              </View>
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
    gap: spacing.md,
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
  editableContainer: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
});

export default BeneficiaryDetail;
