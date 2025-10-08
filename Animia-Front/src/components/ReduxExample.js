import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchBeneficiaries, 
  addBeneficiary, 
  setFilters,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
  selectBeneficiaryFilters
} from '../store/beneficiarySlice';
import { 
  fetchReports, 
  generateReport,
  selectReports,
  selectReportLoading,
  selectReportError
} from '../store/reportSlice';
import { 
  loginUser, 
  logout,
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading
} from '../store/authSlice';
import { 
  initializeApp,
  syncData,
  selectIsOnline,
  selectSyncStatus
} from '../store/appSlice';

export default function ReduxExample() {
  const dispatch = useDispatch();
  
  // Auth state
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);
  
  // Beneficiary state
  const beneficiaries = useSelector(selectBeneficiaries);
  const beneficiaryLoading = useSelector(selectBeneficiaryLoading);
  const beneficiaryError = useSelector(selectBeneficiaryError);
  const beneficiaryFilters = useSelector(selectBeneficiaryFilters);
  
  // Report state
  const reports = useSelector(selectReports);
  const reportLoading = useSelector(selectReportLoading);
  const reportError = useSelector(selectReportError);
  
  // App state
  const isOnline = useSelector(selectIsOnline);
  const syncStatus = useSelector(selectSyncStatus);
  
  useEffect(() => {
    // Initialize app when component mounts
    dispatch(initializeApp());
  }, [dispatch]);
  
  const handleLogin = async () => {
    try {
      await dispatch(loginUser({ username: 'admin', password: 'password' })).unwrap();
      Alert.alert('Success', 'Login successful!');
    } catch (error) {
      Alert.alert('Error', error);
    }
  };
  
  const handleLogout = () => {
    dispatch(logout());
    Alert.alert('Success', 'Logged out successfully!');
  };
  
  const handleFetchBeneficiaries = async () => {
    try {
      await dispatch(fetchBeneficiaries(beneficiaryFilters)).unwrap();
      Alert.alert('Success', `Fetched ${beneficiaries.length} beneficiaries`);
    } catch (error) {
      Alert.alert('Error', error);
    }
  };
  
  const handleAddBeneficiary = async () => {
    const newBeneficiary = {
      name: 'New Beneficiary',
      age: 25,
      category: 'Pregnant',
      status: 'normal',
      location: 'Mahuva',
      phone: '9876543210',
    };
    
    try {
      await dispatch(addBeneficiary(newBeneficiary)).unwrap();
      Alert.alert('Success', 'Beneficiary added successfully!');
    } catch (error) {
      Alert.alert('Error', error);
    }
  };
  
  const handleFetchReports = async () => {
    try {
      await dispatch(fetchReports({})).unwrap();
      Alert.alert('Success', `Fetched ${reports.length} reports`);
    } catch (error) {
      Alert.alert('Error', error);
    }
  };
  
  const handleGenerateReport = async () => {
    const reportData = {
      title: 'Monthly Report',
      type: 'summary',
      beneficiaries: beneficiaries.length,
    };
    
    try {
      await dispatch(generateReport(reportData)).unwrap();
      Alert.alert('Success', 'Report generated successfully!');
    } catch (error) {
      Alert.alert('Error', error);
    }
  };
  
  const handleSync = async () => {
    try {
      await dispatch(syncData()).unwrap();
      Alert.alert('Success', 'Data synced successfully!');
    } catch (error) {
      Alert.alert('Error', error);
    }
  };
  
  const handleUpdateFilters = () => {
    dispatch(setFilters({ 
      searchQuery: 'Test',
      category: 'Pregnant',
      status: 'normal'
    }));
    Alert.alert('Success', 'Filters updated!');
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redux Toolkit Example</Text>
      
      {/* Auth Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication</Text>
        <Text>Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</Text>
        {user && <Text>User: {user.name}</Text>}
        <Text>Loading: {authLoading ? 'Yes' : 'No'}</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={isAuthenticated ? handleLogout : handleLogin}
          disabled={authLoading}
        >
          <Text style={styles.buttonText}>
            {isAuthenticated ? 'Logout' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Beneficiaries Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Beneficiaries</Text>
        <Text>Count: {beneficiaries.length}</Text>
        <Text>Loading: {beneficiaryLoading ? 'Yes' : 'No'}</Text>
        {beneficiaryError && <Text style={styles.error}>Error: {beneficiaryError}</Text>}
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleFetchBeneficiaries}
          disabled={beneficiaryLoading}
        >
          <Text style={styles.buttonText}>Fetch Beneficiaries</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleAddBeneficiary}
          disabled={beneficiaryLoading}
        >
          <Text style={styles.buttonText}>Add Beneficiary</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleUpdateFilters}
        >
          <Text style={styles.buttonText}>Update Filters</Text>
        </TouchableOpacity>
      </View>
      
      {/* Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reports</Text>
        <Text>Count: {reports.length}</Text>
        <Text>Loading: {reportLoading ? 'Yes' : 'No'}</Text>
        {reportError && <Text style={styles.error}>Error: {reportError}</Text>}
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleFetchReports}
          disabled={reportLoading}
        >
          <Text style={styles.buttonText}>Fetch Reports</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleGenerateReport}
          disabled={reportLoading}
        >
          <Text style={styles.buttonText}>Generate Report</Text>
        </TouchableOpacity>
      </View>
      
      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Status</Text>
        <Text>Online: {isOnline ? 'Yes' : 'No'}</Text>
        <Text>Syncing: {syncStatus.isSyncing ? 'Yes' : 'No'}</Text>
        <Text>Last Sync: {syncStatus.lastSync || 'Never'}</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSync}
          disabled={syncStatus.isSyncing}
        >
          <Text style={styles.buttonText}>Sync Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});
