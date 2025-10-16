// src/screens/Settings.js
import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {colors, spacing, typography, platform} from '../theme/theme';
import {exportJsonToXlsx} from '../utils/export';
import {API} from '../utils/api';
import {getRole, clearRole} from '../utils/role';
import {logout} from '../store/authSlice';

const Settings = ({navigation}) => {
  const dispatch = useDispatch();
  const [exporting, setExporting] = useState(false);

  const handleExportSmall = async () => {
    setExporting(true);
    try {
      const rows = await API.getBeneficiaries(200);
      await exportJsonToXlsx(rows, 'Animia_Sample');
      Alert.alert('Exported', 'Saved to device');
    } catch (e) {
      console.warn(e);
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
            // Clear role from AsyncStorage
            await clearRole();
            // Dispatch logout action to clear Redux state
            dispatch(logout());
            // AuthNavigator will automatically redirect to AdminLogin
            // No need to manually navigate
          } catch (error) {
            console.error('Sign out error:', error);
            // Even if there's an error, still try to logout
            dispatch(logout());
            // AuthNavigator will handle the redirect
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Settings"
        onMenuPress={() => navigation.goBack()}
        onBellPress={() => {}}
      />
      <View style={styles.cardContainer}>
        <TouchableOpacity style={styles.card} onPress={handleExportSmall}>
          <Text>Export sample (200)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Reports')}>
          <Text>View Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={handleSignOut}>
          <Text>Sign Out</Text>
        </TouchableOpacity>
        {exporting && <ActivityIndicator style={{marginTop: spacing.md}} />}
      </View>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
