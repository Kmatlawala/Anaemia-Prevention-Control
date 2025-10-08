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
import {getRole} from '../utils/role';
import {API} from '../utils/api';
const Search = ({navigation}) => {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);
  const [isPatient, setIsPatient] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await getRole();
      setIsPatient(String(r || '').toLowerCase() === 'patient');
    })();
  }, []);

  // Updated doSearch to use backend API
  const doSearch = useCallback(async text => {
    const raw = (text || '').trim();
    if (!raw) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await API.getBeneficiaries(1000);
      console.log('[Search] API response:', response);

      const all = response?.data || response;
      console.log('[Search] Extracted beneficiaries:', all);

      if (!Array.isArray(all)) {
        console.warn('[Search] API returned non-array:', all);
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
  useFocusEffect(
    useCallback(() => {
      // Re-run search if we have a query but no results
      if (q.length > 0 && results.length === 0 && !loading) {
        doSearch(q);
      }
    }, [q, results.length, loading, doSearch]),
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
            <Icon name="account" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.name}>{item.name || '-'}</Text>
            <View style={styles.detailsRow}>
              <Icon
                name="card-account-details"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.sub}>{displayId}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Icon name="phone" size={14} color={colors.textSecondary} />
              <Text style={styles.sub}>{item.phone || '-'}</Text>
            </View>
            {!!item.address && (
              <View style={styles.detailsRow}>
                <Icon
                  name="map-marker"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.sub}>{item.address}</Text>
              </View>
            )}
            <View style={styles.detailsRow}>
              <Icon name="calendar" size={14} color={colors.textSecondary} />
              <Text style={styles.small}>
                Registered:{' '}
                {item.registration_date
                  ? dayjs(item.registration_date).format('YYYY-MM-DD')
                  : '-'}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Search Beneficiary" variant="back" />

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchIconContainer}>
          <Icon name="magnify" size={24} color={colors.primary} />
        </View>
        <Text style={styles.searchTitle}>Find Beneficiaries</Text>
        <Text style={styles.searchSubtitle}>
          Search by Aadhaar, Phone, or Name
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <Icon
              name="magnify"
              size={20}
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
            <Icon name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <>
            {results.length === 0 && q.length > 0 ? (
              <View style={styles.emptyContainer}>
                <Icon
                  name="account-search"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No Results Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try searching with different keywords
                </Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="magnify" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Start Searching</Text>
                <Text style={styles.emptySubtitle}>
                  Enter a name, ID, or phone number to find beneficiaries
                </Text>
              </View>
            ) : (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </Text>
              </View>
            )}

            {results.length > 0 && (
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

  // Search Header
  searchHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  searchIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  searchTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  searchSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Card Container
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.md,
    ...shadows.md,
  },

  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    ...typography.body,
  },

  // Empty States
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Results
  resultsHeader: {
    marginBottom: spacing.md,
  },
  resultsCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  listContainer: {
    paddingBottom: spacing.xl,
  },

  // Card Styles
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    ...typography.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  small: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});

export default Search;
