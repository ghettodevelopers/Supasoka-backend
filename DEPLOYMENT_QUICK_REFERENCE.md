# 🚀 DEPLOYMENT QUICK REFERENCE

## Pre-Deployment Checklist (5 min)

```bash
# 1. Verify code changes compile
cd backend
npm run lint
npm run generate  # Regenerate Prisma client

cd ..
npm run lint
# Fix any lint errors

# 2. Verify Firebase config locally
node backend/push-config-check.js
# Should show: ✅ Firebase Admin SDK initialized
```

## Step 1: Deploy Backend to Render (2 min + 2 min wait)

```bash
# 1. Ensure all code is committed
git add -A
git commit -m "fix: Firebase notification system with status bar support"

# 2. Push to trigger Render auto-deploy
git push origin main

# 3. Monitor Render deployment
# → Go to: https://dashboard.render.com/services/supasoka-backend/deployments
# → Wait for "Live" status (green checkmark)
# → Takes ~2-3 minutes

# 4. Verify deployment successful
sleep 180  # Wait for deploy
curl https://supasoka-backend.onrender.com/health
# Should return: {"status":"ok"}
```

## Step 2: Verify Firebase on Render (1 min)

```bash
# Run diagnostic endpoint (replace TOKEN with actual admin JWT)
TOKEN="your_admin_jwt_token_here"
curl https://supasoka-backend.onrender.com/api/admin/diagnostic/device-tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected output:
# {
#   "firebaseConfigured": true,
#   "firebaseInitialized": true,
#   "deviceTokenColumnExists": true,
#   "usersWithDeviceTokens": 5,
#   "recommendations": []
# }
```

## Step 3: Build Android APK (5 min)

```bash
# 1. Clean build
rm -rf android/build android/app/build

# 2. Build APK
npm run build:android:release
# Creates: android/app/build/outputs/apk/release/app-release.apk

# 3. Wait for completion (watch for ":app:assembleRelease" success)
```

## Step 4: Deploy to Device (3 min)

```bash
# 1. Connect Android device via USB
adb devices
# Should show your device

# 2. Install APK
adb install android/app/build/outputs/apk/release/app-release.apk

# 3. Check logs
adb logcat | grep -i "FCM\|Firebase\|token"
# Wait for: "🔑 FCM Token obtained" (within 10 seconds)
```

## Step 5: Test Notifications (2 min)

```bash
# Option A: Use AdminSupa app
# 1. Open AdminSupa app on different phone
# 2. Dashboard → Send Notification
# 3. Title: "Test"
# 4. Message: "Testing Firebase FCM"
# 5. Select: "All Users"
# 6. Click "Send"
# 7. Check test device - should see status bar notification

# Option B: Manual API call
TOKEN="your_admin_jwt_token_here"
PAYLOAD=$(cat <<'EOF'
{
  "title": "Firebase Test",
  "message": "If you see this, FCM is working!",
  "type": "general",
  "sendPush": true
}
EOF
)

curl -X POST https://supasoka-backend.onrender.com/api/admin/notifications/send-realtime \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

## Step 6: Test All States (2 min)

| Test | Action | Expected |
|------|--------|----------|
| **Foreground** | App open, receive notification | Appears in toast + status bar |
| **Background** | Minimize app (press home), send notification | Status bar appears with sound |
| **Quit** | Kill app (force-stop), send notification | Status bar appears when app opens or ~2 sec |

```bash
# To force-stop app for testing quit state:
adb shell am force-stop com.supasoka

# To clear all notifications during testing:
adb shell pm clear-package-cache
# Or through UI: Settings → Apps → Supasoka → Clear Cache
```

## Post-Deployment Monitoring (Weekly)

```bash
# 1. Check Render logs for errors
# Dashboard → Logs tab → Search for "firebase", "error"

# 2. Monitor token registration
curl https://supasoka-backend.onrender.com/api/admin/diagnostic/device-tokens \
  -H "Authorization: Bearer $TOKEN" | jq '.usersWithDeviceTokens'
# Should be growing (>90% of active users)

# 3. Test broadcast notification weekly
# Send from AdminSupa to verify delivery still working

# 4. Monitor Firebase quotas (free tier includes 10M/month)
# → https://console.firebase.google.com → Project → Quotas
```

## Troubleshooting Commands

```bash
# Check app logs for errors
adb logcat -c  # Clear logs
adb logcat | grep -i "supasoka\|firebase"

# Check if Firebase messaging is available
adb shell getprop | grep -i firebase

# Verify notification permissions
adb shell pm get-app-ops com.supasoka | grep NOTIFICATION

# Get device info
adb shell getprop ro.build.version.release  # Android version
adb shell getprop ro.build.product  # Device model

# Force token refresh (stops/starts app)
adb shell am force-stop com.supasoka
adb shell am start com.supasoka/.MainActivity

# Check SharedPreferences for stored token
adb shell run-as com.supasoka cat /data/data/com.supasoka/shared_prefs/com.google.firebase.messaging.prefs.xml
```

## Environment Variables Checklist (Render)

✅ Must be set in Render Dashboard → Environment Variables:
```
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@<project-id>.iam.gserviceaccount.com
DATABASE_URL=<your-postgresql-url>
JWT_SECRET=<your-jwt-secret>
```

⚠️ IMPORTANT: FIREBASE_PRIVATE_KEY uses `\n` (escaped newlines), not literal newlines!

## Rollback (If Something Goes Wrong)

```bash
# Option 1: Redeploy previous version (Render)
# 1. https://dashboard.render.com/services/supasoka-backend/deployments
# 2. Find previous green deployment
# 3. Click "..." → "Redeploy"
# 4. Wait 2-3 minutes

# Option 2: Revert code and push
git revert HEAD
git push origin main
# Wait for new deployment

# Option 3: Downgrade APK
# 1. Google Play Console → Your App → Releases
# 2. Create rollback release to previous APK
# Or set rollout % to 0% to halt new installs
```

## Success Indicators ✅

After following this guide, you should see:
1. ✅ Backend deployment shows "Live" on Render
2. ✅ Health check returns `{"status":"ok"}`
3. ✅ Diagnostic shows `firebaseInitialized: true`
4. ✅ Device shows FCM token in logs within 10 seconds
5. ✅ Notifications appear on status bar (all app states)
6. ✅ Token registration grows to >90% of users
7. ✅ Delivery rate stays ≥95%

---

## Estimated Total Time: **20-25 minutes**
- Backend deploy: 5 minutes (1 min + 2 min wait + 2 min verification)
- APK build: 5 minutes
- Installation & testing: 5 minutes
- Monitoring setup: 2-3 minutes
- Buffer for troubleshooting: 5 minutes

**You're ready! Let's go! 🚀**

