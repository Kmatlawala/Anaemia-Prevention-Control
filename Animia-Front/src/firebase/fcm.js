// src/notifications/fcm.js
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// call this after user logs in or app starts
export async function requestPermissionAndSaveToken() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return null;

    const token = await messaging().getToken();
    const uid = auth().currentUser?.uid;
    if (!uid || !token) return token;

    // save token doc id = token
    await firestore().collection('users').doc(uid).collection('tokens').doc(token).set({
      createdAt: firestore.FieldValue.serverTimestamp()
    });

    // listen for token refresh
    messaging().onTokenRefresh(async (newToken) => {
      if (!newToken) return;
      if (!auth().currentUser) return;
      await firestore().collection('users').doc(auth().currentUser.uid).collection('tokens').doc(newToken).set({
        createdAt: firestore.FieldValue.serverTimestamp()
      });
    });

    return token;
  } catch (e) {
    console.warn('token save err', e);
    return null;
  }
}
