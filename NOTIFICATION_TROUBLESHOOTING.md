# Notification Troubleshooting Guide

## 🔧 Issue: Notifications Not Appearing in Status Bar

### ✅ Fixes Applied

#### 1. **Removed Missing Icon Reference**
- **Problem**: `smallIcon: 'ic_notification'` was causing failures because the icon doesn't exist
- **Fix**: Removed the smallIcon parameter, using only `largeIcon: 'ic_launcher'`
- **File**: `contexts/NotificationContext.js` line 659

#### 2. **Added Comprehensive Logging**
- **Added**: Detailed console logs to track notification flow
- **Logs Include**:
  - When `showNotification()` is called
  - Notification title and message
  - Channel being used (high-priority vs default)
  - Success/error messages
  - **File**: `contexts/NotificationContext.js` lines 596, 631-634, 699-702

#### 3. **Added Test Notification**
- **Purpose**: Verify notification system works on app start
- **Timing**: Sends test notification 3 seconds after app launches
- **Message**: "Supasoka Iko Tayari! Taarifa zitaonyeshwa hapa. Karibu!"
- **File**: `contexts/NotificationContext.js` lines 167-179

#### 4. **Enhanced Error Handling**
- **Added**: Try-catch block around notification sending
- **Benefit**: Prevents crashes and logs detailed error information
- **File**: `contexts/NotificationContext.js` lines 636-703

## 🧪 Testing Steps

### Step 1: Check Console Logs
After app starts, you should see:
```
🔔 Configuring push notifications...
✅ High priority channel created: true
✅ Default channel created: true
✅ Silent channel created: true
✅ Push notifications configured for status bar display
🧪 Testing notification system...
✅ Test notification sent
```

### Step 2: Verify Test Notification
- **When**: 3 seconds after app starts
- **Expected**: Notification appears in status bar
- **Title**: "Supasoka Iko Tayari!"
- **Message**: "Taarifa zitaonyeshwa hapa. Karibu!"
- **Sound**: Should play
- **Vibration**: Should vibrate

### Step 3: Test Admin Notification
1. Open AdminSupa
2. Go to Notifications screen
3. Click "Send Notification"
4. Fill in:
   - Title: "Test Notification"
   - Message: "This is a test"
   - Type: General
5. Click "Send"
6. Check user device status bar

### Step 4: Check Logs for Admin Notification
When admin sends notification, user app should log:
```
📡 Immediate notification received: { title: "Test Notification", ... }
🔔 showNotification called: Test Notification
📤 Sending local notification to status bar...
   Title: Test Notification
   Message: This is a test
   Channel: supasoka-high-priority
✅ Notification sent to Android system
🔔 Notification shown: Test Notification (ID: 1234567890, Priority: HIGH)
```

## 🔍 Common Issues & Solutions

### Issue 1: No Notification Appears
**Symptoms**: No notification in status bar, no sound, no vibration

**Check**:
1. **Permissions**: Ensure POST_NOTIFICATIONS permission is granted
   ```bash
   adb shell dumpsys notification_listener
   ```

2. **Channel Creation**: Check logs for channel creation
   ```
   ✅ High priority channel created: true
   ```

3. **Notification Logs**: Look for error messages
   ```
   ❌ Error sending notification: ...
   ```

**Solutions**:
- Go to Android Settings → Apps → Supasoka → Notifications
- Ensure "All Supasoka notifications" is ON
- Ensure "Supasoka Taarifa Muhimu" channel is ON
- Check notification importance is set to "High" or "Urgent"

### Issue 2: Notification Appears But No Sound
**Symptoms**: Notification shows but silent

**Check**:
- Device is not in silent mode
- Notification channel sound is enabled
- Volume is not zero

**Solutions**:
- Go to Settings → Apps → Supasoka → Notifications
- Tap "Supasoka Taarifa Muhimu"
- Ensure "Sound" is ON
- Set sound to "Default notification sound"

### Issue 3: Notification Doesn't Wake Screen
**Symptoms**: Notification appears but screen stays off

**Check**:
- `fullScreenIntent` is set for high priority notifications
- Device battery saver is not blocking

**Solutions**:
- Disable battery optimization for Supasoka
- Settings → Apps → Supasoka → Battery → Unrestricted

### Issue 4: Notifications Delayed
**Symptoms**: Notifications appear minutes later

**Check**:
- Socket connection status
- Network connectivity
- Battery optimization settings

**Solutions**:
- Ensure app has background data access
- Disable battery optimization
- Check socket connection logs:
  ```
  ✅ Socket connected
  ```

## 📱 Android Settings to Check

### 1. App Notification Settings
```
Settings → Apps → Supasoka → Notifications
- All Supasoka notifications: ON
- Supasoka Taarifa Muhimu: ON
  - Importance: High
  - Sound: ON
  - Vibration: ON
  - Pop on screen: ON
  - Badge: ON
```

### 2. Battery Optimization
```
Settings → Apps → Supasoka → Battery
- Battery optimization: Unrestricted
- Background data: Allowed
```

### 3. Do Not Disturb
```
Settings → Sound → Do Not Disturb
- Ensure Supasoka is allowed during DND
```

## 🔧 Manual Testing Commands

### Test Local Notification (via adb)
```bash
# Send test notification
adb shell am broadcast -a com.supasoka.TEST_NOTIFICATION
```

### Check Notification Channels
```bash
# List all notification channels
adb shell dumpsys notification | grep -A 20 "supasoka"
```

### Check App Permissions
```bash
# Check if POST_NOTIFICATIONS is granted
adb shell dumpsys package com.supasoka | grep POST_NOTIFICATIONS
```

### View Notification Logs
```bash
# Real-time logs
adb logcat | grep -i "notification\|supasoka"
```

## 📊 Expected Behavior

### When App Starts:
1. ✅ Notification channels created
2. ✅ Push notification configured
3. ✅ Test notification appears after 3 seconds
4. ✅ Sound plays
5. ✅ Device vibrates
6. ✅ Notification visible in status bar

### When Admin Sends Notification:
1. ✅ Backend emits socket event
2. ✅ User app receives event
3. ✅ `showNotification()` called
4. ✅ Notification sent to Android system
5. ✅ Notification appears in status bar
6. ✅ Sound and vibration triggered
7. ✅ Notification saved to list

### When User Taps Notification:
1. ✅ App opens (if closed)
2. ✅ App comes to foreground (if background)
3. ✅ Notification marked as read
4. ✅ Appropriate screen shown (if navigation set)

## 🐛 Debug Mode

### Enable Verbose Logging
The app already has comprehensive logging. To see all logs:

```bash
# Filter for notification-related logs
adb logcat | grep -E "🔔|📱|📤|✅|❌|🧪"
```

### Key Log Markers:
- 🔔 = Notification function called
- 📱 = Notification received
- 📤 = Sending to Android system
- ✅ = Success
- ❌ = Error
- 🧪 = Test notification

## 🎯 Success Criteria

### ✅ Notifications Working When:
1. Test notification appears 3 seconds after app start
2. Admin notifications appear in status bar immediately
3. Sound plays for each notification
4. Device vibrates for each notification
5. Notifications visible on lock screen
6. Notifications persist in NotificationsScreen
7. Unread count updates correctly
8. Tapping notification opens app

### ❌ Notifications NOT Working If:
1. No test notification after app start
2. Console shows errors when sending notification
3. No sound or vibration
4. Notifications don't appear in status bar
5. Socket connection fails

## 🔄 Quick Fix Checklist

If notifications still don't work, try these in order:

1. **Clear App Data**
   ```bash
   adb shell pm clear com.supasoka
   ```

2. **Reinstall App**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   react-native run-android
   ```

3. **Check Permissions**
   - Manually grant POST_NOTIFICATIONS permission
   - Settings → Apps → Supasoka → Permissions

4. **Disable Battery Optimization**
   - Settings → Apps → Supasoka → Battery → Unrestricted

5. **Check Notification Settings**
   - Settings → Apps → Supasoka → Notifications
   - Ensure all channels are ON

6. **Test on Different Device**
   - Some devices have aggressive battery saving
   - Test on stock Android if possible

## 📞 Support Information

### Log Files to Check:
1. **App Logs**: `adb logcat | grep Supasoka`
2. **Notification Logs**: `adb logcat | grep notification`
3. **Socket Logs**: Check for socket connection status
4. **Error Logs**: Look for any error messages

### Information to Provide:
- Android version
- Device manufacturer and model
- App version
- Console logs (especially errors)
- Screenshot of notification settings
- Whether test notification appears

## ✅ Current Status

### Implemented Fixes:
- ✅ Removed missing icon reference
- ✅ Added comprehensive logging
- ✅ Added test notification on app start
- ✅ Enhanced error handling
- ✅ Fixed try-catch block structure
- ✅ Proper channel configuration
- ✅ High priority settings for status bar display

### Next Steps:
1. Run the app and check for test notification
2. Check console logs for any errors
3. Test admin notification sending
4. Verify notifications appear in status bar
5. Report any issues with logs

The notification system should now work properly and display notifications in the status bar like WhatsApp and YouTube! 🎉
