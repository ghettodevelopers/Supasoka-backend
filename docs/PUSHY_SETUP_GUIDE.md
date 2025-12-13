# 🚀 Pushy.me Setup Guide for Supasoka

## 📋 Overview

Pushy.me is a reliable push notification service that delivers notifications to Android and iOS devices, even when the app is closed. This guide will help you set up Pushy for the Supasoka app.

## 🎯 Why Pushy.me?

- ✅ **Works when app is killed** - Unlike WebSockets, Pushy delivers to closed apps
- ✅ **24-hour message queuing** - Offline users get notifications when they come online
- ✅ **High delivery rate** - 99%+ delivery success
- ✅ **Simple integration** - Easy to implement and maintain
- ✅ **Free tier available** - Up to 1,000 devices free
- ✅ **No Google Play Services required** - Works on all Android devices

## 🔧 Step-by-Step Setup

### Step 1: Create Pushy Account

1. Go to https://pushy.me
2. Click **"Sign Up"** in the top right
3. Create account with email and password
4. Verify your email address

### Step 2: Create a New App

1. After logging in, click **"Create App"**
2. Enter app details:
   - **App Name**: `Supasoka`
   - **Platform**: Select `Android` (and iOS if needed)
3. Click **"Create App"**

### Step 3: Get Your API Keys

After creating the app, you'll see two important keys:

#### 1. Secret API Key (Backend)
```
Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```
- **Used by**: Backend server
- **Purpose**: Send push notifications
- **Keep secret**: Never expose in mobile app

#### 2. App ID (Mobile App)
```
Example: 5f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c
```
- **Used by**: Mobile app (Android/iOS)
- **Purpose**: Register devices for push notifications
- **Can be public**: Safe to include in app code

### Step 4: Configure Backend

1. Open your backend `.env` file:
```bash
cd /path/to/Supasoka/backend
nano .env
```

2. Add your Pushy Secret API Key:
```env
# Pushy.me Configuration
PUSHY_SECRET_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

3. Save and restart your backend server:
```bash
# If using PM2
pm2 restart supasoka-backend

# If running directly
npm run start
```

### Step 5: Verify Backend Configuration

Test that the backend can send notifications:

```bash
# Check backend logs
tail -f backend/logs/app.log | grep "Pushy"

# You should see:
# ✅ Pushy API initialized with key: a1b2c3...
```

### Step 6: Configure Mobile App (Already Done)

The Supasoka mobile app is already configured with Pushy. The configuration is in:

- `package.json` - Pushy dependency
- `contexts/NotificationContext.js` - Pushy initialization
- `services/userService.js` - Device token registration

**No changes needed** - the app will automatically:
1. Generate a device token on first launch
2. Register the token with your backend
3. Receive push notifications via Pushy

## 🧪 Testing Push Notifications

### Test 1: Send Test Notification from Pushy Dashboard

1. Go to Pushy dashboard: https://dashboard.pushy.me
2. Select your **Supasoka** app
3. Click **"Send Notification"** tab
4. Fill in test notification:
   ```json
   {
     "title": "Test Notification",
     "message": "This is a test from Pushy dashboard",
     "data": {
       "type": "test"
     }
   }
   ```
5. Click **"Send to All Devices"**

**Expected Result:**
- All registered devices receive the notification
- Notification appears in status bar
- You see delivery statistics in dashboard

### Test 2: Send from Backend API

Use curl to test the backend endpoint:

```bash
# Get admin auth token first
TOKEN=$(curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}' \
  | jq -r '.token')

# Send test notification
curl -X POST https://supasoka-backend.onrender.com/admin/notifications/send-realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test from Backend",
    "message": "Testing push notification system",
    "type": "general",
    "priority": "high"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 40,
    "onlineUsers": 1,
    "offlineUsers": 39,
    "pushSent": 40,
    "pushFailed": 0,
    "usersWithTokens": 40
  },
  "message": "Notification sent to 40 users (1 online, 39 offline, 40 push sent)"
}
```

### Test 3: Verify Device Registration

Check that devices are registering with Pushy:

1. Open Pushy dashboard
2. Go to **"Devices"** tab
3. You should see all registered devices with:
   - Device token
   - Platform (Android)
   - Last seen timestamp
   - Registration date

## 📊 Monitoring & Analytics

### Pushy Dashboard Metrics

The dashboard shows:
- **Total Devices**: Number of registered devices
- **Active Devices**: Devices active in last 30 days
- **Notifications Sent**: Total push notifications sent
- **Delivery Rate**: Percentage of successful deliveries
- **Failed Deliveries**: Number of failed notifications

### Backend Logs

Monitor push notification activity:

```bash
# Watch push notification logs
tail -f backend/logs/app.log | grep "Push notification"

# Example output:
📱 Preparing to send push notification to 40 devices
   Title: "Habari za Supasoka"
   Message: "Tunayo vituo vipya!"
   Type: general
   Priority: high
🚀 Sending push notification via Pushy to 40 devices...
✅ Push notification sent successfully!
   Devices: 40
   Results: {"success":true,"id":"abc123"}
```

## 🔍 Troubleshooting

### Issue: "PUSHY_SECRET_API_KEY not configured"

**Symptoms:**
- Backend logs show: `⚠️ PUSHY_SECRET_API_KEY not configured`
- Push notifications show as "mock mode"
- Users don't receive notifications

**Solution:**
1. Add API key to `.env` file
2. Restart backend server
3. Verify key is loaded: `echo $PUSHY_SECRET_API_KEY`

### Issue: "No devices registered"

**Symptoms:**
- Pushy dashboard shows 0 devices
- Database shows users without device tokens

**Solution:**
1. Users need to open the app at least once
2. Check app has internet connection
3. Verify device token registration in logs:
   ```
   📱 Generated new device token: FCM_...
   ✅ Device token registered with backend
   ```

### Issue: "Push notifications not delivered"

**Symptoms:**
- Backend says "push sent" but users don't receive
- Pushy dashboard shows failed deliveries

**Possible Causes:**
1. **Invalid device tokens** - Users uninstalled/reinstalled app
2. **Network issues** - Device has no internet
3. **Notification permissions** - User disabled notifications
4. **Battery optimization** - Android killed background services

**Solutions:**
1. Check Pushy dashboard for delivery errors
2. Verify device has internet connection
3. Check notification permissions in device settings
4. Disable battery optimization for Supasoka app

### Issue: "API key invalid"

**Symptoms:**
- Backend logs show: `❌ Error sending push notification: Invalid API key`
- Pushy returns 401 Unauthorized

**Solution:**
1. Verify API key is correct (copy from Pushy dashboard)
2. Check for extra spaces or newlines in `.env` file
3. Ensure using **Secret API Key**, not App ID
4. Regenerate API key if needed (in Pushy dashboard)

## 💰 Pricing & Limits

### Free Tier
- ✅ Up to **1,000 devices**
- ✅ Unlimited notifications
- ✅ 24-hour message queuing
- ✅ Basic analytics

### Pro Tier ($19/month)
- ✅ Up to **10,000 devices**
- ✅ Advanced analytics
- ✅ Priority support
- ✅ Custom branding

### Enterprise Tier (Custom pricing)
- ✅ Unlimited devices
- ✅ Dedicated infrastructure
- ✅ SLA guarantees
- ✅ Custom integrations

**For Supasoka:**
- Current users: ~40
- Recommended: **Free tier** (sufficient for now)
- Upgrade when: Reach 800+ devices

## 🔐 Security Best Practices

### 1. Protect Your Secret API Key
- ❌ Never commit to Git
- ❌ Never expose in mobile app
- ❌ Never share publicly
- ✅ Store in `.env` file
- ✅ Use environment variables
- ✅ Rotate periodically

### 2. Validate Device Tokens
- ✅ Filter out null/invalid tokens
- ✅ Remove tokens from uninstalled apps
- ✅ Verify token format before sending

### 3. Rate Limiting
- ✅ Limit notification frequency per user
- ✅ Implement cooldown periods
- ✅ Prevent spam/abuse

## 📈 Optimization Tips

### 1. Batch Notifications
Instead of sending one-by-one:
```javascript
// ❌ Slow - sends individually
for (const token of deviceTokens) {
  await pushy.send(token, notification);
}

// ✅ Fast - sends in batch
await pushy.sendBatch(deviceTokens, notification);
```

### 2. Clean Up Invalid Tokens
Periodically remove invalid tokens:
```sql
-- Find users with invalid tokens
SELECT id, deviceToken FROM users 
WHERE deviceToken IS NULL 
   OR deviceToken = '' 
   OR deviceToken = 'null';

-- Clean up
UPDATE users SET deviceToken = NULL 
WHERE deviceToken IN ('', 'null', 'undefined');
```

### 3. Monitor Delivery Rates
Set up alerts for low delivery rates:
- Target: > 95% delivery rate
- Alert if: < 90% for 24 hours
- Action: Investigate failed tokens

## 🎯 Success Checklist

Before going live, verify:

- [ ] Pushy account created
- [ ] App created in Pushy dashboard
- [ ] Secret API Key added to backend `.env`
- [ ] Backend restarted with new key
- [ ] Test notification sent successfully
- [ ] Devices showing in Pushy dashboard
- [ ] Notifications delivered to online users
- [ ] Notifications delivered to offline users
- [ ] Status bar notifications working
- [ ] Notification taps open the app
- [ ] Backend logs show successful sends
- [ ] Database has device tokens for all users

## 📞 Support

### Pushy Support
- **Documentation**: https://pushy.me/docs
- **Email**: support@pushy.me
- **Response time**: 24-48 hours

### Supasoka Support
- **Backend Issues**: Check `backend/logs/app.log`
- **Mobile Issues**: Check device logs with `adb logcat`
- **Database Issues**: Query `users` table for device tokens

---

**Setup Time**: ~15 minutes
**Difficulty**: Easy
**Status**: ✅ Ready to Deploy
