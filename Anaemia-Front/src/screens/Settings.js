
import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography, platform} from '../theme/theme';
import {exportJsonToXlsx} from '../utils/export';
import {API} from '../utils/api';
import {getRole, clearRole} from '../utils/role';
import {logout} from '../store/authSlice';
import Header from '../components/Header';
import Input from '../components/Input';

const Settings = ({navigation}) => {
  const dispatch = useDispatch();
  const {role, user} = useSelector(state => state.auth);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  const handleExportSmall = async () => {
    setExporting(true);
    try {
      const rows = await API.getBeneficiaries(200);
      await exportJsonToXlsx(rows, 'Animia_Sample');
      Alert.alert('Exported', 'Saved to device');
    } catch (e) {
      Alert.alert('Failed', 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            
            await clearRole();
            
            dispatch(logout());

          } catch (error) {
            
            dispatch(logout());
            
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (role === 'Admin') {
      
      setShowPasswordModal(true);
    } else {
      
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone. Your data will be anonymized.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: confirmDeletePatientAccount,
          },
        ],
      );
    }
  };

  const confirmDeleteAdminAccount = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setDeleting(true);
    try {
      const response = await API.deleteAdminAccount({password});
      
      if (response.success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been deleted successfully.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await clearRole();
                dispatch(logout());
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to delete account');
        setPassword('');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error?.data?.message || error?.message || 'Failed to delete account. Please try again.',
      );
      setPassword('');
    } finally {
      setDeleting(false);
      setShowPasswordModal(false);
    }
  };

  const confirmDeletePatientAccount = async () => {
    setDeleting(true);
    try {
      const response = await API.deletePatientAccount();
      
      if (response.success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been deleted successfully. Your data has been anonymized.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await clearRole();
                dispatch(logout());
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to delete account');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error?.data?.message || error?.message || 'Failed to delete account. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Settings"
        onBackPress={() => navigation.goBack()}
        onBellPress={() => {}}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <TouchableOpacity 
            style={[styles.card, styles.exportCard]} 
            onPress={handleExportSmall}
            activeOpacity={0.7}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.exportIconContainer]}>
                <Icon name="file-export" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardText}>Export Sample</Text>
                <Text style={styles.cardSubtext}>Export 200 records to Excel</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.reportsCard]}
            onPress={() => navigation.navigate('Reports')}
            activeOpacity={0.7}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.reportsIconContainer]}>
                <Icon name="chart-line" size={24} color={colors.accent} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardText}>View Reports</Text>
                <Text style={styles.cardSubtext}>Analytics and insights</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {role === 'Admin' && (
            <TouchableOpacity
              style={[styles.card, styles.adminCard]}
              onPress={() => navigation.navigate('AdminManagement')}
              activeOpacity={0.7}>
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.adminIconContainer]}>
                  <Icon name="account-group" size={24} color={colors.secondary} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardText}>Manage Admins</Text>
                  <Text style={styles.cardSubtext}>View and manage admin accounts</Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.card, styles.signOutCard]} 
            onPress={handleSignOut}
            activeOpacity={0.7}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.signOutIconContainer]}>
                <Icon name="logout" size={24} color={colors.warning} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardText}>Sign Out</Text>
                <Text style={styles.cardSubtext}>Log out from your account</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.deleteCard]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.7}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.deleteIconContainer]}>
                <Icon name="delete-outline" size={24} color={colors.error} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.deleteText}>Delete Account</Text>
                <Text style={styles.deleteSubtext}>Permanently delete your account</Text>
              </View>
              {deleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Icon name="chevron-right" size={24} color={colors.error} />
              )}
            </View>
          </TouchableOpacity>

          {exporting && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Exporting...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              Enter your password to confirm account deletion. This action cannot be undone.
            </Text>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeleteAdminAccount}
                disabled={deleting || !password.trim()}>
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  cardContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.borderLight,
    borderRightColor: colors.borderLight,
    borderBottomColor: colors.borderLight,
  },
  exportCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  reportsCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  adminCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  signOutCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  deleteCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportIconContainer: {
    backgroundColor: colors.infoLight,
  },
  reportsIconContainer: {
    backgroundColor: colors.successLight,
  },
  adminIconContainer: {
    backgroundColor: colors.warningLight,
  },
  signOutIconContainer: {
    backgroundColor: '#FEF3C7',
  },
  deleteIconContainer: {
    backgroundColor: colors.errorLight,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  cardSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  deleteText: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs / 2,
  },
  deleteSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: typography.weights.bold,
  },
});
