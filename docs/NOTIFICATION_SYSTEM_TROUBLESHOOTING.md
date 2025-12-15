# Notification System Troubleshooting Guide

## Overview
The Supasoka notification system uses multiple delivery methods to ensure reliable notification delivery:
1. **Firebase Cloud Messaging (FCM)** - Push notifications to user devices
2. **Socket.IO** - Real-time notifications for online users
3. **Database Storage** - Persistent notification history

## Architecture

### Backend (Render.com)
- **Push Notification Service** (`services/pushNotificationService.js`)
  - Firebase Admin SDK for FCM
  - Legacy FCM fallback support
  - Token validation and cleanup
- **Admin Routes** (`routes/admin.js`)
  - `/admin/notifications/send-realtime` - Send notifications
  - `/admin/diagnostic/device-tokens` - Check token status
  - `/admin/notifications/stats` - Get notification statistics

### Mobile App (Supasoka)
- **Notification Context** (`contexts/NotificationContext.js`)
  - Firebase Messaging integration
  - Local notification display (react-native-push-notification)
  - Socket.IO real-time listener
- **Device Token Service** (`services/deviceTokenService.js`)
  - FCM token registration
  - Token refresh handling
  - Backend synchronization

### Admin Panel (AdminSupa)
- **Notification Screen** (`screens/NotificationsScreen.js`)
  - Send notifications to all users or specific users
  - View notification history
  - Track delivery statistics
- **Notification Service** (`services/notificationService.js`)
  - API integration for sending notifications

## Common Issues and Solutions

### Issue 1: Notifications Not Received by Users

#### Symptoms:
- Admin sends notification from AdminSupa
- Notification shows as sent in admin panel
- Users don't receive notification in status bar
- No notification sound/vibration

#### Diagnosis Steps:

1. **Check Firebase Configuration (Backend)**
   ```bash
   cd backend
   node scripts/test-notifications.js
   ```
   
   Look for:
   - ✅ Firebase Initialized: YES
   - ✅ Firebase Env Variables: SET
   - ✅ Users with Tokens: > 0

2. **Check Device Token Registration (Mobile App)**
   - Open Supasoka app
   - Check logs for: "🔑 FCM Token obtained"
   - Check logs for: "✅ FCM token registered with backend"

3. **Check Backend Logs (Render.com)**
   - Go to Render.com dashboard
   - Open Supasoka backend service
   - Check logs for:
     ```
     📱 Sending FCM notification to X devices
     ✅ FCM notification sent successfully
     Success: X/X
     ```

#### Solutions:

**Solution A: Firebase Not Configured**
```bash
# On Render.com, set environment variables:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

**Solution B: No Device Tokens**
- Users need to open the Supasoka app at least once
- App registers FCM token on first launch
- Token is sent to backend automatically
- Check: `/admin/diagnostic/device-tokens` endpoint

**Solution C: Invalid Tokens**
- Old/invalid tokens are automatically cleaned up
- Users may need to reinstall app
- Check backend logs for "invalid-registration-token" errors

### Issue 2: Notifications Received but Not Displayed in Status Bar

#### Symptoms:
- Backend logs show successful send
- App receives notification (check logs)
- No notification appears in device status bar

#### Solutions:

**Solution A: Android Notification Permissions**
```javascript
// Check in app logs for:
"📱 Notification permission: granted"

// If denied, user needs to:
1. Go to Settings > Apps > Supasoka
2. Enable Notifications
3. Restart app
```

**Solution B: Notification Channel Not Created**
```javascript
// Check logs for:
"📱 Notification channel created: true"

// If false, the channel wasn't created properly
// Solution: Clear app data and restart
```

**Solution C: Foreground Notification Not Displayed**
The app now uses `react-native-push-notification` to display foreground notifications.
Check that the package is properly installed:
```bash
cd Supasoka
npm install react-native-push-notification
cd android && ./gradlew clean
cd .. && npx react-native run-android
```

### Issue 3: Socket.IO Notifications Not Working

#### Symptoms:
- Firebase notifications work
- Real-time updates don't work
- Users don't receive immediate notifications

#### Diagnosis:
```javascript
// Check app logs for:
"✅ Socket connected"
"📱 Joined user room: user-{id}"

// Check backend logs for:
"📢 Broadcasted notification to X connected sockets"
```

#### Solutions:

**Solution A: Socket Connection Failed**
```javascript
// App tries multiple URLs in order:
1. https://supasoka-backend.onrender.com
2. http://10.0.2.2:10000 (Android emulator)
3. http://localhost:10000

// Check which URL connected successfully
```

**Solution B: User Not in Room**
```javascript
// Backend emits to two targets:
1. Broadcast to all sockets (io.emit)
2. Specific user rooms (io.to(`user-${userId}`))

// Check backend logs for:
"📡 X users in their rooms, Y total connected"
```

### Issue 4: AdminSupa Shows Notification Sent but Backend Doesn't Process

#### Symptoms:
- AdminSupa shows success message
- Backend logs don't show notification processing
- No users receive notification

#### Solutions:

**Solution A: Check API Endpoint**
```javascript
// AdminSupa should call:
POST /admin/notifications/send-realtime

// Check AdminSupa logs for:
"✅ Notification sent successfully"

// Check backend logs for:
"📬 Admin {email} sending notification: {title}"
```

**Solution B: Authentication Issue**
```javascript
// Ensure admin is authenticated
// Check for JWT token in request headers
// Backend should log: "Admin authenticated"
```

## Testing Notifications

### Test 1: Backend Diagnostic
```bash
cd backend
node scripts/test-notifications.js
```

Expected output:
```
✅ Firebase Initialized: YES
✅ Users with Tokens: 5
✅ Notification created
✅ Firebase Push Notification: SUCCESS
```

### Test 2: Send Test Notification from AdminSupa
1. Open AdminSupa
2. Go to Notifications screen
3. Click "Send" button
4. Fill in:
   - Title: "Test Notification"
   - Message: "Testing notification system"
   - Type: "general"
5. Click "Send Notification"
6. Check response stats:
   - Total Users: X
   - Online: Y
   - Push Notifications Sent: Z

### Test 3: Verify User Receipt
1. Open Supasoka app on test device
2. Keep app in foreground
3. Send notification from AdminSupa
4. Check app logs for:
   ```
   📱 Foreground notification received
   ✅ Local notification displayed: Test Notification
   ```
5. Check device status bar for notification

### Test 4: Background Notification
1. Open Supasoka app
2. Press home button (app in background)
3. Send notification from AdminSupa
4. Check device status bar for notification
5. Tap notification
6. App should open and navigate appropriately

## Monitoring and Maintenance

### Regular Checks

**Daily:**
- Check notification delivery rate in AdminSupa
- Monitor backend logs for errors
- Verify Firebase quota usage

**Weekly:**
- Run diagnostic script
- Check device token coverage
- Clean up invalid tokens (automatic)

**Monthly:**
- Review notification analytics
- Update Firebase credentials if needed
- Test notification flow end-to-end

### Key Metrics

**Backend:**
- Total users with tokens
- Token coverage percentage
- Notification success rate
- Firebase API errors

**Mobile App:**
- Token registration success rate
- Notification display rate
- User engagement with notifications

**AdminSupa:**
- Notifications sent per day
- Average delivery time
- User targeting accuracy

## Firebase Configuration

### Required Environment Variables (Render.com)

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# Optional: Legacy FCM (Fallback)
FCM_LEGACY_SERVER_KEY=your-legacy-server-key
```

### Getting Firebase Credentials

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Download JSON file
6. Extract values and set as environment variables on Render.com

### Firebase Service Account JSON (Alternative)

Instead of environment variables, you can place `firebase-service-account.json` in the backend directory:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Mobile App Configuration

### Android Notification Icons

Place notification icons in:
```
android/app/src/main/res/
  ├── drawable-mdpi/ic_notification.png
  ├── drawable-hdpi/ic_notification.png
  ├── drawable-xhdpi/ic_notification.png
  ├── drawable-xxhdpi/ic_notification.png
  └── drawable-xxxhdpi/ic_notification.png
```

### AndroidManifest.xml

Ensure these permissions are set:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

## Support and Debugging

### Enable Verbose Logging

**Backend:**
```javascript
// In backend/.env
LOG_LEVEL=debug
```

**Mobile App:**
```javascript
// In App.js, add:
console.log('🔍 Debug mode enabled');
```

### Common Error Messages

**"Firebase not initialized"**
- Check Firebase environment variables
- Verify firebase-service-account.json exists
- Check backend logs for initialization errors

**"No device tokens"**
- Users haven't opened the app yet
- Token registration failed
- Check app permissions

**"Network request failed"**
- Backend not accessible
- Check Render.com service status
- Verify API endpoints

**"Invalid registration token"**
- User uninstalled/reinstalled app
- Token expired
- Automatic cleanup will remove it

## Contact and Support

For additional help:
1. Check backend logs on Render.com
2. Check mobile app logs via `npx react-native log-android`
3. Run diagnostic script: `node backend/scripts/test-notifications.js`
4. Review this troubleshooting guide

## Changelog

### v1.0.0 (Current)
- Firebase Cloud Messaging integration
- Socket.IO real-time notifications
- Local notification display with react-native-push-notification
- Comprehensive error handling and logging
- Automatic token cleanup
- Multi-delivery method support
