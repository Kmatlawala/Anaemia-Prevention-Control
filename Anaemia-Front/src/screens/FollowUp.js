import React, {useCallback, useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import LinearGradient from 'react-native-linear-gradient';

import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';

const {width: screenWidth} = Dimensions.get('window');

import {API} from '../utils/api';
import {getRole} from '../utils/role';
import {
  sendSmartSMS,
  formatPhoneNumber,
  isValidPhoneNumber,
} from '../utils/sms';

const FollowUp = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [full, setFull] = useState([]);
  const [list, setList] = useState([]);

  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [nextDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  const DateTimePicker = useMemo(() => {
    try {
      const mod = require('@react-native-community/datetimepicker');
      return mod.default || mod.DateTimePicker || null;
    } catch (_) {
      return null;
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    (async () => {
      const r = await getRole();
      setIsPatient(String(r || '').toLowerCase() === 'patient');
    })();
  }, []);

  useEffect(() => {
    const onBack = () => {
      navigation.goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [navigation]);

  const applyFilter = useCallback(() => {
    if (!Array.isArray(full)) {
      setList([]);
      return;
    }

    const byDate = full.filter(i => {
      if (!i.follow_up_due) {
        return false;
      }
      const due = dayjs(i.follow_up_due).format('YYYY-MM-DD');
      return due === filterDate;
    });

    const seen = new Set();
    const uniqueList = byDate.filter(item => {
      if (!item.id) return true;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    setList(uniqueList);
  }, [full, filterDate]);

  const loadWorklist = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.getBeneficiariesWithData(1000);
      const all = response?.data || response;
      if (!Array.isArray(all)) {
        setFull([]);
        setList([]);
        return;
      }

      const rows = all.filter(b => b.follow_up_due && b.follow_up_done !== 1);

      const seen = new Set();
      const uniqueRows = rows.filter(item => {
        if (!item.id) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      uniqueRows.sort((a, b) =>
        String(a.follow_up_due).localeCompare(String(b.follow_up_due)),
      );
      setFull(uniqueRows);
    } catch (e) {
      Alert.alert('Load failed', 'Could not load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadWorklist();
    }, [loadWorklist]),
  );

  useEffect(() => {
    applyFilter();
  }, [full, filterDate, applyFilter]);

  const [isPatient, setIsPatient] = useState(false);
  const markDone = async item => {
    try {
      if (isPatient) {
        Alert.alert('Not allowed', 'Patients cannot modify follow-ups.');
        return;
      }

      const currentFollowUpDate = dayjs(item.follow_up_due);
      const nextFollowUpDate = currentFollowUpDate
        .add(2, 'month')
        .endOf('day')
        .toISOString();
      const nextFollowUpFormatted =
        dayjs(nextFollowUpDate).format('DD-MM-YYYY');

      const updateData = {
        name: item.name,
        age: item.age,
        gender: item.gender,
        phone: item.phone,
        address: item.address,
        id_number: item.id_number,
        aadhaar_hash: item.aadhaar_hash,
        dob: item.dob,
        category: item.category,
        alt_phone: item.alt_phone,
        doctor_name: item.doctor_name,
        doctor_phone: item.doctor_phone,
        registration_date: item.registration_date,
        location: item.location,
        hb: item.hb,
        calcium_qty: item.calcium_qty,
        short_id: item.short_id,

        follow_up_done: 0,
        last_followed: dayjs().toISOString(),
        follow_up_due: nextFollowUpDate,
      };

      await API.updateBeneficiary(item.id, updateData);

      if (item.phone && isValidPhoneNumber(item.phone)) {
        try {
          const formattedPhone = formatPhoneNumber(item.phone);
          const message = `Dear ${item.name}, your follow-up has been completed. Your next follow-up is scheduled for ${nextFollowUpFormatted}. Thank you for visiting Anaemia Health.`;

          const smsSuccess = await sendSmartSMS(formattedPhone, message, true);
          if (smsSuccess) {
          }
        } catch (smsError) {}
      }

      Alert.alert(
        'Success',
        `Follow-up marked as done! Next follow-up scheduled for ${nextFollowUpFormatted}. SMS sent to patient.`,
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      await loadWorklist();
    } catch (e) {
      Alert.alert('Failed', 'Could not mark as done.');
    }
  };

  const scheduleNext = async item => {
    try {
      if (isPatient) {
        Alert.alert('Not allowed', 'Patients cannot schedule follow-ups.');
        return;
      }

      const currentFollowUpDate = item.follow_up_due
        ? dayjs(item.follow_up_due)
        : dayjs();
      const next = currentFollowUpDate
        .add(30, 'day')
        .endOf('day')
        .toISOString();
      const formattedDate = dayjs(next).format('DD-MM-YYYY');

      const updateData = {
        name: item.name,
        age: item.age,
        gender: item.gender,
        phone: item.phone,
        address: item.address,
        id_number: item.id_number,
        aadhaar_hash: item.aadhaar_hash,
        dob: item.dob,
        category: item.category,
        alt_phone: item.alt_phone,
        doctor_name: item.doctor_name,
        doctor_phone: item.doctor_phone,
        registration_date: item.registration_date,
        location: item.location,
        hb: item.hb,
        calcium_qty: item.calcium_qty,
        short_id: item.short_id,

        follow_up_due: next,
        follow_up_done: 0,
      };

      await API.updateBeneficiary(item.id, updateData);

      if (item.phone && isValidPhoneNumber(item.phone)) {
        try {
          const formattedPhone = formatPhoneNumber(item.phone);
          const message = `Dear ${item.name}, your follow-up has been rescheduled to ${formattedDate}. Please visit on time. Thank you. - Anaemia Health`;

          const smsSuccess = await sendSmartSMS(formattedPhone, message, true);
          if (smsSuccess) {
          }
        } catch (smsError) {}
      }

      Alert.alert(
        'Success',
        `Follow-up scheduled for ${formattedDate}.${
          item.phone && isValidPhoneNumber(item.phone)
            ? ' SMS sent to patient.'
            : ''
        }`,
      );

      await loadWorklist();
    } catch (e) {
      Alert.alert('Failed', 'Could not schedule follow-up.');
    }
  };

  const sendFollowUpReminderSMS = async item => {
    try {
      if (!item.phone || !isValidPhoneNumber(item.phone)) {
        Alert.alert('Error', 'No valid phone number found for this patient.');
        return;
      }

      const formattedPhone = formatPhoneNumber(item.phone);
      const dueDate = item.follow_up_due
        ? dayjs(item.follow_up_due).format('DD-MM-YYYY')
        : 'soon';

      const message = `Dear ${item.name}, this is a reminder for your follow-up appointment scheduled for ${dueDate}. Please visit on time. Contact us if you have any questions. - Anaemia Health`;

      const success = await sendSmartSMS(formattedPhone, message, true);

      if (success) {
        Alert.alert('Success', 'Follow-up reminder SMS sent successfully!');
      } else {
        Alert.alert('Failed', 'Could not send SMS. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send SMS: ' + error.message);
    }
  };

  const sendBulkFollowUpSMS = async () => {
    try {
      if (list.length === 0) {
        Alert.alert('No Data', 'No follow-ups available to send SMS.');
        return;
      }

      const validPatients = list.filter(
        item => item.phone && isValidPhoneNumber(item.phone),
      );

      if (validPatients.length === 0) {
        Alert.alert(
          'No Valid Numbers',
          'No patients with valid phone numbers found.',
        );
        return;
      }

      Alert.alert(
        'Send Bulk SMS',
        `Send follow-up reminders to ${validPatients.length} patients?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Send',
            onPress: async () => {
              let successCount = 0;
              let failCount = 0;

              for (const item of validPatients) {
                try {
                  const formattedPhone = formatPhoneNumber(item.phone);
                  const dueDate = item.follow_up_due
                    ? dayjs(item.follow_up_due).format('DD-MM-YYYY')
                    : 'soon';

                  const message = `Dear ${item.name}, this is a reminder for your follow-up appointment scheduled for ${dueDate}. Please visit on time. Contact us if you have any questions. - Anaemia Health`;

                  const success = await sendSmartSMS(
                    formattedPhone,
                    message,
                    true,
                  );
                  if (success) {
                    successCount++;
                  } else {
                    failCount++;
                  }

                  await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                  failCount++;
                }
              }

              Alert.alert(
                'Bulk SMS Complete',
                `Sent: ${successCount} | Failed: ${failCount}`,
                [{text: 'OK'}],
              );
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send bulk SMS: ' + error.message);
    }
  };

  const openDetail = item => {
    navigation.navigate('BeneficiaryDetail', {
      unique_id: item.unique_id,
      record: item,
      readOnly: isPatient,
      fromFollowUp: !isPatient,
    });
  };

  const loadPatientHistory = async item => {
    setLoadingHistory(true);
    try {
      const response = await API.getBeneficiaryHistory(item.id);
      const historyData = {
        patient: item,
        screenings: response?.screenings || [],
        interventions: response?.interventions || [],
      };

      setSelectedPatientHistory(historyData);

      setHistoryModalVisible(true);
    } catch (error) {
      let errorMessage = 'Could not load patient history.';
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.data) {
          errorMessage =
            typeof error.data === 'string'
              ? error.data
              : error.data.message || errorMessage;
        } else if (error.originalError) {
          errorMessage =
            typeof error.originalError === 'string'
              ? error.originalError
              : error.originalError?.message || errorMessage;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoadingHistory(false);
    }
  };

  const renderItem = ({item, index}) => (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30 - index * 5],
              }),
            },
          ],
        },
      ]}>
      <View style={styles.cardContent}>
        <TouchableOpacity
          onPress={() => openDetail(item)}
          activeOpacity={0.8}
          style={styles.cardClickableArea}>
          <View style={styles.cardHeader}>
            <View style={styles.patientInfo}>
              <View style={styles.avatarContainer}>
                <Icon name="account-circle" size={32} color={colors.primary} />
              </View>
              <View style={styles.patientDetails}>
                <Text style={styles.name}>{item.name || '-'}</Text>
                <Text style={styles.sub}>
                  {item.id_masked || item.id_number || ''} • {item.phone || '-'}
                </Text>
                {}
                {(item.latest_hemoglobin || item.last_intervention_date) && (
                  <View style={styles.historySummary}>
                    {item.latest_hemoglobin && (
                      <View style={styles.historyBadge}>
                        <Icon name="water" size={12} color={colors.primary} />
                        <Text style={styles.historyBadgeText}>
                          Last HB: {item.latest_hemoglobin} g/dL
                        </Text>
                      </View>
                    )}
                    {item.last_intervention_date && (
                      <View style={styles.historyBadge}>
                        <Icon name="pill" size={12} color={colors.info} />
                        <Text style={styles.historyBadgeText}>
                          Last Intervention:{' '}
                          {dayjs(item.last_intervention_date).format(
                            'DD-MM-YYYY',
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
            <View style={styles.dueDateContainer}>
              <Text style={styles.dueDateLabel}>Due Date</Text>
              <Text style={styles.badgeDue}>
                {item.follow_up_due
                  ? dayjs(item.follow_up_due).format('MMM DD')
                  : '-'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {}
        <TouchableOpacity
          style={styles.viewHistoryButton}
          onPress={() => loadPatientHistory(item)}
          disabled={loadingHistory}
          activeOpacity={0.7}>
          {loadingHistory ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Icon name="history" size={16} color={colors.primary} />
              <Text style={styles.viewHistoryText}>View History</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={() => markDone(item)}>
            <LinearGradient
              colors={[colors.success, colors.success + 'CC']}
              style={styles.btnGradient}>
              <Icon name="check" size={16} color={colors.white} />
              <Text style={styles.btnText}>Mark Done</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => scheduleNext(item)}>
            <Icon name="calendar-plus" size={16} color={colors.primary} />
            <Text style={styles.btnOutlineText}>
              {nextDate ? `Schedule ${nextDate}` : 'Schedule +30d'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <>
      <View style={styles.screen}>
        <Header
          title="Follow-Up Management"
          variant="back"
          onBackPress={() => navigation.goBack()}
          rightIconName="calendar-check"
        />

        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          {}
          <View style={styles.dateSection}>
            <View style={styles.dateHeader}>
              <Icon name="calendar" size={20} color={colors.primary} />
              <Text style={styles.dateLabel}>Follow-ups for date</Text>
              {full.length > 0 && (
                <Text style={styles.countText}>
                  ({list.length} of {full.length})
                </Text>
              )}
            </View>

            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateInputContainer}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}>
                <Text style={styles.dateValue}>
                  {dayjs(filterDate).format('DD-MM-YYYY')}
                </Text>
                <Icon name="calendar-month" size={24} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterDate(dayjs().format('YYYY-MM-DD'))}
                style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>

            {}
            {showDatePicker && DateTimePicker && (
              <DateTimePicker
                mode="date"
                display="calendar"
                value={filterDate ? new Date(filterDate) : new Date()}
                minimumDate={dayjs().subtract(120, 'year').toDate()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setFilterDate(dayjs(date).format('YYYY-MM-DD'));
                  }
                }}
              />
            )}
          </View>

          {}
          {loading ? (
            <ActivityIndicator style={{marginTop: spacing.lg}} />
          ) : (
            <FlatList
              data={list}
              keyExtractor={i => String(i.id)}
              renderItem={renderItem}
              contentContainerStyle={{
                paddingTop: spacing.sm,
                paddingBottom: spacing.lg,
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Icon
                      name="calendar-check-outline"
                      size={80}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.emptyText}>
                    {full.length === 0 ? 'No Follow-up' : 'No Follow-up'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {full.length === 0
                      ? 'There are no follow-up appointments scheduled. New appointments will appear here when created.'
                      : `No follow-up appointments for ${dayjs(
                          filterDate,
                        ).format('DD MMM YYYY')}. ${full.length} follow-up${
                          full.length === 1 ? '' : 's'
                        } scheduled on other dates.`}
                  </Text>
                  {full.length > 0 && (
                    <View style={styles.emptyActions}>
                      <TouchableOpacity
                        style={styles.emptyActionButton}
                        onPress={() =>
                          setFilterDate(dayjs().format('YYYY-MM-DD'))
                        }>
                        <Icon
                          name="calendar-today"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.emptyActionText}>View Today</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.emptyActionButton}
                        onPress={() =>
                          setFilterDate(
                            dayjs().add(1, 'day').format('YYYY-MM-DD'),
                          )
                        }>
                        <Icon
                          name="calendar-arrow-right"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.emptyActionText}>
                          View Tomorrow
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              }
            />
          )}
        </Animated.View>
      </View>

      {}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setHistoryModalVisible(false);
        }}
        onShow={() => {}}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              setHistoryModalVisible(false);
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPatientHistory?.patient?.name || 'Patient'} History
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setHistoryModalVisible(false);
                }}
                style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
              alwaysBounceVertical={false}
              scrollEnabled={true}
              keyboardShouldPersistTaps="handled">
              {}
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Icon name="water" size={20} color={colors.primary} />
                  <Text style={styles.historySectionTitle}>
                    Hemoglobin (HB) History
                  </Text>
                </View>
                {selectedPatientHistory?.screenings?.length > 0 ? (
                  selectedPatientHistory.screenings.map((screening, index) => (
                    <View key={screening.id} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyItemDate}>
                          {dayjs(screening.created_at).format('DD-MM-YYYY')}
                        </Text>
                        <View style={styles.hbValueBadge}>
                          <Text style={styles.hbValueText}>
                            {screening.hemoglobin} g/dL
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyItemDetails}>
                        {screening.anemia_category && (
                          <Text style={styles.historyItemDetail}>
                            Category: {screening.anemia_category}
                          </Text>
                        )}
                        {screening.severity && (
                          <Text style={styles.historyItemDetail}>
                            Severity: {screening.severity}
                          </Text>
                        )}
                        {screening.visit_type && (
                          <Text style={styles.historyItemDetail}>
                            Visit Type: {screening.visit_type}
                          </Text>
                        )}
                        {screening.notes && (
                          <Text style={styles.historyItemNotes}>
                            Notes: {screening.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noHistoryText}>
                    No screening history available
                  </Text>
                )}
              </View>

              {}
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Icon name="pill" size={20} color={colors.info} />
                  <Text style={styles.historySectionTitle}>
                    Intervention History
                  </Text>
                </View>
                {selectedPatientHistory?.interventions?.length > 0 ? (
                  (() => {
                    const groupedByDate = {};
                    selectedPatientHistory.interventions.forEach(
                      intervention => {
                        const dateKey = dayjs(intervention.created_at).format(
                          'DD-MM-YYYY',
                        );
                        if (!groupedByDate[dateKey]) {
                          groupedByDate[dateKey] = [];
                        }
                        groupedByDate[dateKey].push(intervention);
                      },
                    );

                    const sortedDates = Object.keys(groupedByDate).sort(
                      (a, b) => {
                        return (
                          dayjs(b, 'DD-MM-YYYY').valueOf() -
                          dayjs(a, 'DD-MM-YYYY').valueOf()
                        );
                      },
                    );

                    return sortedDates.map((dateKey, dateIndex) => {
                      const interventionsForDate = groupedByDate[dateKey];

                      return (
                        <View key={dateKey} style={styles.historyItem}>
                          <View style={styles.historyItemHeader}>
                            <Text style={styles.historyItemDate}>
                              {dateKey}
                              {interventionsForDate.length > 1 && (
                                <Text style={styles.multipleEntriesBadge}>
                                  {' '}
                                  ({interventionsForDate.length} entries)
                                </Text>
                              )}
                            </Text>
                          </View>
                          {interventionsForDate.map(
                            (intervention, intIndex) => (
                              <View
                                key={`${intervention.id}-${intIndex}`}
                                style={styles.interventionGroup}>
                                {interventionsForDate.length > 1 && (
                                  <Text style={styles.interventionEntryLabel}>
                                    Entry {intIndex + 1}:
                                  </Text>
                                )}
                                <View style={styles.historyItemDetails}>
                                  <View style={styles.interventionRow}>
                                    <Text style={styles.interventionLabel}>
                                      IFA:
                                    </Text>
                                    <Text style={styles.interventionValue}>
                                      {intervention.ifa_yes
                                        ? `Yes (${
                                            intervention.ifa_quantity || 0
                                          } tablets)`
                                        : 'No'}
                                    </Text>
                                  </View>
                                  <View style={styles.interventionRow}>
                                    <Text style={styles.interventionLabel}>
                                      Calcium:
                                    </Text>
                                    <Text style={styles.interventionValue}>
                                      {intervention.calcium_yes
                                        ? `Yes (${
                                            intervention.calcium_quantity || 0
                                          } tablets)`
                                        : 'No'}
                                    </Text>
                                  </View>
                                  <View style={styles.interventionRow}>
                                    <Text style={styles.interventionLabel}>
                                      Deworming:
                                    </Text>
                                    <Text style={styles.interventionValue}>
                                      {intervention.deworm_yes
                                        ? `Yes (${
                                            intervention.deworming_date
                                              ? dayjs(
                                                  intervention.deworming_date,
                                                ).format('DD-MM-YYYY')
                                              : 'Date N/A'
                                          })`
                                        : 'No'}
                                    </Text>
                                  </View>
                                  <View style={styles.interventionRow}>
                                    <Text style={styles.interventionLabel}>
                                      Therapeutic:
                                    </Text>
                                    <Text style={styles.interventionValue}>
                                      {intervention.therapeutic_yes
                                        ? 'Yes'
                                        : 'No'}
                                    </Text>
                                  </View>
                                  {intervention.therapeutic_notes && (
                                    <Text style={styles.historyItemNotes}>
                                      Therapeutic Notes:{' '}
                                      {intervention.therapeutic_notes}
                                    </Text>
                                  )}
                                  <View style={styles.interventionRow}>
                                    <Text style={styles.interventionLabel}>
                                      Referral:
                                    </Text>
                                    <Text style={styles.interventionValue}>
                                      {intervention.referral_yes
                                        ? `Yes (${
                                            intervention.referral_facility ||
                                            'Facility N/A'
                                          })`
                                        : 'No'}
                                    </Text>
                                  </View>
                                </View>
                                {intIndex < interventionsForDate.length - 1 && (
                                  <View style={styles.interventionSeparator} />
                                )}
                              </View>
                            ),
                          )}
                        </View>
                      );
                    });
                  })()
                ) : (
                  <Text style={styles.noHistoryText}>
                    No intervention history available
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},

  container: {
    flex: 1,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
  },

  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    ...shadows.md,
  },

  dateSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  countText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    fontStyle: 'italic',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  dateValue: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  calendarButton: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '10',
  },
  todayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  todayButtonText: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
    fontSize: 14,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardContent: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
  },
  cardClickableArea: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  patientDetails: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dueDateContainer: {
    alignItems: 'flex-end',
  },
  dueDateLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 11,
  },
  badgeDue: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    color: colors.primary,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
  },
  btnText: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    fontSize: 14,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
    backgroundColor: colors.white,
  },
  btnOutlineText: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    fontSize: 14,
  },
  smsBtn: {
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.info + '10',
    minWidth: 80,
  },
  smsBtnText: {
    color: colors.info,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    fontSize: 12,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.horizontal,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    ...shadows.sm,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  emptyText: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: typography.weights.bold,
    fontSize: 20,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.horizontal,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
    ...shadows.sm,
  },
  emptyActionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
  },

  historySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    gap: 4,
  },
  historyBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
  },

  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  viewHistoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: Dimensions.get('window').height * 0.9,
    minHeight: Dimensions.get('window').height * 0.7,
    width: '100%',
    flexDirection: 'column',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexShrink: 0,
  },
  modalTitle: {
    ...typography.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    paddingBottom: 100,
  },

  historySection: {
    marginBottom: spacing.xl,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  historySectionTitle: {
    ...typography.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  historyItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  historyItemDate: {
    ...typography.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  hbValueBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  hbValueText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  historyItemDetails: {
    gap: spacing.xs,
  },
  historyItemDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  historyItemNotes: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  interventionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  interventionLabel: {
    ...typography.caption,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    minWidth: 80,
  },
  interventionValue: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  noHistoryText: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  multipleEntriesBadge: {
    ...typography.caption,
    color: colors.info,
    fontWeight: typography.weights.medium,
  },
  interventionGroup: {
    marginBottom: spacing.sm,
  },
  interventionEntryLabel: {
    ...typography.caption,
    fontWeight: typography.weights.semibold,
    color: colors.info,
    marginBottom: spacing.xs,
  },
  interventionSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});

export default FollowUp;
