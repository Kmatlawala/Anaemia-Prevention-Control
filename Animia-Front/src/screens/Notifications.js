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
      let dataObj = {};
      try {
        dataObj = item.data ? JSON.parse(item.data) : {};
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

      if (benId) {
        try {
          let beneficiaryData;
          if (storedBeneficiary) {
            beneficiaryData = storedBeneficiary;
          } else {
            beneficiaryData = await API.getBeneficiary(benId);
          }

          if (!beneficiaryData) {
            Alert.alert('Error', 'Beneficiary data not found');
            return;
          }

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
        try {
          let beneficiaryData;
          try {
            beneficiaryData = await API.getBeneficiaryByUniqueId(shortId);
          } catch (uniqueError) {
            const allBeneficiaries = await API.getBeneficiaries();
            beneficiaryData = allBeneficiaries.find(
              b => b.short_id === shortId,
            );
            if (!beneficiaryData) {
              throw new Error(`Beneficiary with ID ${shortId} not found`);
            }
          }

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
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
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
