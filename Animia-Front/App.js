import React, {useEffect} from 'react';
import store from './src/store/store';
import {StatusBar} from 'react-native';
import AuthNavigator from './src/navigation/AuthNavigator';

import {initFCM} from './src/utils/fcm';
import {startSyncLoop, runSyncOnce} from './src/utils/sync';
import {loadCachedData, fetchBeneficiaries} from './src/store/beneficiarySlice';
import {addNetworkListener} from './src/utils/asyncCache';
import {handleFirstAppOpenPermissions} from './src/utils/permissionManager';
import Information from './src/screens/Information';
import {Provider} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AuthInitializer from './src/components/AuthInitializer';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Load cached data on app initialization
    store.dispatch(loadCachedData());

    // Also try to fetch fresh data if online
    store.dispatch(fetchBeneficiaries());

    // Initialize FCM safely
    initFCM().catch(error => {
      console.error('FCM initialization failed:', error);
    });

    // Handle notification permissions on first app open
    handleFirstAppOpenPermissions().catch(error => {
      console.error('Permission handling failed:', error);
    });

    // Start sync loop safely
    try {
      startSyncLoop(60_000);
    } catch (error) {
      console.error('Sync loop initialization failed:', error);
    }

    // Add network state listener for automatic sync
    const unsubscribe = addNetworkListener(async state => {
      // If network becomes available, trigger immediate sync and data fetch
      if (state.isConnected && state.isInternetReachable) {
        // Run sync immediately
        try {
          await runSyncOnce();
        } catch (error) {
          console.error('[App] Immediate sync failed:', error);
        }

        // Fetch fresh data
        try {
          store.dispatch(fetchBeneficiaries());
        } catch (error) {
          console.error('[App] Fresh data fetch failed:', error);
        }
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Provider store={store}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6FAFF" />
      <AuthInitializer>
        <AuthNavigator />
      </AuthInitializer>
    </Provider>
  );
}
