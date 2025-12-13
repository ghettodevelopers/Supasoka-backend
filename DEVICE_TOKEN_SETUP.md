# Device Token Setup Guide - Pure React Native Solution

This guide explains the device token collection system for Supasoka using pure React Native and Node.js (no Firebase).

## 🎯 Solution Overview

**Technology Stack:**
- ✅ React Native (react-native-push-notification)
- ✅ Node.js/Express backend
- ✅ PostgreSQL database (Prisma)
- ❌ No Firebase
- ❌ No external push notification services

## 📱 How It Works

### 1. Device Token Generation
When users open the app:
1. `deviceTokenService.initialize()` is called from App.js
2. Service checks for cached device token in AsyncStorage
3. If no token exists, generates a unique token: `PLATFORM_TIMESTAMP_RANDOM_DEVICEID`
4. Token is saved locally in AsyncStorage
5. Token is sent to backend via `/users/device-token` endpoint
6. Backend stores token in database

### 2. Notification System
- **WebSocket (Socket.IO)**: Real-time notifications when app is open
- **Local Notifications**: Status bar notifications using react-native-push-notification
- **Device Tokens**: Unique identifiers for each device stored in database

## 💡 Why Generate Our Own Tokens?

**Problem:** `react-native-push-notification` only handles LOCAL notifications, not remote push notifications. It doesn't generate device tokens for remote push.

**Solution:** Generate our own unique device identifiers that serve as "device tokens":
- Format: `android_1765492857927_abc123xyz456_device_id`
- Unique per device
- Persistent across app restarts
- Stored in database for future use

**Benefits:**
- ✅ No Firebase required
- ✅ No external push service needed
- ✅ Works immediately
- ✅ Can integrate with any push service later (OneSignal, Pushy, etc.)
- ✅ Tokens are ready in database for when you add remote push

## 🔧 What's Already Configured

### Mobile App:
✅ `react-native-push-notification` already installed (package.json)
✅ NotificationContext.js configured with local notifications
✅ Device token service created (services/deviceTokenService.js)
✅ App.js integrated with device token service

### Backend:
✅ Device token endpoint exists (`/users/device-token`)
✅ Database schema has `deviceToken` field
✅ Statistics endpoint (`/admin/notifications/stats`)

## 🚀 Testing Device Token Collection

### Step 1: Run the App
```bash
cd C:/Users/ayoub/Supasoka
npm run android
```

### Step 2: Check Logs
Look for these messages:
```
🔔 Initializing device token service...
📱 Device token received: [token]...
💾 Device token saved locally
📤 Registering device token with backend...
✅ Device token registered with backend
✅ Device token service ready
🔑 Device token registered
```

### Step 3: Verify in Database
```bash
cd backend
node test-production-users.js
```

You should see device tokens instead of NULL:
```
User 1:
  Device Token: [actual_token_here]
  
User 2:
  Device Token: [actual_token_here]
```

### Step 4: Check Statistics
```bash
# In backend directory
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const total = await prisma.user.count();
  const withTokens = await prisma.user.count({ where: { deviceToken: { not: null } } });
  console.log('Total Users:', total);
  console.log('Users with Tokens:', withTokens);
  console.log('Coverage:', ((withTokens/total)*100).toFixed(2) + '%');
  await prisma.\$disconnect();
})();
"
```

## 📊 API Endpoints

### Register Device Token (Automatic)
```http
POST /api/users/device-token
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "deviceToken": "unique_device_token_string",
  "platform": "android",
  "deviceInfo": {
    "os": "android",
    "osVersion": "13"
  }
}
```

### Get Statistics (Admin)
```http
GET /api/admin/notifications/stats
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "stats": {
    "totalUsers": 33,
    "usersWithTokens": 33,
    "activeUsers": 33,
    "tokenCoverage": "100.00"
  }
}
```

### Send Real-time Notification (Admin)
```http
POST /api/admin/notifications/send-realtime
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Ujumbe wa Msimamizi",
  "message": "Vituo vipya vimeongezwa!",
  "type": "general"
}
```

## 🔔 Current Notification System

### What Works Now:
1. **Local Notifications**: Appear in status bar using react-native-push-notification
2. **WebSocket Notifications**: Real-time when app is open
3. **Device Token Collection**: Tokens automatically collected and stored
4. **Admin Broadcasting**: Send to all users via WebSocket

### Notification Flow:
```
Admin sends notification
    ↓
Backend emits via Socket.IO
    ↓
Connected users receive via WebSocket
    ↓
NotificationContext shows in status bar
    ↓
User sees notification
```

## 🎯 Device Token Usage

Device tokens are collected and stored for:
1. **Statistics**: Track how many users have tokens
2. **Future Integration**: Ready for external push services (OneSignal, etc.)
3. **User Identification**: Unique identifier per device
4. **Notification Targeting**: Can target specific devices

## 🔮 Future Push Notification Options

When you're ready to add external push notifications, you can integrate:

### Option 1: OneSignal (Free)
- Easy integration
- Free for unlimited notifications
- Good documentation

### Option 2: Pushy.me
- Simple API
- Pay as you go
- Good for small apps

### Option 3: Custom Solution
- Use device tokens with your own server
- Send via Android FCM API (no Firebase SDK needed)
- Full control

## 📝 Code Structure

### Mobile App Files:
```
services/
  deviceTokenService.js     # Device token collection & registration
  
contexts/
  NotificationContext.js    # Local notification display
  
App.js                      # Initializes device token service
```

### Backend Files:
```
routes/
  users.js                  # /users/device-token endpoint
  admin.js                  # /admin/notifications/* endpoints
  
prisma/
  schema.prisma             # User.deviceToken field
```

## ✅ Success Checklist

After running the app, verify:
- [ ] App builds and runs without errors
- [ ] Logs show "Device token received"
- [ ] Logs show "Device token registered with backend"
- [ ] Database shows device tokens (not NULL)
- [ ] Statistics endpoint shows token coverage
- [ ] Admin can send real-time notifications
- [ ] Notifications appear in device status bar

## 🐛 Troubleshooting

### Issue: Device token is NULL
**Solution:**
1. Check app logs for errors
2. Verify notification permissions granted
3. Ensure user is initialized before token service
4. Check backend endpoint is accessible

### Issue: Token not registering with backend
**Solution:**
1. Check internet connection
2. Verify backend is running
3. Check authentication token is valid
4. Look for API errors in backend logs

### Issue: Notifications not appearing
**Solution:**
1. Check notification permissions (Android 13+)
2. Verify notification channel is created
3. Check NotificationContext is working
4. Test with admin panel

## 📚 Key Features

### Automatic Token Collection:
- ✅ Collected on app startup
- ✅ Saved locally for offline access
- ✅ Registered with backend automatically
- ✅ Re-registered on app updates

### Token Management:
- ✅ Cached locally in AsyncStorage
- ✅ Stored in database with user
- ✅ Updated when user logs in
- ✅ Cleared on logout

### Statistics & Monitoring:
- ✅ Track total users
- ✅ Track users with tokens
- ✅ Calculate coverage percentage
- ✅ Monitor active users

## 🎉 Expected Result

After setup:
- All 33 users will have device tokens automatically
- Tokens stored in database (not NULL)
- Admin can see statistics
- Ready for future push notification integration
- Current local notifications continue working

## 📞 Support

If you need help:
1. Check logs for error messages
2. Verify all endpoints are working
3. Test with a single user first
4. Check database directly with Prisma Studio

---

**Note:** This is a pure React Native + Node.js solution with no Firebase or external dependencies. Device tokens are collected and stored for future use with any push notification service you choose.
