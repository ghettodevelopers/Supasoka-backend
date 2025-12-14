# 📋 Supasoka v2.0.0 Release Checklist - Firebase FCM Push Notifications

## Pre-Release (Internal Testing)

### Backend Setup
- [ ] Firebase Admin SDK integrated in `backend/services/pushNotificationService.js`
- [ ] Legacy FCM fallback in place (uses `FCM_LEGACY_SERVER_KEY` if Admin SDK fails)
- [ ] Invalid token cleanup implemented (removes bad tokens from DB after FCM failures)
- [ ] `getTargetUsers()` fallback to raw SQL for Prisma schema compatibility
- [ ] Admin diagnostic endpoint updated: `/api/admin/diagnostic/device-tokens`
  - Shows: `firebaseConfigured`, `firebaseInitialized`, `deviceTokenColumnExists`
  - Recommendation: "System ready to send Firebase push notifications"
- [ ] Notification update endpoint sanitizes fields to avoid Prisma unknown-argument errors
- [ ] Prisma client regenerated: `npm run generate` ✅

### Android App Setup
- [ ] `google-services.json` present in `android/app/`
- [ ] `SupasokaFirebaseMessagingService.java` configured:
  - CHANNEL_ID = `"supasoka_notifications"`
  - NotificationManager.IMPORTANCE_HIGH for status bar
  - Sound, vibration, and badge enabled
  - `onMessageReceived()` shows notifications even in background
- [ ] AndroidManifest.xml declares service with Firebase intent filter
- [ ] `index.js` sets `setBackgroundMessageHandler()` for background/killed app states
- [ ] `services/deviceTokenService.js` requests permission and registers token with backend
- [ ] `contexts/NotificationContext.js` handles:
  - Foreground notifications via `onMessage()`
  - Background/quit state via `onNotificationOpenedApp()` and `getInitialNotification()`
  - Socket.IO fallback for online users (real-time)
- [ ] No Pushy dependencies in app (removed `pushyService.js`)

### Testing on Device
- [ ] APK built and installed on physical Android device
- [ ] Device token registration verified: `adb logcat | grep "FCM Token obtained"`
- [ ] Backend registration verified: logs show token sent to backend
- [ ] Notification sent from AdminSupa to all users
- [ ] Notification appears on status bar with:
  - ✅ Sound (or silent if muted)
  - ✅ Vibration
  - ✅ Icon and app name
  - ✅ Title and message text
- [ ] Notification test in all app states:
  - **Foreground**: Appears in-app + in status bar
  - **Background**: Appears in status bar, tapping opens app
  - **Quit/Killed**: Appears in status bar after ~1-2 seconds, tapping opens app
- [ ] Notification tap navigates correctly (e.g., `/access_granted` type → UserAccount screen)
- [ ] Push delivery rate ≥ 95% (from diagnostic endpoint)

### Documentation & Guides
- [ ] `ANDROID_DEPLOYMENT_GUIDE.md` created with:
  - Prerequisites (Firebase, Android config)
  - Step-by-step deployment instructions
  - Troubleshooting section
  - Testing procedures for all app states
  - Production checklist
  - Rollback instructions
- [ ] `backend/push-config-check.js` script for validating env vars
- [ ] `backend/test-send-push.js` script for manual push testing with TEST_DEVICE_TOKEN
- [ ] `backend/inspect-user.js` script for quick user token verification
- [ ] Release notes updated with notification feature changes

### Code Quality
- [ ] No compile errors: `npm run lint`
- [ ] Backend tests pass: `cd backend && npm test`
- [ ] APK builds without errors
- [ ] No deprecated Firebase APIs used
- [ ] Error handling for all FCM failure modes (auth, network, invalid token, quota exceeded)

---

## Pre-Production (Staging/Render.com)

### Environment Configuration
- [ ] FIREBASE_PROJECT_ID set on Render
- [ ] FIREBASE_PRIVATE_KEY set on Render (with `\n` for newlines, not literal line breaks)
- [ ] FIREBASE_CLIENT_EMAIL set on Render
- [ ] FCM_LEGACY_SERVER_KEY set on Render (optional, for fallback)
- [ ] DATABASE_URL points to PostgreSQL (confirmed working)
- [ ] JWT_SECRET and ADMIN_PASSWORD set securely
- [ ] ALLOWED_ORIGINS includes production domain + capacitor://localhost
- [ ] render.yaml updated to include new Firebase env vars
- [ ] Service redeployed after env var changes (critical!)

### Backend Validation
- [ ] Health check endpoint returns `status: ok`: `curl https://supasoka-backend.onrender.com/health`
- [ ] Admin login works: `curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login ...`
- [ ] Device token diagnostic shows:
  - `firebaseConfigured: true`
  - `firebaseInitialized: true`
  - `deviceTokenColumnExists: true`
  - `totalUsers > 0` (from testing)
- [ ] No Firebase errors in Render logs
- [ ] Push notifications send successfully to test devices
- [ ] Invalid token cleanup working (bad tokens removed from DB)

### Staging Device Testing
- [ ] APK installed on test device from production build
- [ ] Device registers token successfully
- [ ] Token appears in backend database (checked via `inspect-user.js` or DB query)
- [ ] Broadcast notification sent to all users
- [ ] Notification received on test device in all states (minimized, background, quit)
- [ ] Analytics show delivery rate ≥ 95%

### Admin SpaApp Verification
- [ ] AdminSupa connects to production backend
- [ ] Admin can send notifications via Dashboard
- [ ] Notifications reach all user devices reliably
- [ ] No 500 errors or timeouts in sending

---

## Production Release (Live on Play Store)

### Pre-Release Announcement
- [ ] Release notes prepared mentioning FCM-only notifications
- [ ] Beta testers invited to install APK and verify on their devices
- [ ] Feedback collected for 24+ hours
- [ ] Critical bugs fixed (if any)

### Play Store Submission
- [ ] APK signed with production key
- [ ] Version number incremented (e.g., 2.0.0)
- [ ] App name and description updated if needed
- [ ] Screenshots updated showing notification on status bar
- [ ] Privacy policy updated (Firebase Cloud Messaging data handling)
- [ ] APK uploaded to Google Play Console
- [ ] Rollout percentage set to 10% initially
- [ ] Monitor for crashes, ANRs, 1-star reviews

### Post-Release Monitoring
- [ ] Firebase crash dashboard monitored for new errors
- [ ] Render logs monitored for FCM failures
- [ ] User feedback monitored for notification delivery issues
- [ ] Device token registration rate increasing (new installs)
- [ ] Push delivery metrics tracked (target ≥ 95%)
- [ ] If critical issue found:
  - [ ] Halt rollout (set to 0%)
  - [ ] Investigate via logs and diagnostic endpoint
  - [ ] Fix issue
  - [ ] Re-build and test APK
  - [ ] Resubmit to Play Store or do rollback

### 48-Hour Stability Gate
- [ ] No critical crashes reported
- [ ] Delivery rate stable at ≥ 95%
- [ ] No Firebase auth/quota errors
- [ ] Performance acceptable (no slow notification sends)
- [ ] **Decision: Increase rollout % to 50%, then 100%**

---

## Post-Release (Ongoing)

### Daily (First Week)
- [ ] Monitor crash rates (Firebase Crashlytics)
- [ ] Check Render logs for errors: `https://dashboard.render.com/services/.../logs`
- [ ] Verify push delivery metrics in diagnostic endpoint
- [ ] Respond to user issues immediately

### Weekly (Ongoing)
- [ ] Validate device token registration rate (should be >90% of active users)
- [ ] Test send a broadcast notification to all users
- [ ] Review delivery rates and clean up stale tokens if <90%
- [ ] Check Firebase Admin SDK for security updates
- [ ] Update dependencies if critical patches released

### Monthly
- [ ] Archive old notifications (cleanup DB)
- [ ] Review notification analytics (open rates, click rates, types)
- [ ] Verify Firebase service account credentials haven't expired
- [ ] Update docs if needed
- [ ] Plan feature improvements (segmentation, scheduling, A/B testing)

---

## Rollback Plan (If Critical Issue)

1. **Immediate**: Set Play Store rollout to 0% (pause distribution)
2. **Investigate**: Check Render logs and Firebase error dashboard
3. **If Firebase issue**:
   - Verify env vars (FIREBASE_* correct and deployed)
   - Check Firebase credentials haven't expired
   - Run `/admin/diagnostic/device-tokens` endpoint
4. **If Android app issue**:
   - Check `adb logcat` from test device
   - Verify `SupasokaFirebaseMessagingService` is running
   - Check notification channel permissions
5. **Rollback steps**:
   - On Render: Click "Deployments" → Previous working version → "Redeploy"
   - On Play Store: Submit previous APK as patch or roll out older version
6. **Post-Rollback**: Investigate root cause and re-test thoroughly before next release

---

## Sign-Off

- [ ] Product Owner: ______________________ Date: _______
- [ ] Backend Developer: ______________________ Date: _______
- [ ] Android Developer: ______________________ Date: _______
- [ ] QA Tester: ______________________ Date: _______

---

## Release Notes for Users

```
🎉 Supasoka v2.0.0 - Better Notifications

✨ What's New:
- Push notifications now work even when the app is minimized or closed
- Notifications appear on your phone's status bar with sound and vibration
- Faster, more reliable delivery using Firebase Cloud Messaging

🔧 Technical Details:
- Updated to Firebase Cloud Messaging (FCM) for push notifications
- Improved device token management and registration
- Better error handling and automatic cleanup of invalid tokens
- Android-optimized notification channel with high priority

📱 How to Use:
1. Update app from Google Play Store
2. Open Supasoka and grant notification permission when prompted
3. Enjoy instant notifications on your status bar!

💬 Feedback:
If you don't receive notifications, check:
1. Notification permission in Settings → Apps → Supasoka → Permissions
2. Battery optimization isn't blocking the app
3. Your device isn't in Do Not Disturb mode
4. Internet connection is stable

Contact us if issues persist!
```

