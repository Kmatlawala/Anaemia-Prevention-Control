import React, {useEffect} from 'react';
import store from './src/store/store';
import {KeyboardAvoidingView, StatusBar} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import AuthNavigator from './src/navigation/AuthNavigator';

import {initFCM} from './src/utils/fcm';
import {startSyncLoop, runSyncOnce} from './src/utils/sync';
import {loadCachedData, fetchBeneficiaries} from './src/store/beneficiarySlice';
import {addNetworkListener} from './src/utils/asyncCache';
import {
  handleFirstAppOpenPermissions,
  ensureAllPermissions,
  requestPermissionsOnAppLaunch,
} from './src/utils/permissionManager';
import {initializeSMSPermissions} from './src/utils/sms';
import Information from './src/screens/Information';
import {Provider} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AuthInitializer from './src/components/AuthInitializer';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    store.dispatch(loadCachedData());
    store.dispatch(fetchBeneficiaries());
    initFCM().catch(error => {
      console.error('FCM initialization failed:', error);
    });
    initializeSMSPermissions().catch(error => {
      console.warn('SMS permissions initialization failed:', error);
    });
    requestPermissionsOnAppLaunch().catch(error => {
      console.error('Permission request on app launch failed:', error);
    });
    handleFirstAppOpenPermissions().catch(error => {
      console.error('Permission handling failed:', error);
    });
    try {
      startSyncLoop(60_000);
    } catch (error) {
      console.error('Sync loop initialization failed:', error);
    }
    const unsubscribe = addNetworkListener(async state => {
      if (state.isConnected && state.isInternetReachable) {
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
    <SafeAreaProvider>
      <Provider store={store}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6FAFF" />
        <AuthInitializer>
          <SafeAreaView style={{flex: 1, backgroundColor: '#F6FAFF'}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{flex: 1}}>
              <AuthNavigator />
            </KeyboardAvoidingView>
          </SafeAreaView>
        </AuthInitializer>
      </Provider>
    </SafeAreaProvider>
  );
}
