# Fix DEVELOPER_ERROR in Release Build

## Problem

Google Sign-In works in debug mode but shows "DEVELOPER_ERROR" in release builds.

## Root Cause

Release builds use a different keystore (`anaemia-release-key.keystore`) than debug builds, which generates a different SHA-1 fingerprint. Firebase Console needs BOTH fingerprints registered.

## Solution

### Step 1: Get Release SHA-1 Fingerprint

**Windows:**

```bash
cd android
get-release-sha1.bat
```

**Mac/Linux:**

```bash
cd android
chmod +x get-release-sha1.sh
./get-release-sha1.sh
```

**Manual Method:**

```bash
cd android/app
keytool -list -v -keystore anaemia-release-key.keystore -alias anaemia-key-alias -storepass animia123 -keypass animia123
```

Look for the line that says:

```
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

### Step 2: Add SHA-1 to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. Find your Android app (`com.animiahealth`)
6. Click **Add fingerprint** button
7. Paste the **RELEASE SHA-1** fingerprint
8. Click **Save**

### Step 3: Verify Debug SHA-1 is Also Added

Make sure you have BOTH fingerprints:

- **Debug SHA-1** (from debug.keystore)
- **Release SHA-1** (from anaemia-release-key.keystore)

To get Debug SHA-1:

```bash
cd android
./gradlew signingReport
```

Look for the SHA-1 under `Variant: debug` section.

### Step 4: Wait for Propagation

After adding the fingerprint:

- Wait **5-10 minutes** for Firebase to propagate changes
- You may need to download a new `google-services.json` file
- Restart the app after waiting

### Step 5: Rebuild Release APK

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

## Additional Checks

### Verify ProGuard Rules

The ProGuard rules have been updated to prevent Google Sign-In classes from being obfuscated. Check `android/app/proguard-rules.pro`.

### Verify google-services.json

Make sure `android/app/google-services.json` is up to date and matches your Firebase project.

### Verify Package Name

Ensure the package name in `build.gradle` matches Firebase Console:

```gradle
applicationId "com.animiahealth"
```

## Troubleshooting

### Still Getting DEVELOPER_ERROR?

1. **Double-check SHA-1**: Make sure you copied the correct SHA-1 (no spaces, all uppercase)
2. **Check Package Name**: Must match exactly: `com.animiahealth`
3. **Wait Longer**: Sometimes it takes 15-20 minutes for changes to propagate
4. **Download New google-services.json**: After adding SHA-1, download the updated file from Firebase Console
5. **Clear App Data**: Uninstall and reinstall the app
6. **Check OAuth Client**: In Firebase Console → Authentication → Sign-in method → Google, ensure OAuth client is configured

### Verify SHA-1 in Firebase Console

1. Go to Firebase Console → Project Settings → Your apps
2. Click on your Android app
3. Scroll to **SHA certificate fingerprints**
4. Verify both Debug and Release SHA-1 are listed

## Quick Reference

- **Debug Keystore**: `android/app/debug.keystore`
- **Release Keystore**: `android/app/anaemia-release-key.keystore`
- **Package Name**: `com.animiahealth`
- **Firebase Console**: https://console.firebase.google.com/
