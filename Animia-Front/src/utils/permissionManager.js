import {Alert, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const PERMISSION_STORAGE_KEY = '@animia_notification_permission_requested';
const FIRST_APP_OPEN_KEY = '@animia_first_app_open';

/**
 * Check if this is the first time the app is being opened
 */
export async function isFirstAppOpen() {
  try {
    const firstOpen = await AsyncStorage.getItem(FIRST_APP_OPEN_KEY);
    return firstOpen === null;
  } catch (error) {
    console.error('[PermissionManager] Error checking first app open:', error);
    return false;
  }
}

/**
 * Mark that the app has been opened at least once
 */
export async function markAppOpened() {
  try {
    await AsyncStorage.setItem(FIRST_APP_OPEN_KEY, 'true');
  } catch (error) {
    console.error('[PermissionManager] Error marking app opened:', error);
  }
}

/**
 * Check if notification permission has been requested before
 */
export async function hasRequestedNotificationPermission() {
  try {
    const requested = await AsyncStorage.getItem(PERMISSION_STORAGE_KEY);
    return requested === 'true';
  } catch (error) {
    console.error(
      '[PermissionManager] Error checking permission request:',
      error,
    );
    return false;
  }
}

/**
 * Mark that notification permission has been requested
 */
export async function markNotificationPermissionRequested() {
  try {
    await AsyncStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
  } catch (error) {
    console.error(
      '[PermissionManager] Error marking permission requested:',
      error,
    );
  }
}

/**
 * Check current notification permission status
 */
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
    console.error(
      '[PermissionManager] Error getting permission status:',
      error,
    );
    return {
      authorized: false,
      provisional: false,
      denied: true,
      notDetermined: false,
      status: messaging.AuthorizationStatus.DENIED,
    };
  }
}

/**
 * Request notification permission with user-friendly messaging
 */
export async function requestNotificationPermission(showAlert = true) {
  try {
    console.log('[PermissionManager] Requesting notification permission...');

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

    // Mark that we've requested permission
    await markNotificationPermissionRequested();

    if (showAlert) {
      if (isGranted) {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive important updates about beneficiary registrations and follow-ups.',
          [{text: 'OK'}],
        );
      } else {
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in your device settings to receive important updates.',
          [{text: 'OK'}],
        );
      }
    }

    return {
      granted: isGranted,
      authorized: isAuthorized,
      provisional: isProvisional,
      status: authStatus,
    };
  } catch (error) {
    console.error('[PermissionManager] Error requesting permission:', error);
    if (showAlert) {
      Alert.alert(
        'Permission Error',
        'Failed to request notification permission. You can enable it later in device settings.',
        [{text: 'OK'}],
      );
    }
    return {
      granted: false,
      authorized: false,
      provisional: false,
      status: messaging.AuthorizationStatus.DENIED,
    };
  }
}

/**
 * Handle notification permission on first app open
 */
export async function handleFirstAppOpenPermissions() {
  try {
    const isFirstOpen = await isFirstAppOpen();
    if (!isFirstOpen) {
      return; // Not first open, skip
    }

    console.log(
      '[PermissionManager] First app open detected, requesting permissions...',
    );

    // Mark app as opened
    await markAppOpened();

    // Request notification permission
    await requestNotificationPermission(true);
  } catch (error) {
    console.error(
      '[PermissionManager] Error handling first app open permissions:',
      error,
    );
  }
}

/**
 * Handle notification permission when first notification is triggered
 */
export async function handleNotificationPermissionOnFirstNotification() {
  try {
    const hasRequested = await hasRequestedNotificationPermission();
    if (hasRequested) {
      return; // Already requested, skip
    }

    const permissionStatus = await getNotificationPermissionStatus();
    if (permissionStatus.authorized || permissionStatus.provisional) {
      // Permission already granted, mark as requested
      await markNotificationPermissionRequested();
      return;
    }

    console.log(
      '[PermissionManager] First notification triggered, requesting permission...',
    );

    // Request permission with explanation
    Alert.alert(
      'Enable Notifications',
      'To receive important updates about beneficiary registrations and follow-ups, please enable notifications.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => markNotificationPermissionRequested(),
        },
        {
          text: 'Enable',
          onPress: async () => {
            await requestNotificationPermission(false);
          },
        },
      ],
    );
  } catch (error) {
    console.error(
      '[PermissionManager] Error handling notification permission:',
      error,
    );
  }
}

/**
 * Check if notifications are enabled and request permission if needed
 */
export async function ensureNotificationPermission() {
  try {
    const permissionStatus = await getNotificationPermissionStatus();

    if (permissionStatus.authorized || permissionStatus.provisional) {
      return true; // Permission already granted
    }

    // Permission not granted, request it
    const result = await requestNotificationPermission(true);
    return result.granted;
  } catch (error) {
    console.error(
      '[PermissionManager] Error ensuring notification permission:',
      error,
    );
    return false;
  }
}
