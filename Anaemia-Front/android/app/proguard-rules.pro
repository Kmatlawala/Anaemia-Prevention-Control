# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Keep Google Sign-In classes from being obfuscated
-keep class com.google.android.gms.** { *; }
-keep class com.google.api.client.** { *; }
-keep class com.google.auth.** { *; }

# Keep React Native Google Sign-In classes
-keep class com.reactnativegooglesignin.** { *; }
-dontwarn com.reactnativegooglesignin.**

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep Google Play Services
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.common.**
