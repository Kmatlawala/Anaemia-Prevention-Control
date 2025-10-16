import {Alert} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {API_BASE} from '../utils/api';
import {handleAutoSMS, handleBroadcastSMS} from './autoSMS';
import {handleNotificationPermissionOnFirstNotification} from './permissionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function showLocalNotification(title, body) {
  try {
    await messaging().requestPermission();
    await messaging().displayNotification({
      title,
      body,
    });

    // Auto send SMS for local notifications
    await handleAutoSMS({data: {type: 'local', title, body}});
  } catch (e) {
    Alert.alert('Notification Error', 'Failed to show local notification.');
  }
}

export async function sendPushToSelf(title, body, data = {}) {
  try {
    console.log('[Notifications] Checking permission...');

    // Handle notification permission on first notification
    await handleNotificationPermissionOnFirstNotification();

    // Request permission if not already granted
    await messaging().requestPermission();

    console.log('[Notifications] Getting FCM token...');
    const token = await messaging().getToken();
    console.log('[Notifications] FCM token:', token);

    if (!token) {
      throw new Error('No FCM token available');
    }

    console.log('[Notifications] Getting auth token...');
    const authState = await AsyncStorage.getItem('@animia_auth_state');
    if (!authState) {
      throw new Error('No authentication state available');
    }

    const parsedAuthState = JSON.parse(authState);
    const authToken = parsedAuthState?.token;
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    console.log('[Notifications] Sending notification to backend...');
    const res = await fetch(`${API_BASE}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({token, title, body, data}),
    });

    console.log('[Notifications] Backend response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Notifications] Backend error:', errorText);
      throw new Error(`Send failed: ${res.status} - ${errorText}`);
    }

    const result = await res.json();
    console.log('[Notifications] Backend response:', result);

    // Auto send SMS for push notifications
    console.log('[Notifications] Sending auto SMS...');
    await handleAutoSMS({data, title, body});

    console.log('[Notifications] Notification sent successfully');
    return result;
  } catch (e) {
    console.error('[Notifications] Failed to send push notification:', e);
    Alert.alert(
      'Notification Error',
      `Failed to send push notification: ${e.message}`,
    );
  }
}
