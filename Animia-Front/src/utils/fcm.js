let getApp;
let messaging;
let notifee;

try {
  // Lazy require so the app still runs without Firebase config
  getApp = require('@react-native-firebase/app').getApp;
  messaging = require('@react-native-firebase/messaging').default;
  notifee = require('@notifee/react-native').default;
} catch (_) {
  // libs not available; will no-op
}

export async function initFCM() {
  console.log('initFCM');
  console.log('getApp', getApp);
  console.log('messaging', messaging);
  console.log('notifee', notifee);
  if (!getApp || !messaging || !notifee) {
    console.error('FCM: Firebase modules not loaded');
    return null;
  }

  try {
    const app = getApp(); // default Firebase app
    await ensureChannel();
    console.log('ensureChannel');
    // Permission (Android is auto-granted; iOS prompts user)
    await messaging(app).requestPermission();
    console.log('requestPermission');
    // Retrieve device token (store it if you need to send direct notifications)
    const token = await messaging(app).getToken();
    console.log('token', token);
    try {
      const {API} = require('./api');
      const {Platform} = require('react-native');
      // Use FCM token as device_id surrogate; optionally enrich with model
      const DeviceInfo = require('react-native').Platform; // placeholder if react-native-device-info is not used
      await API.registerToken(token, Platform.OS, token, null, true);
      console.log('Token registered with backend');
    } catch (err) {
      console.error('Error registering token with backend:', err);
    }

    // Foreground messages → show a heads-up notification
    messaging(app).onMessage(async msg => {
      try {
        const title = msg?.notification?.title || 'Update';
        const body = msg?.notification?.body || '';
        await notifee.displayNotification({
          title,
          body,
          android: {channelId: 'default'},
        });
      } catch (err) {
        console.error('Error displaying notification:', err);
      }
    });

    return token;
  } catch (err) {
    console.error('FCM init error:', err);
    return null;
  }
}
async function ensureChannel() {
  if (!notifee) return;
  try {
    await notifee.createChannel({
      id: 'default',
      name: 'General',
      importance: 4, // AndroidImportance.HIGH
    });
  } catch (_) {}
}
