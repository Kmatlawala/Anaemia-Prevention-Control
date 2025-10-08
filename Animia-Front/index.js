import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Guarded background handler (no crash if Firebase not configured)
try {
  const { getApp } = require('@react-native-firebase/app');
  const messaging = require('@react-native-firebase/messaging').default;
  const notifee = require('@notifee/react-native').default;

  const app = getApp();
  messaging(app).setBackgroundMessageHandler(async remoteMessage => {
    try {
      const title = remoteMessage?.notification?.title || 'Update';
      const body = remoteMessage?.notification?.body || '';
      await notifee.displayNotification({
        title,
        body,
        android: { channelId: 'default' },
      });
    } catch (_) {}
  });
} catch (_) {
  // Firebase not installed/configured; skip background handler
}

AppRegistry.registerComponent(appName, () => App);
