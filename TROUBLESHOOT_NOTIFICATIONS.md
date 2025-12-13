# 🔍 Troubleshooting Push Notifications - Step by Step

## Your Current Setup
- ✅ Pushy API Key: `822c3236d79315a119cd212d987ce469e4d53dded276b605ec94fd99151a24ee`
- ✅ Added to Render.com environment variables
- ❌ Notifications not working

## 🎯 Step-by-Step Debugging

### Step 1: Verify Render.com Environment Variable

1. **Go to Render.com Dashboard**
   - https://dashboard.render.com
   - Select your `supasoka-backend` service

2. **Check Environment Variables**
   - Click **"Environment"** in left sidebar
   - Look for: `PUSHY_SECRET_API_KEY`
   - Value should be: `822c3236d79315a119cd212d987ce469e4d53dded276b605ec94fd99151a24ee`

3. **Verify Service Redeployed**
   - After adding environment variable, service must redeploy
   - Check **"Events"** tab - should see "Deploy succeeded"
   - Wait 2-3 minutes for deployment to complete

### Step 2: Check Backend Logs on Render.com

1. **View Logs**
   - Go to your service → **"Logs"** tab
   - Look for startup messages

2. **What to Look For:**

   **✅ GOOD - API Key Loaded:**
   ```
   ✅ Push notifications configured
   ✅ Pushy API initialized
   ```

   **❌ BAD - API Key Missing:**
   ```
   ⚠️ PUSHY_SECRET_API_KEY not configured
   Push notifications sent (mock mode)
   ```

3. **If you see "mock mode":**
   - API key not loaded properly
   - Service needs to redeploy
   - Click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 3: Check Database for Device Tokens

Your users need device tokens registered in the database.

**Option A: Check via Render.com Dashboard**
1. Go to your PostgreSQL database on Render
2. Click **"Connect"** → Copy connection string
3. Use a PostgreSQL client (pgAdmin, TablePlus, etc.)

**Option B: Check via API**
```bash
# Get admin token
curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}'

# This returns a token, use it to check users
```

**What You Need:**
```sql
-- Run this query in your database
SELECT 
  COUNT(*) as total_users,
  COUNT("deviceToken") as users_with_tokens
FROM users;

-- Expected result:
-- total_users: 40
-- users_with_tokens: 40 (or close to it)
```

**If users_with_tokens = 0:**
- Users haven't opened the app yet
- App needs to register device tokens
- Solution: Open app on at least one device

### Step 4: Test Push Notification Endpoint

**Send Test Notification:**
```bash
# 1. Get admin token
TOKEN=$(curl -s -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Send notification
curl -X POST https://supasoka-backend.onrender.com/admin/notifications/send-realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Push",
    "message": "Testing from Render.com",
    "type": "general",
    "priority": "high"
  }'
```

**Check Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 40,
    "onlineUsers": 0,
    "offlineUsers": 40,
    "pushSent": 40,     // ✅ Should be > 0
    "pushFailed": 0,    // ✅ Should be 0
    "usersWithTokens": 40
  }
}
```

### Step 5: Check Render.com Logs After Sending

After sending notification, check logs immediately:

**✅ SUCCESS - Logs should show:**
```
📱 Preparing to send push notification to 40 devices
   Title: "Test Push"
   Message: "Testing from Render.com"
   Type: general
   Priority: high
🚀 Sending push notification via Pushy to 40 devices...
✅ Push notification sent successfully!
   Devices: 40
   Results: {"success":true,"id":"abc123"}
```

**❌ FAILURE - If you see:**
```
⚠️ PUSHY_SECRET_API_KEY not configured
Push notifications sent (mock mode)
```
→ API key not loaded, redeploy service

**❌ FAILURE - If you see:**
```
❌ Error sending push notification: Invalid API key
```
→ API key is wrong, check Pushy dashboard

**❌ FAILURE - If you see:**
```
⚠️ No users with valid device tokens found
```
→ Users need to open the app to register

### Step 6: Verify Pushy Dashboard

1. **Go to Pushy Dashboard**
   - https://pushy.me/dashboard
   - Select your "Supasoka" app

2. **Check Devices Tab**
   - Should see registered devices
   - Each device has a token
   - Shows last seen time

3. **Check Notifications Tab**
   - Should see sent notifications
   - Shows delivery status
   - Check for errors

**If no devices shown:**
- Users haven't opened the app
- Device token registration not working
- Check mobile app logs

### Step 7: Test on Mobile Device

1. **Open Supasoka App**
   - App should auto-register device token
   - Check app logs for:
     ```
     📱 Generated new device token: FCM_...
     ✅ Device token registered with backend
     ```

2. **Kill the App**
   - Swipe away from recent apps
   - App completely closed

3. **Send Notification from AdminSupa**
   - Wait 5-10 seconds
   - Check device status bar
   - Notification should appear

4. **If notification doesn't appear:**
   - Check device notification permissions
   - Check battery optimization settings
   - Check Do Not Disturb mode

## 🔧 Common Issues & Solutions

### Issue 1: "Mock mode" in logs

**Cause:** API key not loaded by backend

**Solution:**
1. Verify `PUSHY_SECRET_API_KEY` in Render environment
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait 2-3 minutes
4. Check logs again

### Issue 2: "No users with device tokens"

**Cause:** Users haven't opened the app

**Solution:**
1. Open Supasoka app on at least one device
2. Wait 5 seconds for registration
3. Check database: `SELECT COUNT(*) FROM users WHERE "deviceToken" IS NOT NULL;`
4. Try sending notification again

### Issue 3: "Invalid API key"

**Cause:** Wrong API key or typo

**Solution:**
1. Go to Pushy dashboard
2. Copy **Secret API Key** again (not App ID)
3. Update in Render environment
4. Redeploy service

### Issue 4: Notifications sent but not received

**Cause:** Device tokens are invalid or app not configured

**Solution:**
1. Check Pushy dashboard → Devices tab
2. Verify devices are registered
3. Check mobile app notification permissions
4. Verify app has `react-native-push-notification` installed

### Issue 5: "pushSent: 0" in response

**Cause:** Either no API key or no valid device tokens

**Solution:**
1. Check backend logs for "mock mode"
2. If mock mode: Redeploy with API key
3. If not mock mode: Users need to open app

## 📊 Quick Diagnostic Checklist

Run through this checklist:

- [ ] Pushy API key added to Render environment variables
- [ ] Render service redeployed after adding key
- [ ] Backend logs show "Push notifications configured" (not "mock mode")
- [ ] Database has users with device tokens (check SQL query)
- [ ] Test notification returns `pushSent > 0`
- [ ] Pushy dashboard shows registered devices
- [ ] Mobile app has notification permissions enabled
- [ ] Test device has internet connection

## 🎯 Expected Working Flow

When everything works correctly:

1. **Backend starts:**
   ```
   ✅ Push notifications configured
   ✅ Pushy API initialized with key: 822c3236...
   ```

2. **User opens app:**
   ```
   📱 Device token generated: FCM_device123_...
   ✅ Device token registered with backend
   ```

3. **Admin sends notification:**
   ```
   📱 Sending push notifications to 40 users
   🚀 Sending via Pushy to 40 devices...
   ✅ Push notification sent successfully!
   ```

4. **User receives notification:**
   - Status bar shows notification
   - Sound/vibration plays
   - Tapping opens app

## 🆘 Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Share these details:**
   - Backend logs from Render (last 50 lines)
   - Response from test notification API call
   - Database query result for device tokens
   - Pushy dashboard screenshot (devices tab)

2. **Check these files:**
   - `backend/services/pushNotificationService.js` (line 34-46)
   - `backend/routes/admin.js` (notification endpoint)
   - Mobile app: `contexts/NotificationContext.js`

3. **Verify Pushy account:**
   - Account is active (not suspended)
   - API key is for correct app
   - App platform is set to "Android"

---

**Most Common Issue:** Service not redeployed after adding API key
**Solution:** Manual deploy on Render.com
