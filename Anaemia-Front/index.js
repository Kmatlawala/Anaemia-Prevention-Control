import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Guarded background handler (no crash if Firebase not configured)
try {
  const { getApp } = require('@react-native-firebase/app');
  const messaging = require('@react-native-firebase/messaging').default;
  const notifee = require('@notifee/react-native').default;

  const app = getApp();
  
  // Ensure notification channel exists for background messages
  notifee.createChannel({
    id: 'default',
    name: 'General Notifications',
    importance: 4, // AndroidImportance.HIGH
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  }).catch(() => {});

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM] Background message received:', remoteMessage);
    try {
      const title = remoteMessage?.notification?.title || remoteMessage?.data?.title || 'Update';
      const body = remoteMessage?.notification?.body || remoteMessage?.data?.body || '';
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: 'default',
          importance: 4, // AndroidImportance.HIGH
          sound: 'default',
          pressAction: {
            id: 'default',
          },
        },
      });
      console.log('[FCM] Background notification displayed');
    } catch (err) {
      console.error('[FCM] Error displaying background notification:', err);
    }
  });
} catch (err) {
  console.warn('[FCM] Firebase not installed/configured; skip background handler:', err);
}

AppRegistry.registerComponent(appName, () => App);
