
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {API} from '../utils/api';
import dayjs from 'dayjs';

const AdminManagement = ({navigation}) => {
  const {user} = useSelector(state => state.auth);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await API.listAdmins();
      if (response && response.success) {
        const adminList = response.admins || [];
        setAdmins(adminList);
      } else {
        const errorMsg = response?.message || 'Failed to load admins';
        setError(errorMsg);
        setAdmins([]); 
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      const errorMsg = error?.data?.message || error?.message || 'Failed to load admin list. Please check your connection.';
      setError(errorMsg);
      setAdmins([]); 
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (admin) => {
    
    if (admin.id === user?.id) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete your own account from here. Please use "Delete Account" in Settings.',
      );
      return;
    }

    Alert.alert(
      'Delete Admin Account',
      `Are you sure you want to delete the admin account for "${admin.name || admin.email}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(admin),
        },
      ],
    );
  };

  const confirmDelete = async (admin) => {
    setDeletingId(admin.id);
    try {
      const response = await API.deleteAdmin(admin.id);
      
      if (response.success) {
        Alert.alert('Success', response.message || 'Admin account deleted successfully');
        
        loadAdmins();
      } else {
        Alert.alert('Error', response.message || 'Failed to delete admin account');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error?.data?.message || error?.message || 'Failed to delete admin account',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const renderAdminItem = ({item}) => {
    const isCurrentUser = item.id === user?.id;
    const isDeleting = deletingId === item.id;

    return (
      <View style={[styles.adminCard, isCurrentUser && styles.currentUserCard]}>
        <View style={styles.adminInfo}>
          <View style={styles.adminHeader}>
            <Text style={styles.adminName}>
              {item.name || 'No Name'} {isCurrentUser && '(You)'}
            </Text>
            {item.isActive ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>Active</Text>
              </View>
            ) : (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={styles.adminEmail}>{item.email}</Text>
          {item.lastLogin && (
            <Text style={styles.adminMeta}>
              Last login: {dayjs(item.lastLogin).format('DD MMM YYYY, hh:mm A')}
            </Text>
          )}
          <Text style={styles.adminMeta}>
            Created: {dayjs(item.createdAt).format('DD MMM YYYY')}
          </Text>
        </View>
        {!isCurrentUser && (
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="delete-outline" size={18} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Admin Management"
        onBackPress={() => navigation.goBack()}
      />
      {loading && admins.length === 0 && !error ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading admins...</Text>
        </View>
      ) : error && admins.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              loadAdmins();
            }}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Total Admins: {admins.length}
            </Text>
            <TouchableOpacity onPress={loadAdmins} style={styles.refreshButton}>
              <Icon name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={admins}
            renderItem={renderAdminItem}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  setError(null);
                  loadAdmins();
                }}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="account-off" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No admins found</Text>
                <Text style={[styles.emptyText, {marginTop: spacing.sm, fontSize: typography.sizes.sm}]}>
                  Pull down to refresh
                </Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

export default AdminManagement;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  headerText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  adminCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  currentUserCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#f0f7ff',
  },
  adminInfo: {
    flex: 1,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  adminName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  activeText: {
    color: '#fff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  inactiveBadge: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  inactiveText: {
    color: '#fff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  adminEmail: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  adminMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});

