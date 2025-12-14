# 📲 Supasoka v2.0.0 - Firebase Cloud Messaging Release

## Overview

**Supasoka** now delivers **reliable push notifications** that display on Android status bar **even when the app is minimized or completely closed**. This release migrates from Pushy to **Firebase Cloud Messaging (FCM)**, Google's official push notification service.

### Key Features
✅ **Status Bar Notifications** - Shows even when app is minimized or killed  
✅ **Android Optimized** - High priority channel with sound, vibration, badge  
✅ **Reliable Delivery** - Firebase Admin SDK + legacy FCM HTTP fallback  
✅ **Smart Token Management** - Automatic cleanup of invalid tokens  
✅ **Real-time + Push** - Socket.IO for online users, FCM for offline/minimized  
✅ **Production Ready** - Comprehensive testing, monitoring, and rollback procedures  

---

## What Changed

### Backend
| Component | Before | After |
|-----------|--------|-------|
| **Push Service** | Pushy REST API | Firebase Admin SDK (FCM HTTP API) |
| **Token Storage** | `deviceToken` column | PostgreSQL `device_token` field |
| **Fallback** | None | Legacy FCM HTTP (if Admin SDK fails) |
| **Token Cleanup** | Manual | Automatic (after FCM failures) |
| **Diagnostics** | Limited | Full `/admin/diagnostic/device-tokens` endpoint |

### Android App
| Component | Before | After |
|-----------|--------|-------|
| **Push Library** | Pushy React Native | Firebase Cloud Messaging (React Native Firebase) |
| **Native Handler** | PushyService | SupasokaFirebaseMessagingService.java |
| **Token Registration** | Pushy.register() | firebase.messaging().getToken() |
| **Foreground Handler** | Pushy listener | firebase.messaging().onMessage() |
| **Background Handler** | Pushy background | firebase.messaging().setBackgroundMessageHandler() |
| **Quit State** | Not supported | firebase.messaging().getInitialNotification() |
| **Notification Channel** | Default | `supasoka_notifications` (HIGH priority) |

### Configuration
| Setting | Before | After |
|---------|--------|-------|
| **Render Env Var** | `PUSHY_SECRET_API_KEY` | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` |
| **Client Config** | `pushy-react-native` | `@react-native-firebase/messaging` |
| **Backend Package** | `pushy` | `firebase-admin` |

---

## Deployment Workflow

### Step 1: Verify Render Environment ✅ (Already Done)
```bash
# On Render Dashboard → Your Service → Environment
# Confirm these are SET:
- FIREBASE_PROJECT_ID
- FIREBASE_PRIVATE_KEY (with \n for newlines)
- FIREBASE_CLIENT_EMAIL
```

### Step 2: Build & Test Android APK

```bash
# Clone/pull latest code
git pull origin main

# Build APK
npm run build:android:release

# Install on test device
adb install app-release.apk
```

### Step 3: Test on Device

**Device should register FCM token:**
```bash
adb logcat | grep "FCM Token obtained"
# Should see: 🔑 FCM Token obtained
```

**Send test notification from AdminSupa:**
- Open AdminSupa app
- Dashboard → Send Notification
- Select "All Users"
- Send a test message

**Verify notification appears in all states:**
| State | Action | Expected |
|-------|--------|----------|
| **App Open** | Send notification | Toast + Status bar |
| **App Background** | Minimize app, send notification | Status bar with sound/vibration |
| **App Closed** | Kill app, send notification | Status bar appears in ~1-2 seconds |

### Step 4: Monitor Production

After deploying to Play Store:
```bash
# Check daily for first week:
1. Render logs for FCM errors
2. Firebase Crashlytics for app crashes
3. Device token registration rate (should be >90% of active users)
4. Push delivery rate (target ≥ 95%)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ AdminSupa App (Sends Notifications)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ (POST /api/admin/notifications/send-realtime)
┌─────────────────────────────────────────────────────────────┐
│ Backend (Express.js + Node.js)                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Create notification in PostgreSQL                         │
│ 2. Broadcast to Socket.IO (online users)                    │
│ 3. Call Firebase Admin SDK → FCM                            │
│    └─ Fallback: Legacy FCM HTTP if Admin SDK fails          │
│ 4. Store for offline users (polling when they come online)  │
│ 5. Clean invalid tokens from database                       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─ Socket.IO Channel (Real-time)
               │  └─→ Online users get in-app notification
               │
               └─ FCM (Push via Google)
                  └─→ Google servers store notification
                      └─→ Delivers to Android devices
                          └─→ Native Service displays on status bar
                              ├─ Sound (if enabled)
                              ├─ Vibration
                              ├─ Badge count
                              └─ Can be dismissed/tapped

┌─────────────────────────────────────────────────────────────┐
│ User Device (Android Phone)                                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Firebase Client (manages token + receives messages)      │
│ │  ├─ Registers FCM token at startup                        │
│ │  ├─ Refreshes token periodically                          │
│ │  └─ Syncs with backend (/users/device-token endpoint)     │
│ │                                                            │
│ ├─ App State Listeners                                       │
│ │  ├─ Foreground: onMessage() → Show in-app                │
│ │  ├─ Background: setBackgroundMessageHandler() → Status bar│
│ │  └─ Quit: Native Service + getInitialNotification()       │
│ │                                                            │
│ └─ SupasokaFirebaseMessagingService (Native Java)           │
│    ├─ Receives FCM message (even when app killed)           │
│    ├─ Builds notification with IMPORTANCE_HIGH              │
│    ├─ Posts to Android NotificationManager                  │
│    └─ Displays on status bar with sound/vibration           │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Modified

### Backend
- `backend/services/pushNotificationService.js` - Firebase Admin SDK + legacy fallback + token cleanup
- `backend/services/notificationHelper.js` - Fallback user query for Prisma schema compatibility
- `backend/routes/admin.js` - Updated diagnostic endpoint
- `backend/routes/notifications.js` - Field sanitization for updates
- `backend/render.yaml` - Replaced PUSHY_SECRET_API_KEY with Firebase env vars
- `backend/push-config-check.js` - (NEW) Configuration validation script
- `backend/test-send-push.js` - (NEW) Manual push test script
- `backend/inspect-user.js` - (NEW) Quick user token lookup
- `backend/package.json` - `firebase-admin` already dependency

### Android App
- `android/app/google-services.json` - Firebase config (from Firebase Console)
- `android/app/src/main/java/com/supasoka/SupasokaFirebaseMessagingService.java` - Native FCM handler
- `android/app/src/main/AndroidManifest.xml` - Declares Firebase service
- `services/deviceTokenService.js` - Uses `@react-native-firebase/messaging`
- `contexts/NotificationContext.js` - Firebase foreground + background handlers
- `index.js` - Sets background message handler
- Removed: `services/pushyService.js` ❌

### Documentation
- `ANDROID_DEPLOYMENT_GUIDE.md` - (NEW) Complete deployment guide
- `RELEASE_CHECKLIST.md` - (NEW) Pre/post-release procedures
- `remove-pushy.sh` - (NEW) Cleanup script

---

## Troubleshooting

### Notification Not Appearing

1. **Check device permissions:**
   ```bash
   Settings → Apps → Supasoka → Permissions → Notifications (must be ON)
   ```

2. **Check Do Not Disturb:**
   ```bash
   Settings → Sound & Vibration → Do Not Disturb (must be OFF)
   ```

3. **Check battery optimization:**
   ```bash
   Settings → Battery → Battery Optimization → Remove Supasoka from optimization
   ```

4. **Check backend logs:**
   ```bash
   curl https://supasoka-backend.onrender.com/api/admin/diagnostic/device-tokens \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
   # Look for: firebaseInitialized: true, usersWithTokens > 0
   ```

5. **Check device logs:**
   ```bash
   adb logcat | grep -i "firebase\|notification"
   ```

### Firebase Not Initialized

**Cause**: Environment variables not set correctly on Render

**Fix**:
1. Render Dashboard → Your Service → Environment
2. Verify `FIREBASE_PRIVATE_KEY` uses `\n` (not literal newlines)
3. Click "Deploy" (redeploy is necessary!)
4. Wait 2-3 minutes
5. Check logs: Should see "✅ Firebase Admin SDK initialized"

### Invalid Token Error

**Cause**: Old/expired FCM tokens in database

**Fix**: Automatic! Invalid tokens are removed after FCM rejects them. Manual cleanup:
```sql
-- Reset all tokens (users will re-register on app open)
UPDATE users SET device_token = NULL WHERE device_token IS NOT NULL;
```

---

## Performance Metrics

### Delivery Rate Target
```
✅ 95%+ of notifications successfully delivered
├─ Online users: 99%+ (via Socket.IO)
├─ Offline users: 95%+ (via FCM push)
└─ Failed: <5% (invalid/expired tokens auto-cleaned)
```

### Latency Target
```
├─ Admin sends notification
├─ Backend creates DB record: <100ms
├─ Socket.IO emit (online users): <200ms
├─ FCM send begins: <500ms
├─ FCM delivers to device: 1-5 seconds (depends on network)
└─ Total end-to-end: 2-10 seconds
```

### Token Coverage Target
```
├─ New user installs app: ~5 seconds to register token
├─ Active users (daily opens): >90% with valid tokens
├─ Inactive users: Tokens cleaned up after 48-72 hours
└─ Re-registration: Automatic on app open + on token refresh
```

---

## Security & Privacy

### Firebase Data Handling
- **Device tokens** stored in PostgreSQL (encrypted at rest if using Render Postgres encryption)
- **Messages in transit** encrypted via HTTPS/TLS
- **No personal data** in notification payload (only title/message/type)
- **Tokens auto-cleaned** if invalid (prevents accumulation of stale tokens)

### Environment Variables (Render)
- `FIREBASE_PRIVATE_KEY` - Secret (keep private!)
- `FIREBASE_PROJECT_ID` - Public (project identifier)
- `FIREBASE_CLIENT_EMAIL` - Public (service account email)
- **Never** commit credentials to Git

### User Privacy
- Users can disable notifications in app settings
- Notification permission prompt on first app open (Android 13+)
- Users can mute notifications per-channel in OS settings

---

## Support & Monitoring

### Daily Checks
```bash
# Health check
curl https://supasoka-backend.onrender.com/health

# Diagnostic (requires admin token)
curl https://supasoka-backend.onrender.com/api/admin/diagnostic/device-tokens \
  -H "Authorization: Bearer <TOKEN>"
```

### Weekly Tasks
1. Test send a notification to all users
2. Verify delivery rate ≥95%
3. Check for Firebase errors in Render logs
4. Monitor device token registration growth

### Monthly Tasks
1. Review notification analytics
2. Clean up archived old notifications
3. Check Firebase Admin SDK version for updates
4. Update docs if needed

---

## Rollback (If Needed)

```bash
# On Render Dashboard:
1. Services → Your Service
2. Deployments tab
3. Find last working deployment
4. Click "..." → "Redeploy"

# On Google Play Store (if released):
1. Google Play Console → Your App
2. Release Management → Releases
3. Create a rollback to previous APK
4. Or set rollout % to 0% while investigating
```

---

## Version History

### v2.0.0 (This Release) 🎉
- ✅ Firebase Cloud Messaging (FCM) for push notifications
- ✅ Status bar notifications even when app minimized/killed
- ✅ Removed Pushy dependencies
- ✅ Automatic invalid token cleanup
- ✅ Legacy FCM HTTP fallback
- ✅ Comprehensive deployment guide
- ✅ Release checklist and monitoring procedures

### v1.9.0 (Previous)
- Used Pushy for push notifications
- Socket.IO for online users only
- No status bar when app minimized

---

## Questions?

For deployment issues, check:
1. **Deployment Guide**: `ANDROID_DEPLOYMENT_GUIDE.md`
2. **Release Checklist**: `RELEASE_CHECKLIST.md`
3. **Logs**: `https://dashboard.render.com/services/.../logs`
4. **Backend Health**: `curl https://supasoka-backend.onrender.com/health`
5. **Firebase Console**: `https://console.firebase.google.com`

Good luck! 🚀

