// src/screens/Registration.js
import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import LinearGradient from 'react-native-linear-gradient';

import Input from '../components/Input';
import Select from '../components/Select';
import Header from '../components/Header';
import {hashAadhaar, maskAadhaar} from '../utils/hash';
import {parseFieldsFromText} from '../utils/ocr';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';

// project-specific
import {API} from '../utils/api';
import {saveDocumentFile} from '../utils/filestore';
import {getRole} from '../utils/role';
import {sendPushToSelf} from '../utils/notifications';

const Registration = ({navigation, route}) => {
  const [aadhaar, setAadhaar] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [regDate, setRegDate] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  // Date picker states
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showRegDatePicker, setShowRegDatePicker] = useState(false);

  // DateTimePicker for calendar functionality
  const DateTimePicker = useMemo(() => {
    try {
      const mod = require('@react-native-community/datetimepicker');
      return mod.default || mod.DateTimePicker || null;
    } catch (_) {
      return null;
    }
  }, []);

  const [frontUri, setFrontUri] = useState(null);
  const [backUri, setBackUri] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('front');
  const [editingId, setEditingId] = useState(null);
  const isScannerOpenRef = useRef(false);
  const fade = useRef(new Animated.Value(0)).current;

  // VALIDATION STATE (only shown after Save is tapped)
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);

  // for focusing / scrolling to the first error
  const refs = {
    aadhaar: useRef(null),
    name: useRef(null),
    dob: useRef(null),
    category: useRef(null),
    phone: useRef(null),
    altPhone: useRef(null),
    address: useRef(null),
    doctorName: useRef(null),
    doctorPhone: useRef(null),
  };

  useEffect(() => {
    (async () => {
      const r = await getRole();
      if (String(r || '').toLowerCase() === 'patient') {
        Alert.alert('Not allowed', 'This screen is for administrators only.');
        navigation.navigate('Dashboard');
        return;
      }
    })();
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    const rec = route?.params?.record;
    if (rec) {
      setEditingId(rec.id || null);
      setAadhaar(rec.id_number || rec.id_masked || '');
      setName(rec.name || '');
      setDob(rec.dob || '');
      setCategory(rec.category || '');
      setAddress(rec.address || '');
      setPhone(rec.phone || '');
      setAltPhone(rec.alt_phone || '');
      setDoctorName(rec.doctor_name || '');
      setDoctorPhone(rec.doctor_phone || '');
      setFrontUri(rec.front_document_uri || rec.front_document || null);
      setBackUri(rec.back_document_uri || rec.back_document || null);
      setStep('review');
    }
  }, [route, fade, navigation]);

  // ---------- Validators (plain functions; we won't run them until Save) ----------
  const isDob = val =>
    /^(19|20)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(
      String(val || ''),
    );
  const phoneErr = val => {
    const d = String(val || '').replace(/\D/g, '');
    const last10 = d.length > 10 ? d.slice(-10) : d;
    return last10.length === 10 ? '' : 'Enter 10-digit phone number';
  };

  const runValidation = () => {
    const v = {};

    const aad = (aadhaar || '').replace(/\s+/g, '');
    if (!aad) v.aadhaar = 'Aadhaar is required';
    else if (aad.length !== 12) v.aadhaar = 'Aadhaar must be 12 digits';

    if (!name?.trim()) v.name = 'Name is required';

    if (!dob) v.dob = 'DOB is required';
    else if (!isDob(dob)) v.dob = 'Use YYYY-MM-DD';

    if (!category?.trim()) v.category = 'Category is required';

    const pErr = phoneErr(phone);
    if (pErr) v.phone = pErr;

    const apErr = phoneErr(altPhone);
    if (apErr) v.altPhone = apErr;

    if (!doctorName?.trim()) v.doctorName = 'Doctor name is required';
    const dpErr = phoneErr(doctorPhone);
    if (dpErr) v.doctorPhone = dpErr;

    return v;
  };

  const focusFirstError = errs => {
    const order = [
      'aadhaar',
      'name',
      'dob',
      'category',
      'phone',
      'altPhone',
      'doctorName',
      'doctorPhone',
      'address',
      'regDate',
    ];
    const key = order.find(k => errs[k]);
    if (!key) return;
    // best-effort scroll to top; focusing custom inputs/selects depends on your components
    scrollRef.current?.scrollTo({y: 0, animated: true});
  };

  // ---------- Permissions & Scanner ----------
  const ensureCameraPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const checkResult = await check(PERMISSIONS.ANDROID.CAMERA);
        if (checkResult === RESULTS.GRANTED) return true;
        const req = await request(PERMISSIONS.ANDROID.CAMERA);
        return req === RESULTS.GRANTED;
      } else if (Platform.OS === 'ios') {
        const checkResult = await check(PERMISSIONS.IOS.CAMERA);
        if (checkResult === RESULTS.GRANTED) return true;
        const req = await request(PERMISSIONS.IOS.CAMERA);
        return req === RESULTS.GRANTED;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const scanDocument = useCallback(
    async (side = 'front') => {
      setProcessing(true);
      try {
        const DocumentScanner = require('react-native-document-scanner-plugin');
        const result = await DocumentScanner.scanDocument({
          croppedImageQuality: 90,
          maxNumDocuments: 1,
        });

        let uri = null;
        if (Array.isArray(result) && result.length) {
          const first = result[0];
          uri =
            typeof first === 'string'
              ? first
              : first.croppedImage || first.scannedImage || first.uri || null;
        } else if (result && typeof result === 'object') {
          uri =
            result.croppedImage ||
            result.scannedImage ||
            result.uri ||
            result.croppedImages?.[0] ||
            result.scannedImages?.[0] ||
            (typeof Object.values(result)[0] === 'string'
              ? Object.values(result)[0]
              : null);
        }

        if (!uri) {
          Alert.alert(
            'No document',
            'No document detected. Try again with a clearer view.',
          );
          return;
        }

        let normalized = uri;
        if (
          !normalized.startsWith('file://') &&
          !normalized.startsWith('content://') &&
          !normalized.startsWith('http')
        ) {
          normalized = normalized.startsWith('/')
            ? `file://${normalized}`
            : `file://${normalized}`;
        }

        if (side === 'front') setFrontUri(normalized);
        else setBackUri(normalized);

        // Best-effort OCR prefill
        try {
          const ocr = await TextRecognition.recognize(normalized);
          const ocrText = (ocr && ocr.text) || '';
          if (ocrText) {
            const parsed = parseFieldsFromText(ocrText);
            if (parsed.id && !aadhaar) setAadhaar(parsed.id);
            if (parsed.name && !name) setName(parsed.name);
            if (parsed.phone && !phone) setPhone(parsed.phone);
            if (parsed.address && !address) setAddress(parsed.address);
          }
        } catch {}

        if (side === 'front') setStep('back');
        else setStep('review');
      } catch (err) {
        Alert.alert(
          'Scanner error',
          err?.message || 'Document scanner failed or was cancelled.',
        );
      } finally {
        setProcessing(false);
        isScannerOpenRef.current = false;
      }
    },
    [aadhaar, name, phone, address],
  );

  const openScannerSafely = useCallback(
    async side => {
      if (isScannerOpenRef.current) return;
      isScannerOpenRef.current = true;
      try {
        const ok = await ensureCameraPermission();
        if (!ok) {
          Alert.alert(
            'Permission required',
            'Camera permission is required to scan documents.',
          );
          isScannerOpenRef.current = false;
          return;
        }
        setTimeout(() => scanDocument(side), 120);
      } catch {
        Alert.alert('Scanner error', 'Unable to open scanner.');
        isScannerOpenRef.current = false;
      }
    },
    [ensureCameraPermission, scanDocument],
  );

  // ---------- Save ----------
  const onSave = async () => {
    const v = runValidation();

    if (Object.keys(v).length) {
      setErrors(v);
      setShowErrors(true);
      focusFirstError(v);
      return;
    }

    setProcessing(true);
    try {
      // Aadhaar mandatory + unique
      const normalizedAad = (aadhaar || '').replace(/\s+/g, '');
      const aadHash = hashAadhaar(normalizedAad);
      const idMasked = maskAadhaar(normalizedAad);

      // Dedupe by Aadhaar is now a backend concern; ensure a unique constraint there

      const uniqueId = `${aadHash}-${Date.now()}`;
      // Generate unique short_id with timestamp and random component
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const timestamp = Date.now().toString(36).slice(-4);
      const randomSeed = Math.floor(Math.random() * 1000);
      const seed = Math.abs(
        [...String(aadHash + timestamp + randomSeed)].reduce(
          (a, c) => (a << 5) - a + c.charCodeAt(0),
          0,
        ),
      );
      let s = '';
      for (let i = 0; i < 4; i++) {
        s += alphabet[(seed + i * 13 + randomSeed) % alphabet.length];
      }
      const shortId = route?.params?.record?.short_id || s;

      let frontLocal = null,
        backLocal = null;

      const derivedAge = Math.max(
        0,
        Math.floor(dayjs().diff(dayjs(dob), 'year')),
      );

      // Map to backend payload including all details
      const payload = {
        name,
        age: derivedAge,
        gender: null,
        phone,
        address,
        id_number: idMasked,
        aadhaar_hash: aadHash,
        dob,
        category,
        alt_phone: altPhone,
        doctor_name: doctorName,
        doctor_phone: doctorPhone,
        registration_date:
          regDate && /^\d{4}-\d{2}-\d{2}$/.test(regDate)
            ? dayjs(regDate).toISOString()
            : dayjs().toISOString(),
        location: null,
        front_document: null,
        back_document: null,
        follow_up_due: dayjs(
          regDate && /^\d{4}-\d{2}-\d{2}$/.test(regDate) ? regDate : undefined,
        )
          .add(2, 'month')
          .endOf('day')
          .toISOString(),
        hb: null,
        calcium_qty: null,
        short_id: shortId, // <-- Added to store the 4-character unique ID
      };

      if (editingId) {
        await API.updateBeneficiary(editingId, payload);
      } else {
        await API.createBeneficiary(payload);
      }

      // Send SMS using the same method as beneficiary update (fixedSMS)
      try {
        // Add a small delay to ensure API call is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        const {sendSMSToBeneficiary} = await import('../utils/fixedSMS');

        // Format doctor phone number properly
        const formattedDoctorPhone = doctorPhone
          ? doctorPhone.replace(/\D/g, '')
          : '';
        const doctorInfo =
          doctorName && formattedDoctorPhone
            ? `${doctorName} (${formattedDoctorPhone})`
            : doctorName || 'Contact us for details';

        const message = `Hello ${name}, your registration with Animia is successful. Your ID: ${shortId}. Doctor: ${doctorInfo}. Thank you!`;
        console.log('[Registration] SMS message:', message);
        console.log(
          '[Registration] Doctor phone formatted:',
          formattedDoctorPhone,
        );

        // Create beneficiary object for SMS sending (same as update)
        const beneficiaryData = {
          name: name,
          phone: phone,
          alt_phone: altPhone,
          doctor_phone: doctorPhone,
          short_id: shortId,
        };

        // Send SMS to all contacts (primary, alternative, doctor) - same as update
        // Add timeout to prevent SMS from getting stuck
        const smsPromise = sendSMSToBeneficiary(beneficiaryData, message);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('SMS timeout after 30 seconds')),
            30000,
          ),
        );

        const smsResult = await Promise.race([smsPromise, timeoutPromise]);
        console.log('[Registration] Multi-contact SMS result:', smsResult);

        // If SMS failed, try sending to primary phone only as fallback
        if (!smsResult.success && beneficiaryData.phone) {
          console.log(
            '[Registration] Trying fallback SMS to primary phone only...',
          );
          try {
            const {sendSMS} = await import('../utils/fixedSMS');
            const fallbackResult = await sendSMS(
              beneficiaryData.phone,
              message,
            );
            if (fallbackResult) {
              console.log('[Registration] Fallback SMS successful');
              Alert.alert(
                'SMS Sent (Fallback)',
                'SMS sent to primary phone number. Alternative contacts may not have received the message.',
              );
              return; // Exit early if fallback succeeded
            }
          } catch (fallbackError) {
            console.error(
              '[Registration] Fallback SMS also failed:',
              fallbackError,
            );
          }
        }

        // Show SMS result to user
        if (smsResult.success) {
          Alert.alert(
            'SMS Sent',
            `SMS sent to ${smsResult.summary?.successful || 0}/${
              smsResult.summary?.total || 0
            } contacts. Check your phones for the messages.`,
          );
        } else {
          Alert.alert(
            'SMS Failed',
            'Failed to send SMS. Please try again or send manually.',
          );
        }
      } catch (smsError) {
        console.error('[Registration] Failed to send SMS:', smsError);
        if (smsError.message.includes('timeout')) {
          Alert.alert(
            'SMS Timeout',
            'SMS sending took too long. Please check your phone for messages or try again.',
          );
        } else {
          Alert.alert(
            'SMS Error',
            'SMS sending failed. Please try again or send manually.',
          );
        }
      }

      // Send FCM push locally (device owner). Replace with targeted tokens as needed.
      const followUpDate = dayjs(
        payload.follow_up_due || payload.followUpDue,
      ).format('YYYY-MM-DD');

      try {
        await sendPushToSelf(
          editingId ? 'Update successful' : 'Registration successful',
          `Follow-up due on ${followUpDate}. ID: ${shortId}.`,
          {
            type: editingId ? 'update' : 'registration',
            shortId,
            id: editingId ? String(editingId) : undefined,
          },
        );
        console.log('[Registration] Push notification sent successfully');
      } catch (notificationError) {
        console.error(
          '[Registration] Push notification failed:',
          notificationError,
        );
        // Fallback to local notification
        try {
          const {showLocalNotification} = await import(
            '../utils/notifications'
          );
          await showLocalNotification(
            editingId ? 'Update successful' : 'Registration successful',
            `Follow-up due on ${followUpDate}. ID: ${shortId}.`,
          );
          console.log('[Registration] Local notification sent as fallback');
        } catch (localNotificationError) {
          console.error(
            '[Registration] Local notification also failed:',
            localNotificationError,
          );
        }
      }

      Alert.alert(
        'Saved',
        editingId
          ? `Beneficiary updated. ID: ${shortId}`
          : `Beneficiary registered successfully. ID: ${shortId}`,
      );
      // reset
      setAadhaar('');
      setName('');
      setDob('');
      setCategory('');
      setAddress('');
      setPhone('');
      setAltPhone('');
      setDoctorName('');
      setDoctorPhone('');
      setRegDate('');
      setFrontUri(null);
      setBackUri(null);
      setStep('front');
      setEditingId(null);
      setShowErrors(false);
      setErrors({});
      navigation.navigate('Dashboard');
    } catch (e) {
      Alert.alert('Save failed', 'Unable to save beneficiary. See logs.');
    } finally {
      setProcessing(false);
    }
  };

  // Live age display (just read-only info)
  const liveAge = dob
    ? Math.max(0, Math.floor(dayjs().diff(dayjs(dob), 'year')))
    : null;

  // Helper to style inputs only when Save pressed
  const errStyle = key =>
    showErrors && errors[key] ? styles.inputError : null;
  const errText = key =>
    showErrors && errors[key] ? (
      <Text style={styles.errorText}>{errors[key]}</Text>
    ) : null;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      keyboardShouldPersistTaps="handled">
      <Header
        onMenuPress={() => navigation.goBack()}
        title="Register Beneficiary"
        variant="back"
      />

      <Animated.View style={{opacity: fade}}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.iconContainer}>
            <Icon name="account-plus" size={32} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>New Beneficiary Registration</Text>
          <Text style={styles.welcomeSubtitle}>
            Complete the form to register a new beneficiary
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="camera-document" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Document Capture</Text>
          </View>

          <View style={styles.scanRow}>
            <TouchableOpacity
              onPress={() => openScannerSafely('front')}
              style={[styles.scanBtn, step === 'front' && styles.scanBtnActive]}
              disabled={processing}>
              <View style={styles.scanBtnContent}>
                <Icon
                  name="camera"
                  size={20}
                  color={step === 'front' ? '#fff' : colors.primary}
                />
                <Text
                  style={[
                    styles.scanBtnText,
                    step === 'front' && {color: '#fff'},
                  ]}>
                  Scan Front
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openScannerSafely('back')}
              style={[
                styles.scanBtnSecondary,
                step === 'back' && styles.scanBtnSecondaryActive,
              ]}
              disabled={processing}>
              <View style={styles.scanBtnContent}>
                <Icon
                  name="camera-iris"
                  size={20}
                  color={step === 'back' ? '#fff' : colors.primary}
                />
                <Text
                  style={[
                    styles.scanBtnTextSecondary,
                    step === 'back' && {color: '#fff'},
                  ]}>
                  Scan Back
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {frontUri ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Front</Text>
              <Image source={{uri: frontUri}} style={styles.previewImage} />
            </View>
          ) : (
            <Text style={styles.hint}>No front document captured yet</Text>
          )}

          {backUri ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Back</Text>
              <Image source={{uri: backUri}} style={styles.previewImage} />
            </View>
          ) : (
            <Text style={styles.hint}>No back document captured yet</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="account-edit" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Personal Details</Text>
          </View>

          {/* Aadhaar - MANDATORY */}
          <Input
            ref={refs.aadhaar}
            placeholder="Aadhaar (12 digits)"
            keyboardType="numeric"
            value={aadhaar}
            onChangeText={setAadhaar}
            style={[styles.input, errStyle('aadhaar')]}
          />
          {errText('aadhaar')}

          <Input
            ref={refs.name}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            style={[styles.input, errStyle('name')]}
          />
          {errText('name')}

          {/* Date of Birth */}
          <View style={{marginBottom: spacing.xs}}>
            <Text style={styles.dateLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => setShowDobPicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateValue}>{dob || 'YYYY-MM-DD'}</Text>
              <Icon name="calendar-month" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {errText('dob')}

          {/* Registration Date */}
          <View style={{marginBottom: spacing.sm}}>
            <Text style={styles.dateLabel}>Registration Date</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => setShowRegDatePicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateValue}>{regDate || 'YYYY-MM-DD'}</Text>
              <Icon name="calendar-month" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {errText('regDate')}
          <Text style={{marginBottom: spacing.sm, color: colors.text}}>
            Age: {liveAge ?? '—'}
          </Text>

          <Select
            ref={refs.category}
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              {label: 'Pregnant', value: 'Pregnant'},
              {label: 'Child (Below 5)', value: 'Under5'},
              {label: 'Adolescent (10–19)', value: 'Adolescent'},
              {label: 'Women of Reproductive Age', value: 'WoRA'},
            ]}
            placeholder="Select category"
            style={[errStyle('category')]}
          />
          {errText('category')}

          {/* BOTH phone numbers mandatory */}
          <Input
            ref={refs.phone}
            placeholder="Mobile (10 digits)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={[styles.input, errStyle('phone')]}
          />
          {errText('phone')}

          <Input
            ref={refs.altPhone}
            placeholder="Alternate Mobile (10 digits)"
            keyboardType="phone-pad"
            value={altPhone}
            onChangeText={setAltPhone}
            style={[styles.input, errStyle('altPhone')]}
          />
          {errText('altPhone')}

          <Input
            ref={refs.doctorName}
            placeholder="Doctor Name"
            value={doctorName}
            onChangeText={setDoctorName}
            style={[styles.input, errStyle('doctorName')]}
          />
          {errText('doctorName')}

          <Input
            ref={refs.doctorPhone}
            placeholder="Doctor Mobile (10 digits)"
            keyboardType="phone-pad"
            value={doctorPhone}
            onChangeText={setDoctorPhone}
            style={[styles.input, errStyle('doctorPhone')]}
          />
          {errText('doctorPhone')}

          <Input
            ref={refs.address}
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
            style={[styles.input, {height: 88}]}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, processing ? styles.saveBtnDisabled : null]}
          onPress={onSave}
          disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.saveBtnContent}>
              <Icon name="content-save" size={20} color="#fff" />
              <Text style={styles.saveText}>Save Beneficiary</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* DateTimePicker for Date of Birth */}
      {showDobPicker && DateTimePicker && (
        <DateTimePicker
          mode="date"
          display="calendar"
          value={dob ? new Date(dob) : new Date()}
          minimumDate={dayjs().subtract(120, 'year').toDate()}
          onChange={(event, date) => {
            setShowDobPicker(false);
            if (date) {
              setDob(dayjs(date).format('YYYY-MM-DD'));
            }
          }}
        />
      )}

      {/* DateTimePicker for Registration Date */}
      {showRegDatePicker && DateTimePicker && (
        <DateTimePicker
          mode="date"
          display="calendar"
          value={regDate ? new Date(regDate) : new Date()}
          minimumDate={dayjs().subtract(120, 'year').toDate()}
          onChange={(event, date) => {
            setShowRegDatePicker(false);
            if (date) {
              setRegDate(dayjs(date).format('YYYY-MM-DD'));
            }
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  // Welcome Header
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  welcomeTitle: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardTitle: {
    ...typography.subtitle,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  scanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  scanBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  scanBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.md,
  },
  scanBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    fontSize: 14,
  },
  scanBtnSecondary: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  scanBtnSecondaryActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.md,
  },
  scanBtnTextSecondary: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    fontSize: 14,
  },
  previewRow: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewLabel: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
  },
  hint: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  input: {
    marginBottom: spacing.md,
    marginHorizontal: 0,
  },
  inputError: {
    borderColor: '#D9534F',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#D9534F',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
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
  saveText: {
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
    fontSize: 16,
  },
  dateLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: typography.weights.semibold,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  dateValue: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  calendarButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '10',
  },
});

export default Registration;
