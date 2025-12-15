# Notification System Setup Guide

## Quick Start

This guide will help you set up the complete notification system for Supasoka, including Firebase Cloud Messaging, Socket.IO, and the mobile app integration.

## Prerequisites

- Firebase project created
- Render.com account with Supasoka backend deployed
- Android development environment set up
- Node.js and npm installed

## Step 1: Firebase Configuration

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "Supasoka" (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 1.2 Add Android App to Firebase

1. In Firebase Console, click "Add app" → Android icon
2. Enter package name: `com.supasoka.app` (must match your app's package name)
3. Download `google-services.json`
4. Place it in: `Supasoka/android/app/google-services.json`

### 1.3 Get Firebase Admin SDK Credentials

1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Keep this file secure - it contains sensitive credentials

### 1.4 Configure Backend (Render.com)

Go to your Render.com dashboard → Supasoka backend → Environment:

Add these environment variables from the downloaded JSON:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important:** For `FIREBASE_PRIVATE_KEY`, replace actual newlines with `\n` in the string.

### 1.5 Optional: Legacy FCM Server Key (Fallback)

1. In Firebase Console, go to Project Settings → Cloud Messaging
2. Under "Cloud Messaging API (Legacy)", enable it if disabled
3. Copy the "Server key"
4. Add to Render.com environment:

```bash
FCM_LEGACY_SERVER_KEY=your-legacy-server-key
```

## Step 2: Mobile App Configuration

### 2.1 Install Required Packages

```bash
cd Supasoka
npm install @react-native-firebase/app @react-native-firebase/messaging react-native-push-notification
```

### 2.2 Configure Android

#### android/build.gradle
```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

#### android/app/build.gradle
```gradle
// Add at the bottom of the file
apply plugin: 'com.google.gms.google-services'

android {
    defaultConfig {
        // Add this
        multiDexEnabled true
    }
}

dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

#### android/app/src/main/AndroidManifest.xml
```xml
<manifest>
    <!-- Add permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

    <application>
        <!-- Add Firebase Messaging Service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Notification metadata -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/notification_color" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="supasoka_notifications" />
    </application>
</manifest>
```

### 2.3 Create Notification Icons

Create notification icons in these directories:
```
android/app/src/main/res/
  ├── drawable-mdpi/ic_notification.png (24x24)
  ├── drawable-hdpi/ic_notification.png (36x36)
  ├── drawable-xhdpi/ic_notification.png (48x48)
  ├── drawable-xxhdpi/ic_notification.png (72x72)
  └── drawable-xxxhdpi/ic_notification.png (96x96)
```

Icons should be:
- White/transparent PNG
- Simple, recognizable design
- Optimized for small sizes

### 2.4 Add Notification Color

Create `android/app/src/main/res/values/colors.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="notification_color">#3B82F6</color>
</resources>
```

## Step 3: Verify Installation

### 3.1 Backend Verification

Run the diagnostic script:
```bash
cd backend
node scripts/test-notifications.js
```

Expected output:
```
✅ Firebase Initialized: YES
✅ Firebase Env Variables: SET
✅ Users with Tokens: 0 (will increase as users open app)
```

### 3.2 Mobile App Verification

1. Build and run the app:
```bash
cd Supasoka
npx react-native run-android
```

2. Check logs for:
```
🔔 Setting up Firebase Messaging...
✅ Notification permission: granted
📱 Notification channel created: true
🔑 FCM Token obtained
✅ FCM token registered with backend
```

3. Keep app open and send test notification from AdminSupa

### 3.3 AdminSupa Verification

1. Open AdminSupa
2. Go to Notifications screen
3. Send test notification:
   - Title: "Test"
   - Message: "Testing notifications"
   - Type: "general"
4. Check response stats show users received it

## Step 4: Testing Notification Flow

### Test 1: Foreground Notification
1. Open Supasoka app (keep in foreground)
2. Send notification from AdminSupa
3. Verify notification appears in device status bar
4. Verify notification sound/vibration

### Test 2: Background Notification
1. Open Supasoka app
2. Press home button (app in background)
3. Send notification from AdminSupa
4. Verify notification in status bar
5. Tap notification
6. Verify app opens

### Test 3: App Closed Notification
1. Force close Supasoka app
2. Send notification from AdminSupa
3. Verify notification in status bar
4. Tap notification
5. Verify app opens

### Test 4: Socket.IO Real-time
1. Open Supasoka app
2. Keep app in foreground
3. Send notification from AdminSupa
4. Verify immediate notification (no delay)
5. Check logs for "Socket.IO notification"

## Troubleshooting

### Issue: "Firebase not initialized"

**Solution:**
1. Check Render.com environment variables are set correctly
2. Verify `FIREBASE_PRIVATE_KEY` has `\n` for newlines
3. Restart Render.com service
4. Check backend logs for initialization errors

### Issue: "No device tokens"

**Solution:**
1. Users need to open the app at least once
2. Check app logs for token registration
3. Verify app has notification permissions
4. Check backend endpoint: `/admin/diagnostic/device-tokens`

### Issue: Notifications not appearing in status bar

**Solution:**
1. Check Android notification permissions:
   - Settings → Apps → Supasoka → Notifications → Enable
2. Verify notification channel is created (check logs)
3. Ensure `ic_notification.png` icons exist
4. Check `google-services.json` is in correct location

### Issue: "Invalid registration token"

**Solution:**
1. User may have uninstalled/reinstalled app
2. Token expired (rare)
3. Backend automatically cleans up invalid tokens
4. User needs to open app again to re-register

## Production Checklist

Before going live:

- [ ] Firebase project created and configured
- [ ] `google-services.json` added to Android app
- [ ] Firebase credentials set in Render.com environment
- [ ] Notification icons created for all densities
- [ ] Backend diagnostic script passes all checks
- [ ] Test notifications work in all states (foreground/background/closed)
- [ ] Socket.IO real-time notifications working
- [ ] AdminSupa can send and track notifications
- [ ] Notification permissions requested on app first launch
- [ ] Error handling tested (no Firebase, no tokens, etc.)

## Monitoring

### Daily Checks
- Check notification delivery rate in AdminSupa
- Monitor backend logs for Firebase errors
- Verify user token registration rate

### Weekly Checks
- Run diagnostic script
- Review notification analytics
- Check Firebase quota usage

### Monthly Checks
- Update Firebase SDK if needed
- Review and optimize notification content
- Test notification flow end-to-end

## Security Best Practices

1. **Never commit Firebase credentials to Git**
   - Use environment variables
   - Add `google-services.json` to `.gitignore`
   - Keep service account JSON secure

2. **Rotate credentials periodically**
   - Generate new service account keys every 90 days
   - Update Render.com environment variables
   - Test after rotation

3. **Monitor Firebase usage**
   - Set up Firebase budget alerts
   - Monitor API quota usage
   - Review access logs

4. **Validate notification content**
   - Sanitize user input
   - Limit notification frequency
   - Implement rate limiting

## Support

For issues or questions:
1. Check troubleshooting guide above
2. Review `NOTIFICATION_SYSTEM_TROUBLESHOOTING.md`
3. Run diagnostic script: `node backend/scripts/test-notifications.js`
4. Check backend logs on Render.com
5. Check mobile app logs: `npx react-native log-android`

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Render.com Environment Variables](https://render.com/docs/environment-variables)
