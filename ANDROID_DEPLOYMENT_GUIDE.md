# 🚀 Supasoka Notification System - Android Deployment & Release Guide

## Overview
**Supasoka** uses **Firebase Cloud Messaging (FCM)** for push notifications that display on Android status bar **even when the app is minimized or terminated**.

### Architecture
- **Backend**: Express.js + Firebase Admin SDK → FCM HTTP API
- **Device**: Android app → Firebase Client Library → Native Android Service → Status Bar Notification
- **Real-time**: Socket.IO for online users; FCM for offline/minimized users
- **Database**: PostgreSQL stores user device tokens and notification history

---

## Prerequisites

### 1. Firebase Project Setup (Already Done on Render)
Verify these environment variables are set on Render:
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Service account private key (with newlines as `\n`)
- `FIREBASE_CLIENT_EMAIL` - Service account email

To verify on Render dashboard:
```bash
# Go to: Render Dashboard → Your Service → Environment
# Look for FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
# All three must be set and correct
```

### 2. Android Project Configuration
Verify these files are in place:
- `android/app/google-services.json` - Firebase config (auto-generated from Firebase Console)
- `android/app/src/main/java/com/supasoka/SupasokaFirebaseMessagingService.java` - Native handler
- `AndroidManifest.xml` - Permissions and service declaration

---

## Deployment Steps

### Step 1: Verify Backend (Render.com)

**1.1 Check Environment Variables**
```bash
curl https://supasoka-backend.onrender.com/health
# Should return status: ok
```

**1.2 Run Diagnostic Endpoint** (requires admin token)
```bash
# Login as admin
curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"<YOUR_PASSWORD>"}'

# Get the token from response, then:
curl https://supasoka-backend.onrender.com/api/admin/diagnostic/device-tokens \
  -H "Authorization: Bearer <TOKEN_FROM_ABOVE>"
```

**Expected response:**
```json
{
  "success": true,
  "diagnosis": {
    "totalUsers": 40,
    "usersWithTokens": 40,
    "firebaseConfigured": true,
    "firebaseInitialized": true,
    "deviceTokenColumnExists": true,
    "percentage": 100
  },
  "recommendation": "System ready to send Firebase push notifications"
}
```

**Troubleshooting:**
- `firebaseConfigured: false` → Check FIREBASE_* env vars on Render
- `firebaseInitialized: false` → Check Firebase credentials format (newlines in key)
- `usersWithTokens: 0` → Users need to open app to register tokens
- `deviceTokenColumnExists: false` → Run migration: `npm run migrate:prod` on Render

### Step 2: Verify Android App

**2.1 Ensure google-services.json is Present**
```bash
# Check file exists
ls android/app/google-services.json

# Content should look like:
# {
#   "project_info": {
#     "project_id": "supasoka-18128",
#     ...
#   }
# }
```

**2.2 Verify Native Firebase Service**
```bash
# Check service is registered in AndroidManifest.xml:
grep -A 3 "SupasokaFirebaseMessagingService" android/app/src/main/AndroidManifest.xml

# Should have:
# <service android:name="com.supasoka.SupasokaFirebaseMessagingService"
#   android:exported="false">
#   <intent-filter>
#     <action android:name="com.google.firebase.MESSAGING_EVENT" />
#   </intent-filter>
# </service>
```

**2.3 Verify Notification Channel in Java Service**
Check `android/app/src/main/java/com/supasoka/SupasokaFirebaseMessagingService.java`:
```java
// Must have:
private static final String CHANNEL_ID = "supasoka_notifications";

// In createNotificationChannel:
NotificationChannel channel = new NotificationChannel(
  CHANNEL_ID,
  "Supasoka Notifications",
  NotificationManager.IMPORTANCE_HIGH  // HIGH or MAX for status bar
);
```

### Step 3: Build & Deploy APK

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Create release build
npm run build:android:release

# Or use EAS Build (if configured):
eas build --platform android --release
```

**Check build logs for Firebase integration:**
```bash
# Should see:
# ✅ Google Play Services found
# ✅ Firebase Cloud Messaging configured
# ✅ Notification channel "supasoka_notifications" created
```

### Step 4: Test on Device

**4.1 Install APK**
```bash
adb install app-release.apk
```

**4.2 Open App and Verify Token Registration**
```bash
# Check device token is registered
adb logcat | grep "FCM Token obtained"
# Should output: 🔑 FCM Token obtained

# Check backend registration
adb logcat | grep "FCM token registered with backend"
# Should output: ✅ FCM token registered with backend
```

**4.3 Send Test Notification from AdminSupa** (or via API)
```bash
# In AdminSupa app: Dashboard → Send Notification → To All Users

# Or via API:
curl -X POST https://supasoka-backend.onrender.com/api/admin/notifications/send-realtime \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test from deployment guide",
    "type": "test"
  }'
```

**4.4 Verify Notification Appears**

| App State | Expected Behavior |
|-----------|------------------|
| **Foreground** (open) | Toast + In-app badge notification |
| **Background** (minimized) | ✅ Status bar notification with sound/vibration |
| **Quit** (killed app) | ✅ Status bar notification (tapping opens app) |

**If notification doesn't appear:**
1. Check device notification settings (not in Do Not Disturb)
2. Check app notification permission in Settings → Apps → Supasoka → Permissions
3. Check logcat for errors: `adb logcat | grep -i "firebase\|notification"`
4. Verify battery optimization not blocking notifications: Settings → Battery → Optimize → Remove Supasoka

### Step 5: Production Release Checklist

- [ ] Firebase credentials set on Render (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
- [ ] Backend health check passes: `/health` endpoint responds with `status: ok`
- [ ] Diagnostic endpoint shows: `firebaseInitialized: true`, `deviceTokenColumnExists: true`
- [ ] `google-services.json` present in Android project
- [ ] `SupasokaFirebaseMessagingService.java` has `CHANNEL_ID = "supasoka_notifications"`
- [ ] AndroidManifest.xml declares service with Firebase intent filter
- [ ] APK built with release signing key
- [ ] Tested on physical Android device (minimized, background, quit states)
- [ ] Notification appears with sound/vibration on status bar
- [ ] Tapping notification opens app and navigates correctly
- [ ] Device tokens clean up invalid ones after 24-48 hours

### Step 6: Monitor & Maintain

**Daily Checks:**
```bash
# Check for FCM errors in backend logs
curl https://supasoka-backend.onrender.com/admin/diagnostic/device-tokens \
  -H "Authorization: Bearer <TOKEN>"

# Look for:
# - firebaseInitialized: true
# - usersWithTokens increasing (more users opening app)
# - High delivery rates (pushed / usersWithTokens ≈ 95%+)
```

**Weekly Tasks:**
1. Validate new users are registering tokens (open app at least once)
2. Test send a broadcast notification and verify delivery
3. Check device token cleanup is removing invalid tokens
4. Review logs for Firebase errors (auth failures, invalid tokens, etc.)

**Monthly Tasks:**
1. Review notification analytics (delivery rates, read rates, click rates)
2. Archive old tokens that haven't been active in 90+ days
3. Update Firebase credentials if they expire
4. Test on new Android versions/devices

---

## Troubleshooting

### Issue: Notification not showing on status bar

**Cause**: Notification channel not created with HIGH importance
**Fix**: Ensure `SupasokaFirebaseMessagingService.java` has:
```java
NotificationManager.IMPORTANCE_HIGH  // Not IMPORTANCE_DEFAULT
channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
```

### Issue: "Firebase not initialized" in logs

**Cause**: FIREBASE_* env vars not set or invalid format
**Fix**:
```bash
# On Render Dashboard:
1. Environment → Add FIREBASE_PROJECT_ID
2. Environment → Add FIREBASE_PRIVATE_KEY (use \n for newlines, not actual line breaks)
3. Environment → Add FIREBASE_CLIENT_EMAIL
4. Click "Deploy" button (critical!)
5. Wait 2-3 minutes for deployment
```

### Issue: Device token not registering

**Cause**: Permission denied or network error
**Fix**:
```bash
adb logcat | grep -i "permission\|network\|firebase"
# Check that device can reach backend
adb shell ping supasoka-backend.onrender.com
```

### Issue: Firebase Admin SDK fails to initialize

**Cause**: Invalid service account credentials
**Fix**:
1. Download new service account JSON from Firebase Console
2. Extract FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
3. Replace on Render with exact values (no extra spaces, proper newline escaping)
4. Redeploy

---

## Rollback

If issues occur after deployment:

```bash
# On Render Dashboard:
1. Go to your service
2. Click "Deployments" tab
3. Find the working deployment
4. Click "..." → "Redeploy"
5. Confirm redeployment of previous version
```

---

## Support

For notification issues:
1. **Check Backend Logs**: Render Dashboard → Logs tab (look for Firebase errors)
2. **Check Device Logs**: `adb logcat | grep -i firebase`
3. **Run Diagnostic**: `/api/admin/diagnostic/device-tokens` endpoint
4. **Contact**: Email admin with logs, device model, Android version

---

## Changelog

### v2.0.0 (Firebase-Only)
- ✅ Removed Pushy dependencies (server + client)
- ✅ Firebase Admin SDK for FCM push notifications
- ✅ Legacy FCM HTTP fallback (if Admin SDK fails)
- ✅ Automatic invalid token cleanup
- ✅ Android-optimized notification channel (HIGH priority, sound, vibration)
- ✅ Status bar notifications even when app minimized/killed
- ✅ Socket.IO for real-time online users

### v1.9.0 (Previous)
- Used Pushy for push notifications
- Socket.IO for online users only
- No status bar notifications when app minimized

