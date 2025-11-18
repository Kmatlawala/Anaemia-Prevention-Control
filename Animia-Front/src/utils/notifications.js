import {Alert} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {API_BASE, requestWithFallback} from '../utils/api';
import {handleAutoSMS, handleBroadcastSMS} from './autoSMS';
import {handleNotificationPermissionOnFirstNotification} from './permissionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import store from '../store/store';

export async function showLocalNotification(title, body) {
  try {
    await messaging().requestPermission();
    await messaging().displayNotification({
      title,
      body,
    });

    await handleAutoSMS({data: {type: 'local', title, body}});
  } catch (e) {
    Alert.alert('Notification Error', 'Failed to show local notification.');
  }
}

export async function sendPushToSelf(title, body, data = {}) {
  try {
    
    await handleNotificationPermissionOnFirstNotification();

    await messaging().requestPermission();

    const token = await messaging().getToken();
    if (!token) {
      throw new Error('No FCM token available');
    }

    const authState = await AsyncStorage.getItem('@animia_auth_state');
    if (!authState) {
      throw new Error('No authentication state available');
    }

    const parsedAuthState = JSON.parse(authState);
    const authToken = parsedAuthState?.token;
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const result = await requestWithFallback('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: {token, title, body, data},
    });

    await handleAutoSMS({data, title, body});

    return result;
  } catch (e) {
    const errorMessage = e?.data || e?.message || e?.originalError || 'Network request failed';

    throw e; 
  }
}
