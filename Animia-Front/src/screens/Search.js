// src/screens/Search.js
import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  BackHandler,
  Dimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import Header from '../components/Header';
import dayjs from 'dayjs';
import Input from '../components/Input';
import NetworkStatus from '../components/NetworkStatus';
import {getRole} from '../utils/role';
import {API} from '../utils/api';
import {useDispatch, useSelector} from 'react-redux';
import {
  fetchBeneficiaries,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
} from '../store/beneficiarySlice';
import {debugCacheStatus} from '../utils/asyncCache';
const Search = ({navigation, hideHeader = false}) => {
  const dispatch = useDispatch();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);
  const [isPatient, setIsPatient] = useState(false);

  // Get beneficiaries from Redux store (with offline caching)
  const beneficiaries = useSelector(selectBeneficiaries);
  const beneficiaryLoading = useSelector(selectBeneficiaryLoading);
  const beneficiaryError = useSelector(selectBeneficiaryError);

  useEffect(() => {
    (async () => {
      const r = await getRole();
      setIsPatient(String(r || '').toLowerCase() === 'patient');
    })();

    // Load beneficiaries from Redux store (with offline caching)
    dispatch(fetchBeneficiaries());
  }, [dispatch]);

  // Updated doSearch to use Redux store (with offline caching)
  const doSearch = useCallback(async text => {
    const raw = (text || '').trim();
    if (!raw) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Debug cache status
      await debugCacheStatus();

      // Fetch beneficiaries from Redux store (with offline caching)
      await dispatch(fetchBeneficiaries());

      // Use beneficiaries from Redux store
      const all = beneficiaries;
      if (all[0]) {
        setResults([
          {
            latest_hemoglobin: all[0].latest_hemoglobin,
            latest_anemia_category: all[0].latest_anemia_category,
            intervention_id: all[0].intervention_id,
          },
        ]);
      }

      if (!Array.isArray(all) || all.length === 0) {
        console.warn('[Search] No beneficiaries data available');
        setResults([]);
        return;
      }

      const digitsOnly = raw.replace(/\s+/g, '');
      const isDigits = /^\d+$/.test(digitsOnly);
      let filtered = [];
      if (isDigits) {
        filtered = all.filter(
          b =>
            (b.short_id && b.short_id.includes(digitsOnly)) ||
            (b.id_number && b.id_number.includes(digitsOnly)) ||
            (b.phone && b.phone.includes(digitsOnly)),
        );
      } else {
        filtered = all.filter(
          b =>
            (b.name && b.name.toLowerCase().includes(raw.toLowerCase())) ||
            (b.short_id &&
              b.short_id.toLowerCase().includes(raw.toLowerCase())),
        );
      }
      setResults(filtered);
    } catch (e) {
      console.warn('[Search] search err', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, doSearch]);

  // hardware back -> go to Dashboard (prevents crash you saw)
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        navigation.navigate('Dashboard');
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
    }, [navigation]),
  );

  // Maintain search results when returning from detail screen
  // Only re-run search if we're not embedded (hideHeader = false)
  useFocusEffect(
    useCallback(() => {
      // Re-run search if we have a query but no results and we're not embedded
      if (!hideHeader && q.length > 0 && results.length === 0 && !loading) {
        doSearch(q);
      }
    }, [hideHeader, q, results.length, loading, doSearch]),
  );

  const onPressSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(q);
  };

  const renderItem = ({item}) => {
    const displayId =
      item.short_id ||
      item.id_number ||
      (item.unique_id ? item.unique_id.slice(0, 12) : '');

    // Determine status badge
    const hasScreening = item.latest_hemoglobin;
    const hasIntervention = item.intervention_id;
    let statusBadge = null;

    if (hasIntervention) {
      statusBadge = {
        text: 'Completed',
        color: colors.success || '#4CAF50',
        icon: 'check-circle',
      };
    } else if (hasScreening) {
      statusBadge = {
        text: 'Screened',
        color: colors.warning || '#FF9800',
        icon: 'clock',
      };
    } else {
      statusBadge = {
        text: 'Registered',
        color: colors.primary,
        icon: 'account',
      };
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('BeneficiaryDetail', {
            unique_id: item.unique_id,
            record: item,
            readOnly: isPatient,
          })
        }
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Icon name="account" size={28} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name || '-'}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: statusBadge.color + '20'},
                ]}>
                <Icon
                  name={statusBadge.icon}
                  size={12}
                  color={statusBadge.color}
                />
                <Text style={[styles.statusText, {color: statusBadge.color}]}>
                  {statusBadge.text}
                </Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <Icon
                name="card-account-details"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.sub}>{displayId}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Icon name="phone" size={16} color={colors.textSecondary} />
              <Text style={styles.sub}>{item.phone || '-'}</Text>
            </View>
            {!!item.address && (
              <View style={styles.detailsRow}>
                <Icon
                  name="map-marker"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.sub} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}
            <View style={styles.detailsRow}>
              <Icon name="calendar" size={16} color={colors.textSecondary} />
              <Text style={styles.small}>
                Registered:{' '}
                {item.registration_date
                  ? dayjs(item.registration_date).format('DD MMM YYYY')
                  : '-'}
              </Text>
            </View>

            {/* Display screening data if available */}
            {item.latest_hemoglobin && (
              <View style={styles.screeningInfo}>
                <View style={styles.detailsRow}>
                  <Icon name="heart-pulse" size={16} color={colors.primary} />
                  <Text style={styles.screeningText}>
                    Hb: {item.latest_hemoglobin} g/dL | Anemia:{' '}
                    {item.latest_anemia_category || 'N/A'}
                  </Text>
                </View>
              </View>
            )}

            {/* Display intervention data if available */}
            {item.intervention_id && (
              <View style={styles.interventionInfo}>
                <View style={styles.detailsRow}>
                  <Icon
                    name="medical-bag"
                    size={16}
                    color={colors.secondary || '#4CAF50'}
                  />
                  <Text style={styles.interventionText}>
                    IFA: {item.intervention_ifa_yes ? 'Yes' : 'No'} | Calcium:{' '}
                    {item.intervention_calcium_yes ? 'Yes' : 'No'} | Deworm:{' '}
                    {item.intervention_deworm_yes ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.chevronContainer}>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <NetworkStatus />
      {!hideHeader && <Header title="Search Beneficiary" variant="back" />}

      {/* Enhanced Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <Icon
              name="magnify"
              size={22}
              color={colors.primary}
              style={styles.inputIcon}
            />
            <Input
              value={q}
              onChangeText={setQ}
              placeholder="Type Aadhaar digits or name..."
              keyboardType={Platform.OS === 'android' ? 'default' : 'default'}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={onPressSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={onPressSearch}
            activeOpacity={0.8}>
            <Icon name="magnify" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Tips */}
        {q.length === 0 && (
          <View style={styles.searchTips}>
            <Text style={styles.searchTipsTitle}>Search Tips:</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="numeric" size={16} color={colors.primary} />
                <Text style={styles.tipText}>
                  Enter Aadhaar number or Short ID
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="account" size={16} color={colors.primary} />
                <Text style={styles.tipText}>Search by beneficiary name</Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="phone" size={16} color={colors.primary} />
                <Text style={styles.tipText}>Use phone number to find</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Results Section */}
      <View style={styles.resultsSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching beneficiaries...</Text>
          </View>
        ) : (
          <>
            {results.length === 0 && q.length > 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon
                    name="account-search"
                    size={64}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No Results Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try searching with different keywords or check spelling
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setQ('')}
                  activeOpacity={0.7}>
                  <Text style={styles.retryButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <View style={styles.resultsHeaderContent}>
                    <Icon
                      name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.resultsCount}>
                      {results.length} result{results.length !== 1 ? 's' : ''}{' '}
                      found
                    </Text>
                  </View>
                </View>

                <FlatList
                  data={results}
                  keyExtractor={it =>
                    String(it.id || it.unique_id || Math.random())
                  }
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContainer}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Search Section
  searchSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    minWidth: 56,
  },

  // Search Tips
  searchTips: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchTipsTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },

  // Results Section
  resultsSection: {
    flex: 1,
    paddingHorizontal: spacing.horizontal,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
    fontWeight: typography.weights.medium,
  },

  // Empty States
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },

  // Results
  resultsHeader: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsCount: {
    ...typography.body,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  listContainer: {
    paddingBottom: spacing.xl,
  },

  // Card Styles
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
  },
  chevronContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  small: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },

  // Screening and Intervention Info Styles
  screeningInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.primary + '05',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  screeningText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  interventionInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: (colors.secondary || '#4CAF50') + '05',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  interventionText: {
    ...typography.caption,
    color: colors.secondary || '#4CAF50',
    marginLeft: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
});

export default Search;
