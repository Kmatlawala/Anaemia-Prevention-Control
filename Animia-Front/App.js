import React, { useEffect } from 'react';
import store from './src/store/store';
import { StatusBar } from 'react-native';
import AuthNavigator from './src/navigation/AuthNavigator';

import { createTables } from './src/database/schema';
import { initFCM } from './src/utils/fcm';
import { startSyncLoop } from './src/utils/sync';
import Information from './src/screens/Information';
import { Provider } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthInitializer from './src/components/AuthInitializer';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize database safely
    try {
      createTables();
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
    
    // Initialize FCM safely
    initFCM().catch((error) => {
      console.error('FCM initialization failed:', error);
    });
    
    // Start sync loop safely
    try {
      startSyncLoop(60_000);
    } catch (error) {
      console.error('Sync loop initialization failed:', error);
    }
  }, []);

 return (
    <Provider store={store}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6FAFF" />
      <AuthInitializer>
        <AuthNavigator />
      </AuthInitializer>
    </Provider>
    );
};