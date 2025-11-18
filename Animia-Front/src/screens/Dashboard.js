
import React, {useCallback, useRef, useState, useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  platform,
} from '../theme/theme';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const isSmallScreen = screenWidth < 360;
const isMediumScreen = screenWidth >= 360 && screenWidth < 414;
import Tile from '../components/Tile';
import Header from '../components/Header';
import Carousel from '../components/Carousel';
import {exportJsonToXlsx} from '../utils/export';
import {API} from '../utils/api';
import {getRole, clearRole} from '../utils/role';
import {logout} from '../store/authSlice';
import {useSelector} from 'react-redux';
import SendSMS from '../components/SendSMS';
import Search from './Search';
import Input from '../components/Input';

const TILE_DATA = [
  {
    key: 'register',
    icon: 'account-plus',
    label: 'Registration',
    screen: 'Registration',
    variant: 'primary',
    gradient: true,
    color: colors.primary,
  },
  {
    key: 'search',
    icon: 'account-search',
    label: 'Searching',
    screen: 'Search',
    variant: 'info',
    gradient: true,
    color: colors.info,
  },
  {
    key: 'followup',
    icon: 'calendar-check',
    label: 'Follow-Up',
    screen: 'FollowUp',
    variant: 'success',
    gradient: true,
    color: colors.success,
  },
  {
    key: 'reports',
    icon: 'chart-line',
    label: 'Reports',
    screen: 'Reports',
    variant: 'warning',
    gradient: true,
    color: colors.warning,
  },
];

const Dashboard = ({navigation}) => {
  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const isAuthenticated = authState?.isAuthenticated || false;
  const reduxRole = authState?.role || null;
  const selectedBeneficiary = authState?.selectedBeneficiary || null;
  const user = authState?.user || null;

  const [menuVisible, setMenuVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [role, setRoleState] = useState(undefined);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const menuSlideAnim = useRef(new Animated.Value(-screenWidth)).current;

  const animValues = useRef(TILE_DATA.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (menuVisible) {
      Animated.timing(menuSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuSlideAnim, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible, menuSlideAnim]);
  const entryAnimation = useCallback(() => {
    const seq = animValues.map((v, i) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 320,
        delay: i * 80,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(60, seq).start();
  }, [animValues]);

  useEffect(() => {
    entryAnimation();
  }, [entryAnimation]);

  useEffect(() => {
    if (reduxRole === 'Patient' && selectedBeneficiary) {
      navigation.replace('BeneficiaryDetail', {
        record: selectedBeneficiary,
        readOnly: true,
        fromPatientList: true,
      });
    }
  }, [reduxRole, selectedBeneficiary, navigation]);

  useEffect(() => {
    
    if (!isAuthenticated && !reduxRole) {
      return;
    }

    if (!isAuthenticated) {
      
      return;
    }

    if (reduxRole) {
      setRoleState(reduxRole);
    } else {
      setRoleState('admin'); 
    }
  }, [isAuthenticated, reduxRole]);

  const onTilePress = useCallback(
    screen => {
      navigation.navigate(screen);
    },
    [navigation],
  );

  const exportAll = useCallback(async () => {
    setMenuVisible(false);
    setExporting(true);
    try {
      
      const response = await API.getBeneficiariesWithData(1000);

      const data = response?.data || response;

      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('No Data', 'No beneficiary data available to export');
        return;
      }

      const exportData = [];

      const safeString = value => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number')
          return isNaN(value) ? '' : value.toString();
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value))
          return value.length > 0 ? value.join(', ') : '';
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch (e) {
            return '[Object]';
          }
        }
        try {
          return String(value);
        } catch (e) {
          return '';
        }
      };

      data.forEach((beneficiary, index) => {
        
        const exportRow = {};

        exportRow['Name'] = safeString(beneficiary.name);
        exportRow['Age'] = safeString(beneficiary.age);
        exportRow['Gender'] = safeString(beneficiary.gender);
        exportRow['Phone'] = safeString(beneficiary.phone);
        exportRow['Alternative Phone'] = safeString(beneficiary.alt_phone);
        exportRow['Category'] = safeString(beneficiary.category);
        exportRow['Registration Date'] = safeString(
          beneficiary.registration_date,
        );
        exportRow['Follow-up Due'] = safeString(beneficiary.follow_up_due);
        exportRow['Location'] = safeString(beneficiary.location);
        exportRow['Address'] = safeString(beneficiary.address);
        exportRow['Short ID'] = safeString(beneficiary.short_id);
        exportRow['ID Number'] = safeString(beneficiary.id_number);
        exportRow['Aadhaar Hash'] = safeString(beneficiary.aadhaar_hash);
        exportRow['Date of Birth'] = safeString(beneficiary.dob);
        exportRow['Created At'] = safeString(beneficiary.created_at);
        exportRow['Updated At'] = safeString(beneficiary.updated_at);

        exportRow['Doctor Name'] = safeString(beneficiary.doctor_name);
        exportRow['Doctor Phone'] = safeString(beneficiary.doctor_phone);

        exportRow['Latest Hb Level'] = safeString(
          beneficiary.latest_hemoglobin || beneficiary.hb,
        );
        exportRow['Latest Anemia Category'] = safeString(
          beneficiary.latest_anemia_category || beneficiary.anemia_category,
        );
        exportRow['Screening ID'] = safeString(beneficiary.screening_id);
        exportRow['Screening Notes'] = safeString(beneficiary.screening_notes);
        exportRow['Last Screening Date'] = safeString(
          beneficiary.last_screening_date,
        );

        exportRow['Intervention ID'] = safeString(beneficiary.intervention_id);
        exportRow['IFA Given'] = safeString(beneficiary.intervention_ifa_yes);
        exportRow['Calcium Given'] = safeString(
          beneficiary.intervention_calcium_yes,
        );
        exportRow['Deworming Given'] = safeString(
          beneficiary.intervention_deworm_yes,
        );
        exportRow['Therapeutic Given'] = safeString(
          beneficiary.intervention_therapeutic_yes,
        );
        exportRow['Referral Given'] = safeString(
          beneficiary.intervention_referral_yes,
        );
        exportRow['Last Intervention Date'] = safeString(
          beneficiary.last_intervention_date,
        );

        exportRow['Front Document'] = safeString(beneficiary.front_document);
        exportRow['Back Document'] = safeString(beneficiary.back_document);
        exportRow['Calcium Quantity'] = safeString(beneficiary.calcium_qty);
        exportData.push(exportRow);
      });

      const summaryRows = [
        {
          Name: '=== EXPORT SUMMARY ===',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: '',
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Date of Birth': '',
          'Created At': '',
          'Updated At': '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Latest Hb Level': '',
          'Latest Anemia Category': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
        {
          Name: 'Total Beneficiaries Exported',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: exportData.length.toString(),
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Date of Birth': '',
          'Created At': '',
          'Updated At': '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Latest Hb Level': '',
          'Latest Anemia Category': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
        {
          Name: 'Export Date',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: new Date().toLocaleString(),
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Date of Birth': '',
          'Created At': '',
          'Updated At': '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Latest Hb Level': '',
          'Latest Anemia Category': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
      ];

      const finalExportData = [...summaryRows, ...exportData];
      await exportJsonToXlsx(finalExportData, 'Animia_Complete_Data');

      Alert.alert(
        'Export Successful',
        `Successfully exported ${exportData.length} beneficiaries with screening and intervention data. The file has been saved to your device.`,
      );
    } catch (e) {
      Alert.alert('Export Failed', `Error exporting data: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }, []);

  const renderItem = useCallback(
    ({item, index}) => {
      const a = animValues[index];
      const scale = a.interpolate({inputRange: [0, 1], outputRange: [0.9, 1]});
      const opacity = a;
      return (
        <Animated.View
          style={{transform: [{scale}], opacity, marginBottom: spacing.sm}}>
          <Tile
            icon={item.icon}
            label={item.label}
            onPress={() => onTilePress(item.screen)}
            variant={item.variant}
            gradient={item.gradient}
            accessibilityLabel={`${item.label}`}
          />
        </Animated.View>
      );
    },
    [animValues, onTilePress],
  );

  const keyExtractor = useCallback(item => item.key, []);

  const renderDashboardHeader = () => (
    <View style={styles.dashboardHeader}>
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeSubtitle}>
          Anaemia Shield
        </Text>
      </View>
    </View>
  );

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            
            await clearRole();
            
            dispatch(logout());
            
            setRoleState(null);
            setMenuVisible(false);

          } catch (error) {
            
            dispatch(logout());
            setRoleState(null);
            setMenuVisible(false);
            
          }
        },
      },
    ]);
  }, [dispatch, navigation]);

  const confirmDeletePatientAccount = useCallback(async () => {
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
  }, [dispatch]);

  const handleDeleteAccount = useCallback(() => {
    if (reduxRole === 'Admin') {
      setShowPasswordModal(true);
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone. Your data will be anonymized.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Delete', style: 'destructive', onPress: confirmDeletePatientAccount},
        ],
      );
    }
  }, [reduxRole, confirmDeletePatientAccount]);

  const confirmDeleteAdminAccount = useCallback(async () => {
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
  }, [password, dispatch]);

  if (role === undefined || !authState) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading...</Text>
      </View>
    );
  }

  const isPatient = String(role || '').toLowerCase() === 'patient';
  const visibleTiles = isPatient
    ? TILE_DATA.filter(t => ['search', 'information'].includes(t.key))
    : TILE_DATA;
  return (
    <View style={styles.root}>
      <Header
        title="Anaemia Shield"
        onMenuPress={() => setMenuVisible(true)}
        rightIcon2Name="information-outline"
        onRightIcon2Press={() => navigation.navigate('Information')}
        rightIconName="bell-outline"
        onBellPress={() => navigation.navigate('Notifications')}
        role={role}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        {isPatient ? (
          
          <Search navigation={navigation} hideHeader={true} />
        ) : (
          
          <>
            <View style={styles.quickActionsHeader}>
              <View style={styles.quickActionsTitleContainer}>
                <Icon name="lightning-bolt" size={24} color={colors.text} />
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Access all features quickly
              </Text>
            </View>

            <View style={styles.quickActionsGrid}>
              {visibleTiles.map((item, index) => (
                <View key={item.key} style={styles.quickActionBox}>
                  <TouchableOpacity
                    style={[
                      styles.quickActionButton,
                      {
                        backgroundColor: item.color + '08',
                        borderColor: item.color + '15',
                      },
                    ]}
                    onPress={() => onTilePress(item.screen)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.quickActionIconContainer,
                        {backgroundColor: item.color + '10'},
                      ]}>
                      <Icon name={item.icon} size={28} color={item.color} />
                    </View>
                    <Text
                      style={[styles.quickActionLabel, {color: item.color}]}>
                      {item.label}
                    </Text>
                    <View
                      style={[
                        styles.arrowContainer,
                        {backgroundColor: item.color + '20'},
                      ]}>
                      <Icon name="arrow-right" size={16} color={item.color} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {menuVisible && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            onPress={() => setMenuVisible(false)}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.drawerMenu,
              {
                transform: [{translateX: menuSlideAnim}],
              },
            ]}>
            {}
            <View style={styles.menuHeader}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Icon name="account" size={24} color={colors.white} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {user?.name
                      ? `Welcome back, ${user.name}!`
                      : 'Welcome Back!'}
                  </Text>
                  {}
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMenuVisible(false)}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {}
            <ScrollView 
              style={styles.menuItemsContainer}
              contentContainerStyle={styles.menuItems}
              showsVerticalScrollIndicator={false}>
              {!isPatient && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('Reports');
                    }}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.menuIconContainer,
                        {backgroundColor: colors.surface},
                      ]}>
                      <Icon name="chart-box" size={20} color={colors.text} />
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Reports</Text>
                      <Text style={styles.menuItemSubtext}>
                        View analytics & data
                      </Text>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={exportAll}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.menuIconContainer,
                        {backgroundColor: colors.surface},
                      ]}>
                      <Icon name="file-excel" size={20} color={colors.text} />
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>
                        Export Complete Data
                      </Text>
                      <Text style={styles.menuItemSubtext}>
                        Download Excel with screening & intervention data
                      </Text>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={[styles.menuItem, styles.deleteItem]}
                onPress={() => {
                  setMenuVisible(false);
                  handleDeleteAccount();
                }}
                activeOpacity={0.7}
                disabled={deleting}>
                <View
                  style={[
                    styles.menuIconContainer,
                    {backgroundColor: colors.errorLight},
                  ]}>
                  <Icon name="delete-outline" size={20} color={colors.error} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemText, {color: colors.error}]}>
                    Delete Account
                  </Text>
                  <Text style={styles.menuItemSubtext}>
                    Permanently delete your account
                  </Text>
                </View>
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Icon
                    name="chevron-right"
                    size={16}
                    color={colors.error}
                  />
                )}
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.menuIconContainer,
                    {backgroundColor: colors.surface},
                  ]}>
                  <Icon name="logout" size={20} color={colors.text} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemText, {color: colors.text}]}>
                    Logout
                  </Text>
                  <Text style={styles.menuItemSubtext}>
                    Sign out of account
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {exporting && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPassword('');
        }}>
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

      <SendSMS
        visible={smsModalVisible}
        onClose={() => setSmsModalVisible(false)}
        initialPhoneNumber=""
        initialMessage=""
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  scrollContainer: {flex: 1},
  container: {
    paddingHorizontal: spacing.horizontal, 
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  dashboardHeader: {
    marginBottom: spacing.lg,
  },
  welcomeCard: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  welcomeTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  quickActionsHeader: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  quickActionsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xl,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionBox: {
    width: '48%',
    marginBottom: spacing.md,
  },
  quickActionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  arrowContainer: {
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: screenWidth * 0.85,
    maxWidth: 320,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1001,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  userRole: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemsContainer: {
    flex: 1,
  },
  menuItems: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: 2,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  menuItemSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.horizontal, 
    marginVertical: spacing.sm,
  },
  logoutItem: {
    backgroundColor: colors.errorLight + '20',
  },
  deleteItem: {
    backgroundColor: colors.errorLight + '15',
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
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

export default Dashboard;
