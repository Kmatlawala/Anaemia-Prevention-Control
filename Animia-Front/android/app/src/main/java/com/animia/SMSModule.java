package com.animia;

import android.Manifest;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

public class SMSModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SMSModule";
    private static final int SMS_PERMISSION_CODE = 1001;
    
    private ReactApplicationContext reactContext;

    public SMSModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SMSModule";
    }

    @ReactMethod
    public void sendSMS(String phoneNumber, String message, Promise promise) {
        try {
            Log.d(TAG, "Attempting to send SMS to: " + phoneNumber);
            Log.d(TAG, "Message: " + message);

            // Validate inputs
            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                promise.reject("SMS_ERROR", "Phone number is required");
                return;
            }
            
            if (message == null || message.trim().isEmpty()) {
                promise.reject("SMS_ERROR", "Message is required");
                return;
            }

            // Check SMS permission first
            if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "SMS permission not granted");
                promise.reject("SMS_ERROR", "SMS permission not granted. Please grant SMS permission in app settings.");
                return;
            }

            // Get SMS manager
            SmsManager smsManager = SmsManager.getDefault();
            
            // Clean phone number (remove spaces, dashes, etc.)
            String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
            Log.d(TAG, "Cleaned phone number: " + cleanPhone);
            
            // Send SMS with permission check
            Log.d(TAG, "About to call sendTextMessage with:");
            Log.d(TAG, "- Phone: " + cleanPhone);
            Log.d(TAG, "- Message length: " + message.length());
            Log.d(TAG, "- SMS Manager: " + (smsManager != null ? "Available" : "Null"));
            
            try {
                // Send SMS with retry mechanism
                boolean smsSent = false;
                int maxRetries = 3;
                
                for (int attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        Log.d(TAG, "SMS attempt " + attempt + " of " + maxRetries);
                        
                        // Send SMS with delivery and sent intents for better tracking
                        android.app.PendingIntent sentIntent = android.app.PendingIntent.getBroadcast(
                            reactContext, attempt, new android.content.Intent("SMS_SENT"), 
                            android.app.PendingIntent.FLAG_IMMUTABLE
                        );
                        
                        android.app.PendingIntent deliveryIntent = android.app.PendingIntent.getBroadcast(
                            reactContext, attempt, new android.content.Intent("SMS_DELIVERED"), 
                            android.app.PendingIntent.FLAG_IMMUTABLE
                        );
                        
                        // Send SMS with intents
                        smsManager.sendTextMessage(cleanPhone, null, message, sentIntent, deliveryIntent);
                        Log.d(TAG, "sendTextMessage called successfully with intents (attempt " + attempt + ")");
                        
                        // Wait for SMS processing
                        Thread.sleep(3000);
                        
                        smsSent = true;
                        Log.d(TAG, "SMS sent successfully to: " + cleanPhone + " (attempt " + attempt + ")");
                        break;
                        
                    } catch (Exception retryError) {
                        Log.e(TAG, "SMS attempt " + attempt + " failed: " + retryError.getMessage());
                        if (attempt < maxRetries) {
                            Log.d(TAG, "Retrying SMS in 2 seconds...");
                            Thread.sleep(2000);
                        }
                    }
                }
                
                if (smsSent) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "SMS sent successfully");
                    result.putString("phone", cleanPhone);
                    promise.resolve(result);
                } else {
                    promise.reject("SMS_ERROR", "Failed to send SMS after " + maxRetries + " attempts");
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Error in sendTextMessage: " + e.getMessage());
                Log.e(TAG, "Exception type: " + e.getClass().getSimpleName());
                promise.reject("SMS_ERROR", "Failed to send SMS: " + e.getMessage());
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error sending SMS: " + e.getMessage());
            promise.reject("SMS_ERROR", "Failed to send SMS: " + e.getMessage());
        }
    }

    @ReactMethod
    public void sendSMSDirect(String phoneNumber, String message, Promise promise) {
        try {
            Log.d(TAG, "Sending SMS directly to: " + phoneNumber);
            
            // Check SMS permission first
            if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "SMS permission not granted for direct SMS");
                promise.reject("SMS_ERROR", "SMS permission not granted. Please grant SMS permission in app settings.");
                return;
            }
            
            // Get SMS manager and send directly
            SmsManager smsManager = SmsManager.getDefault();
            
            // Clean and format phone number
            String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
            if (!cleanPhone.startsWith("+")) {
                if (cleanPhone.startsWith("91")) {
                    cleanPhone = "+" + cleanPhone;
                } else if (cleanPhone.length() == 10) {
                    cleanPhone = "+91" + cleanPhone;
                }
            }
            
            Log.d(TAG, "Final phone number: " + cleanPhone);
            Log.d(TAG, "Message length: " + message.length());
            
            // Send SMS directly with proper parameters
            smsManager.sendTextMessage(cleanPhone, null, message, null, null);
            
            // Wait for SMS to be processed
            Thread.sleep(1500);
            
            Log.d(TAG, "SMS sent successfully via direct method");
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "SMS sent successfully");
            result.putString("phone", cleanPhone);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Direct SMS error: " + e.getMessage());
            promise.reject("SMS_ERROR", "Direct SMS failed: " + e.getMessage());
        }
    }

    @ReactMethod
    public void checkSMSPermission(Promise promise) {
        try {
            boolean hasPermission = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) 
                == PackageManager.PERMISSION_GRANTED;
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("hasPermission", hasPermission);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking SMS permission: " + e.getMessage());
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check SMS permission: " + e.getMessage());
        }
    }

    @ReactMethod
    public void testSMS(String phoneNumber, String message, Promise promise) {
        try {
            Log.d(TAG, "Testing SMS to: " + phoneNumber);
            
            // Check SMS permission first
            if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "SMS permission not granted for test SMS");
                promise.reject("SMS_ERROR", "SMS permission not granted. Please grant SMS permission in app settings.");
                return;
            }
            
            // Get SMS manager
            SmsManager smsManager = SmsManager.getDefault();
            
            // Clean phone number
            String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
            if (!cleanPhone.startsWith("+")) {
                if (cleanPhone.startsWith("91")) {
                    cleanPhone = "+" + cleanPhone;
                } else if (cleanPhone.length() == 10) {
                    cleanPhone = "+91" + cleanPhone;
                }
            }
            
            Log.d(TAG, "Test SMS - Phone: " + cleanPhone);
            Log.d(TAG, "Test SMS - Message: " + message);
            
            // Send test SMS
            smsManager.sendTextMessage(cleanPhone, null, message, null, null);
            
            // Wait for processing
            Thread.sleep(2000);
            
            Log.d(TAG, "Test SMS sent successfully");
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Test SMS sent successfully");
            result.putString("phone", cleanPhone);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Test SMS error: " + e.getMessage());
            promise.reject("SMS_ERROR", "Test SMS failed: " + e.getMessage());
        }
    }
}
