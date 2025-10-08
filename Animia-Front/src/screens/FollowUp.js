// src/screens/FollowUp.js
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
import {sendSMS} from '../utils/sms';

const FollowUp = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [full, setFull] = useState([]); // unfiltered list from DB
  const [list, setList] = useState([]); // filtered for render

  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD')); // date filter for viewing worklist
  const [nextDate] = useState(''); // schedule-next helper, optional
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animation values
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

  // ---------- lifecycle ----------
  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // Animation on component mount
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

  // Back goes up (not to drawer)
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  // Apply filter when date changes
  useEffect(() => {
    applyFilter();
  }, [full, filterDate, applyFilter]);

  const applyFilter = useCallback(() => {
    // filter by selected date (same calendar day)
    if (!Array.isArray(full)) {
      console.warn('[FollowUp] full is not an array:', full);
      setList([]);
      return;
    }

    const byDate = full.filter(i => {
      if (!i.follow_up_due) {
        return false;
      }
      const due = dayjs(i.follow_up_due).format('YYYY-MM-DD');
      return !filterDate || due === filterDate;
    });

    setList(byDate);
  }, [full, filterDate]);

  // ---------- data ----------
  const loadWorklist = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[FollowUp] Loading worklist...');
      // Load all candidates from backend
      const response = await API.getBeneficiariesWithData(1000);
      console.log('[FollowUp] API response:', response);

      // Extract data from response
      const all = response?.data || response;
      console.log('[FollowUp] Extracted beneficiaries:', all);

      if (!Array.isArray(all)) {
        console.warn('[FollowUp] API returned non-array:', all);
        setFull([]);
        setList([]);
        return;
      }

      const rows = all.filter(b => b.follow_up_due && !b.follow_up_done);
      console.log('[FollowUp] Filtered follow-ups:', rows.length);

      rows.sort((a, b) =>
        String(a.follow_up_due).localeCompare(String(b.follow_up_due)),
      );
      setFull(rows);

      const initial = rows.filter(
        i =>
          dayjs(i.follow_up_due).format('YYYY-MM-DD') ===
          (filterDate || dayjs().format('YYYY-MM-DD')),
      );
      console.log('[FollowUp] Initial list for date:', initial.length);
      setList(initial);
    } catch (e) {
      console.error('[FollowUp] Load error:', e);
      Alert.alert('Load failed', 'Could not load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, [filterDate]);
  const [isPatient, setIsPatient] = useState(false);
  const markDone = async item => {
    try {
      if (isPatient) {
        Alert.alert('Not allowed', 'Patients cannot modify follow-ups.');
        return;
      }
      // Update follow_up_done via backend
      if (item.phone) {
        const smsMsg = `Your next follow-up is scheduled for ${dayjs(
          nextDate,
        ).format('YYYY-MM-DD')}.`;
        sendSMS(item.phone, smsMsg);
      }
      await API.request(`/api/beneficiaries/${item.id}`, {
        method: 'PATCH',
        body: {follow_up_done: 1, last_followed: dayjs().toISOString()},
      });
      await loadWorklist();
    } catch (e) {
      console.warn(e);
      Alert.alert('Failed', 'Could not mark as done.');
    }
  };

  const scheduleNext = async item => {
    const next =
      nextDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDate)
        ? dayjs(nextDate).endOf('day').toISOString()
        : dayjs().add(30, 'day').endOf('day').toISOString();
    try {
      if (isPatient) {
        Alert.alert('Not allowed', 'Patients cannot schedule follow-ups.');
        return;
      }
      await API.request(`/api/beneficiaries/${item.id}`, {
        method: 'PATCH',
        body: {follow_up_due: next, follow_up_done: 0},
      });
      await loadWorklist();
    } catch (e) {
      console.warn(e);
      Alert.alert('Failed', 'Could not schedule follow-up.');
    }
  };

  // ---------- render ----------
  const openDetail = item => {
    navigation.navigate('BeneficiaryDetail', {
      unique_id: item.unique_id,
      record: item,
      readOnly: isPatient,
    });
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
      <TouchableOpacity
        onPress={() => openDetail(item)}
        activeOpacity={0.8}
        style={styles.cardContent}>
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
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.screen}>
      <Header
        title="Follow-Up Worklist"
        variant="back"
        onBackPress={() => navigation.goBack()}
      />

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.headerIconContainer}>
            <Icon name="calendar-check" size={32} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Follow-Up Management</Text>
          <Text style={styles.welcomeSubtitle}>
            Track and manage patient follow-up appointments
          </Text>
        </View>

        {/* Date filter section */}
        <View style={styles.dateSection}>
          <View style={styles.dateHeader}>
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text style={styles.dateLabel}>Follow-ups for date</Text>
            {full.length > 0 && (
              <Text style={styles.countText}>
                ({full.length} total available)
              </Text>
            )}
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateValue}>{filterDate}</Text>
              <Icon name="calendar-month" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterDate(dayjs().format('YYYY-MM-DD'))}
              style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* DateTimePicker for calendar functionality */}
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

        {/* List */}
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
                  {full.length === 0
                    ? 'No Follow-ups Scheduled'
                    : 'No Follow-ups for This Date'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {full.length === 0
                    ? 'All follow-up appointments are up to date. New appointments will appear here when scheduled.'
                    : 'No follow-up appointments are scheduled for the selected date. Try selecting a different date.'}
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
                      <Text style={styles.emptyActionText}>View Tomorrow</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            }
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},

  container: {
    flex: 1,
    padding: spacing.md,
  },

  // Welcome Header
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
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

  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    ...shadows.md,
  },

  // Date section
  dateSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
    paddingHorizontal: spacing.md,
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
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '10',
  },
  todayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
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

  // List cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardContent: {
    padding: spacing.lg,
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
    paddingHorizontal: spacing.md,
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
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  btnOutlineText: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    fontSize: 14,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.md,
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
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  emptyActionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
  },
});

export default FollowUp;
