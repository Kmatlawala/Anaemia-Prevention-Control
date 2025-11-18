import auth from '@react-native-firebase/auth';
import {Alert} from 'react-native';

export async function sendOTPToPhone(phoneNumber) {
  try {
    const formattedPhone = phoneNumber;

    const confirmation = await auth().signInWithPhoneNumber(formattedPhone);

    return {
      success: true,
      verificationId: confirmation.verificationId,
    };
  } catch (error) {
    let errorMessage = 'Failed to send OTP';
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage =
        'Invalid phone number format. Use international format like +1 650-555-3434';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMessage = 'SMS quota exceeded. Please try again later';
    } else if (error.code === 'auth/configuration-not-found') {
      errorMessage =
        'Phone authentication not enabled. Please enable in Firebase Console';
    } else if (error.code === 'auth/billing-not-enabled') {
      errorMessage =
        'Billing not enabled. Use test phone numbers: +1 650-555-3434';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'reCAPTCHA verification failed. Please try again';
    } else if (error.code === 'auth/invalid-app-credential') {
      errorMessage = 'Invalid app credentials. Check google-services.json';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function verifyOTPCode(verificationId, otpCode) {
  try {
    const credential = auth.PhoneAuthProvider.credential(
      verificationId,
      otpCode,
    );
    const userCredential = await auth().signInWithCredential(credential);

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
    let errorMessage = 'Invalid OTP code';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid OTP code';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP code has expired';
    } else if (error.code === 'auth/session-expired') {
      errorMessage = 'Session expired. Please request a new OTP';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function sendEmailVerification(email) {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      'temp_password_' + Date.now(),
    );

    await userCredential.user.sendEmailVerification();

    await auth().signOut();

    return {
      success: true,
    };
  } catch (error) {
    let errorMessage = 'Failed to send email verification';
    if (error.code === 'auth/email-already-in-use') {
      try {
        const signInResult = await auth().signInWithEmailAndPassword(
          email,
          'temp_password_' + Date.now(),
        );
        if (signInResult.user && !signInResult.user.emailVerified) {
          await signInResult.user.sendEmailVerification();
          await auth().signOut();
          return {success: true};
        }
      } catch (signInError) {}
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function verifyEmailOTP(email, otpCode) {
  try {
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return {
        success: false,
        error: 'Invalid OTP format',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to verify email OTP',
    };
  }
}

export async function signInWithGoogle() {
  try {
    const {GoogleSignin} = require('@react-native-google-signin/google-signin');

    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

    const {idToken} = await GoogleSignin.signIn();

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    const userCredential = await auth().signInWithCredential(googleCredential);

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
    let errorMessage = 'Google sign in failed';
    if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'An account already exists with this email';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid Google credentials';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function signOut() {
  try {
    await auth().signOut();
  } catch (error) {}
}

export async function getCurrentUser() {
  try {
    return auth().currentUser;
  } catch (error) {
    return null;
  }
}

export function onAuthStateChanged(callback) {
  return auth().onAuthStateChanged(callback);
}
