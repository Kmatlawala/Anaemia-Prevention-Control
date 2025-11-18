let getApp;
let messaging;
let notifee;

try {
  getApp = require('@react-native-firebase/app').getApp;
  messaging = require('@react-native-firebase/messaging').default;
  notifee = require('@notifee/react-native').default;
} catch (_) {}

export async function initFCM() {
  if (!getApp || !messaging || !notifee) {
    return null;
  }

  try {
    const app = getApp();

    await ensureChannel();

    try {
      const authStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
      });
    } catch (permErr) {
      console.error('Error requesting permission:', permErr);
    }

    const token = await messaging().getToken();
    if (token) {
      try {
        const {API} = require('./api');
        const {Platform} = require('react-native');

        await API.registerToken(token, Platform.OS, token, null, true);
      } catch (err) {}
    } else {
    }

    messaging().onMessage(async msg => {
      try {
        const title = msg?.notification?.title || msg?.data?.title || 'Update';
        const body = msg?.notification?.body || msg?.data?.body || '';
        await notifee.displayNotification({
          title,
          body,
          android: {
            channelId: 'default',
            importance: 4,
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        });
      } catch (err) {}
    });

    messaging().onNotificationOpenedApp(remoteMessage => {});

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
        }
      });

    return token;
  } catch (err) {
    return null;
  }
}
async function ensureChannel() {
  if (!notifee) {
    return;
  }
  try {
    await notifee.createChannel({
      id: 'default',
      name: 'General Notifications',
      importance: 4,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });
  } catch (err) {}
}
