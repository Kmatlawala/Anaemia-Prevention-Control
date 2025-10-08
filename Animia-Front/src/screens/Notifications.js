import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import {API} from '../utils/api';
import {useNavigation} from '@react-navigation/native';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const load = async () => {
    setLoading(true);
    try {
      // We used FCM token as device_id during registration
      // Retrieve last known token from backend is not stored locally, so list without filter for now
      const list = await API.listNotifications();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onOpen = useCallback(
    async item => {
      console.log('[Notifications] Opening notification:', item);

      // Parse notification data
      let dataObj = {};
      try {
        dataObj = item.data ? JSON.parse(item.data) : {};
        console.log('[Notifications] Parsed notification data:', dataObj);
      } catch (parseError) {
        console.error(
          '[Notifications] Failed to parse notification data:',
          parseError,
        );
        Alert.alert('Error', 'Invalid notification data');
        return;
      }

      const benId = dataObj?.id ? Number(dataObj.id) : null;
      const storedBeneficiary = dataObj?.beneficiary;
      const shortId = dataObj?.shortId;

      console.log('[Notifications] Notification details:', {
        benId,
        shortId,
        hasStoredBeneficiary: !!storedBeneficiary,
        notificationType: dataObj?.type,
      });

      if (benId) {
        try {
          // Use stored beneficiary data if available, otherwise fetch fresh data
          let beneficiaryData;
          if (storedBeneficiary) {
            // Use the data that was stored at the time of notification
            beneficiaryData = storedBeneficiary;
            console.log(
              '[Notifications] Using stored beneficiary data for notification:',
              benId,
              beneficiaryData,
            );
          } else {
            // Fallback to fetching fresh data for older notifications
            console.log(
              '[Notifications] Fetching fresh beneficiary data for ID:',
              benId,
            );
            beneficiaryData = await API.getBeneficiary(benId);
            console.log(
              '[Notifications] Fetched fresh beneficiary data for notification:',
              benId,
              beneficiaryData,
            );
          }

          if (!beneficiaryData) {
            Alert.alert('Error', 'Beneficiary data not found');
            return;
          }

          console.log('[Notifications] Navigating to BeneficiaryDetail with:', {
            record: beneficiaryData,
            unique_id: beneficiaryData.unique_id || beneficiaryData.short_id,
            readOnly: false,
          });

          navigation.navigate('BeneficiaryDetail', {
            record: beneficiaryData,
            unique_id: beneficiaryData.unique_id || beneficiaryData.short_id,
            readOnly: false,
          });
          return;
        } catch (error) {
          console.error('[Notifications] Error opening beneficiary:', error);
          Alert.alert(
            'Error',
            `Failed to open beneficiary details: ${error.message}`,
          );
        }
      } else if (shortId) {
        // Try to fetch by short_id if no benId
        try {
          console.log(
            '[Notifications] Fetching beneficiary by short_id:',
            shortId,
          );

          // Try the unique route first, fallback to search if it fails
          let beneficiaryData;
          try {
            beneficiaryData = await API.getBeneficiaryByUniqueId(shortId);
          } catch (uniqueError) {
            console.log(
              '[Notifications] Unique route failed, trying search...',
            );
            // Fallback: search through all beneficiaries to find by short_id
            const allBeneficiaries = await API.getBeneficiaries();
            beneficiaryData = allBeneficiaries.find(
              b => b.short_id === shortId,
            );
            if (!beneficiaryData) {
              throw new Error(`Beneficiary with ID ${shortId} not found`);
            }
          }

          console.log(
            '[Notifications] Fetched beneficiary by short_id:',
            beneficiaryData,
          );

          navigation.navigate('BeneficiaryDetail', {
            record: beneficiaryData,
            unique_id: shortId,
            readOnly: false,
          });
          return;
        } catch (error) {
          console.error('[Notifications] Error fetching by short_id:', error);
          Alert.alert(
            'Error',
            `Failed to find beneficiary with ID: ${shortId}`,
          );
        }
      } else {
        // Show notification details in alert as fallback
        Alert.alert(
          'Notification Details',
          `Title: ${item.title || 'No title'}\nBody: ${
            item.body || 'No body'
          }\nType: ${dataObj?.type || 'Unknown'}\nData: ${JSON.stringify(
            dataObj,
            null,
            2,
          )}`,
          [{text: 'OK'}],
        );
      }
    },
    [navigation],
  );

  const renderItem = ({item}) => {
    let dataObj = {};
    try {
      dataObj = item.data ? JSON.parse(item.data) : {};
    } catch (_) {}

    const getNotificationIcon = () => {
      if (dataObj?.type === 'registration') return 'account-plus';
      if (dataObj?.type === 'beneficiary_updated') return 'account-edit';
      if (dataObj?.id) return 'account-edit';
      if (item.title?.toLowerCase().includes('follow')) return 'calendar-clock';
      if (item.title?.toLowerCase().includes('screening')) return 'stethoscope';
      if (item.title?.toLowerCase().includes('intervention')) return 'pill';
      return 'bell';
    };

    const getNotificationColor = () => {
      if (dataObj?.type === 'registration') return colors.success;
      if (dataObj?.type === 'beneficiary_updated') return colors.primary;
      if (dataObj?.id) return colors.primary;
      if (item.title?.toLowerCase().includes('follow')) return colors.warning;
      if (item.title?.toLowerCase().includes('screening'))
        return colors.success;
      if (item.title?.toLowerCase().includes('intervention'))
        return colors.error;
      return colors.textSecondary;
    };

    const getNotificationSubtitle = () => {
      if (dataObj?.beneficiary?.name) {
        return `Beneficiary: ${dataObj.beneficiary.name}`;
      }
      if (dataObj?.type === 'registration') {
        return 'New beneficiary registered';
      }
      if (dataObj?.type === 'beneficiary_updated') {
        return 'Beneficiary information updated';
      }
      return '';
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onOpen(item)}
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              {backgroundColor: getNotificationColor() + '20'},
            ]}>
            <Icon
              name={getNotificationIcon()}
              size={20}
              color={getNotificationColor()}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.title}>{item.title || 'Notification'}</Text>
            <Text style={styles.body}>{item.body || ''}</Text>
            {getNotificationSubtitle() && (
              <Text style={styles.subtitle}>{getNotificationSubtitle()}</Text>
            )}
          </View>
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </View>
        {item.sent_at && (
          <View style={styles.metaContainer}>
            <Icon name="clock-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.meta}>
              {String(item.sent_at).replace('T', ' ').slice(0, 19)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header variant="back" title="Notifications" />

      {items.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="bell-off" size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            You'll see important updates and reminders here
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => String(it.id || idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: spacing.md,
  },

  // Card Styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  subtitle: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },

  // Meta Styles
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  meta: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
