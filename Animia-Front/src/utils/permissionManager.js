import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import {requestSMSPermission, checkSMSPermission} from './fixedSMS';

const PERMISSION_STORAGE_KEY = '@animia_notification_permission_requested';
const SMS_PERMISSION_STORAGE_KEY = '@animia_sms_permission_requested';
const FIRST_APP_OPEN_KEY = '@animia_first_app_open';

export async function isFirstAppOpen() {
  try {
    const firstOpen = await AsyncStorage.getItem(FIRST_APP_OPEN_KEY);
    return firstOpen === null;
  } catch (error) {
    return false;
  }
}

export async function markAppOpened() {
  try {
    await AsyncStorage.setItem(FIRST_APP_OPEN_KEY, 'true');
  } catch (error) {
    }
}

export async function hasRequestedNotificationPermission() {
  try {
    const requested = await AsyncStorage.getItem(PERMISSION_STORAGE_KEY);
    return requested === 'true';
  } catch (error) {
    return false;
  }
}

export async function markNotificationPermissionRequested() {
  try {
    await AsyncStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
  } catch (error) {
    }
}

export async function checkNotificationPermissionStatus() {
  try {
    
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const hasAndroidPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (!hasAndroidPermission) {
          return {
            authorized: false,
            provisional: false,
            denied: true,
            notDetermined: false,
            status: messaging.AuthorizationStatus.DENIED,
          };
        }
      } catch (androidError) {
        
      }
    }

    let authStatus;
    if (messaging().hasPermission) {
      authStatus = await messaging().hasPermission();
    } else {
      
      try {
        await messaging().getToken();
        authStatus = messaging.AuthorizationStatus.AUTHORIZED;
      } catch (e) {
        authStatus = messaging.AuthorizationStatus.DENIED;
      }
    }
    return {
      authorized: authStatus === messaging.AuthorizationStatus.AUTHORIZED,
      provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL,
      denied: authStatus === messaging.AuthorizationStatus.DENIED,
      notDetermined:
        authStatus === messaging.AuthorizationStatus.NOT_DETERMINED,
      status: authStatus,
    };
  } catch (error) {
    return {
      authorized: false,
      provisional: false,
      denied: true,
      notDetermined: false,
      status: messaging.AuthorizationStatus.DENIED,
    };
  }
}

export async function getNotificationPermissionStatus() {
  try {
    const authStatus = await messaging().requestPermission();
    return {
      authorized: authStatus === messaging.AuthorizationStatus.AUTHORIZED,
      provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL,
      denied: authStatus === messaging.AuthorizationStatus.DENIED,
      notDetermined:
        authStatus === messaging.AuthorizationStatus.NOT_DETERMINED,
      status: authStatus,
    };
  } catch (error) {
    return {
      authorized: false,
      provisional: false,
      denied: true,
      notDetermined: false,
      status: messaging.AuthorizationStatus.DENIED,
    };
  }
}

export async function requestNotificationPermission(showAlert = true) {
  try {
    
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (!hasPermission) {
          const androidResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (androidResult !== PermissionsAndroid.RESULTS.GRANTED) {
            await markNotificationPermissionRequested();
            return {
              granted: false,
              authorized: false,
              provisional: false,
              status: messaging.AuthorizationStatus.DENIED,
            };
          }
        }
      } catch (androidError) {
        
      }
    }

    const authStatus = await messaging().requestPermission({
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    });

    const isAuthorized =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED;
    const isProvisional =
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    const isGranted = isAuthorized || isProvisional;

    await markNotificationPermissionRequested();

    return {
      granted: isGranted,
      authorized: isAuthorized,
      provisional: isProvisional,
      status: authStatus,
    };
  } catch (error) {
    await markNotificationPermissionRequested();
    return {
      granted: false,
      authorized: false,
      provisional: false,
      status: messaging.AuthorizationStatus.DENIED,
    };
  }
}

export async function handleFirstAppOpenPermissions() {
  try {
    const isFirstOpen = await isFirstAppOpen();
    if (!isFirstOpen) {
      return; 
    }

    await markAppOpened();

    await requestNotificationPermission(true);
  } catch (error) {
    }
}

export async function handleNotificationPermissionOnFirstNotification() {
  try {
    const hasRequested = await hasRequestedNotificationPermission();
    if (hasRequested) {
      return; 
    }

    const permissionStatus = await getNotificationPermissionStatus();
    if (permissionStatus.authorized || permissionStatus.provisional) {
      
      await markNotificationPermissionRequested();
      return;
    }

    await requestNotificationPermission(false);
    await markNotificationPermissionRequested();
  } catch (error) {
    }
}

export async function ensureNotificationPermission() {
  try {
    const permissionStatus = await getNotificationPermissionStatus();

    if (permissionStatus.authorized || permissionStatus.provisional) {
      return true; 
    }

    const result = await requestNotificationPermission(true);
    return result.granted;
  } catch (error) {
    return false;
  }
}

export async function hasRequestedSMSPermission() {
  try {
    const requested = await AsyncStorage.getItem(SMS_PERMISSION_STORAGE_KEY);
    return requested === 'true';
  } catch (error) {
    return false;
  }
}

export async function markSMSPermissionRequested() {
  try {
    await AsyncStorage.setItem(SMS_PERMISSION_STORAGE_KEY, 'true');
  } catch (error) {
    }
}

export async function getSMSPermissionStatus() {
  try {
    if (Platform.OS !== 'android') {
      return {granted: true, available: false};
    }

    const granted = await checkSMSPermission();
    return {
      granted,
      available: true,
    };
  } catch (error) {
    return {
      granted: false,
      available: Platform.OS === 'android',
    };
  }
}

export async function requestSMSPermissionWithAlert(showAlert = true) {
  try {
    if (Platform.OS !== 'android') {
      return {granted: true, available: false};
    }

    const granted = await requestSMSPermission();

    await markSMSPermissionRequested();

    return {
      granted,
      available: true,
    };
  } catch (error) {
    return {
      granted: false,
      available: Platform.OS === 'android',
    };
  }
}

export async function ensureAllPermissions() {
  try {
    const notificationGranted = await ensureNotificationPermission();
    const smsResult = await getSMSPermissionStatus();

    if (Platform.OS === 'android' && !smsResult.granted) {
      const smsGranted = await requestSMSPermissionWithAlert(false);
      return {
        notification: notificationGranted,
        sms: smsGranted.granted,
      };
    }

    return {
      notification: notificationGranted,
      sms: smsResult.granted,
    };
  } catch (error) {
    return {
      notification: false,
      sms: false,
    };
  }
}

export async function requestPermissionsOnAppLaunch() {
  try {
    
    const notificationStatus = await checkNotificationPermissionStatus();
    let notificationGranted =
      notificationStatus.authorized || notificationStatus.provisional;

    if (!notificationGranted) {
      const notificationResult = await requestNotificationPermission(true);
      notificationGranted = notificationResult.granted;
    } else {
      }

    let smsGranted = true; 
    if (Platform.OS === 'android') {
      const smsStatus = await getSMSPermissionStatus();
      smsGranted = smsStatus.granted;

      if (!smsGranted) {
        const smsResult = await requestSMSPermissionWithAlert(true);
        smsGranted = smsResult.granted;
      } else {
        }
    }

    return {
      notification: notificationGranted,
      sms: smsGranted,
    };
  } catch (error) {
    return {
      notification: false,
      sms: false,
    };
  }
}
