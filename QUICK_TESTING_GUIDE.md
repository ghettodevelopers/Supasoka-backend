# Quick Testing Guide (Copy & Paste)

## Before You Start
1. User app is running on device/emulator
2. AdminSupa app is running on another device/emulator
3. Both have internet connection
4. User device has notification permission granted
5. User device volume is NOT on silent
6. User device is NOT in Do Not Disturb mode

---

## Testing Procedure

### Test 1: Verify Socket Connection (30 seconds)

**In User App Console**:
```
Expected logs to see:
✅ AppStateContext socket connected
🔗 Emitted join-user event for user: [number]
```

**What This Means**: ✅ Socket connection is working

---

### Test 2: Admin Grants Access (1 minute)

**In AdminSupa App**:
1. Open the app
2. Go to "Users" tab (bottom navigation)
3. Find test user in list
4. Click on the user row
5. Click "Grant Access" button
6. In the modal:
   - Days: `0`
   - Hours: `0`
   - Minutes: `30`
   - Seconds: `0`
7. Click "Grant Access" button
8. See success message: "Access granted successfully"

**Backend Console** (should show):
```
✅ User activation successful: {
  uniqueUserId: "user123",
  finalTimeInMinutes: 30,
  timeDisplay: "0d 0h 30m 0s"
}
```

**What This Means**: ✅ Backend processed the grant

---

### Test 3: Verify Notification Appears (30 seconds)

**In User App Device**:
1. Look at the **status bar** (top of screen)
2. **You should see** within 2-3 seconds:
   - 🔔 Small notification icon (appears on left side of status bar)
   - 📢 Sound plays (if volume > 0)
   - 📳 Device vibrates
   - 💡 LED light flashes red (if device has LED)

3. **Pull down notification drawer**:
   - Swipe down from top to see full notifications
   - Find notification with title: **"Umezawadiwa! 🎉"**
   - Message shows: **"Muda: 0d 0h 30m 0s. Tumia app Bure kabisa!"**

4. **User App Console** (should show):
   ```
   📡 Account activated: {remainingTime: 30, accessLevel: "premium", ...}
   📢 Showing notification in status bar: Umezawadiwa! 🎉
   ✅ Status bar notification sent
   ```

**What This Means**: ✅ Notification appeared on status bar with sound/vibration

---

### Test 4: Verify Access Modal (30 seconds)

**In User App Screen**:
1. After notification, should see beautiful modal:
   - Title: **"Umezawadiwa! 🎉"** (You've been granted!)
   - Shows: **"30 Dakika"** (30 minutes)
   - Message: "Tumia app Bure kabisa!" (Use app for free!)
2. Click "OK" or close modal

**What This Means**: ✅ Modal confirmation appeared

---

### Test 5: Verify Channels Unlock (1 minute)

**In User App - Home Screen**:
1. Go back to home screen (if not already there)
2. Look at the channels/videos shown
3. **Check for locked channels**:
   - Before: Channels had lock icon 🔒
   - After: **Lock icon should be GONE** ✅
4. Try clicking a channel that was previously locked
5. **Channel should play immediately** without showing unlock modal
6. If you see unlock modal, access grant didn't work

**What This Means**: ✅ Channels are unlocked

---

### Test 6: Verify Remaining Time (1 minute)

**In User App - Account/Profile Screen**:
1. Go to account settings (usually bottom right icon)
2. Look for "Remaining Time" or "Time Remaining"
3. Should show: **"~30 minutes remaining"** (might be 29 or 28 if time passed)
4. Wait 1 minute
5. **Remaining time should decrease** (now ~29 or 28 minutes)

**What This Means**: ✅ Countdown timer is working

---

## Complete Test in 5 Minutes

**Total Time**: ~5 minutes to complete all tests

```
30 sec  : Test 1 - Verify socket connection
1 min   : Test 2 - Admin grants access  
30 sec  : Test 3 - Verify notification on status bar
30 sec  : Test 4 - Verify access modal
1 min   : Test 5 - Verify channels unlock
1 min   : Test 6 - Verify countdown timer
────────────────────────────
~5 min  : TOTAL
```

---

## What Should Happen (Step by Step)

### Timeline
```
T+0s    : Admin clicks "Grant Access" in AdminSupa
T+1s    : Backend processes grant and emits socket event
T+2s    : User app receives event
T+3s    : 🔔 Notification appears on status bar
T+3s    : 📢 Sound plays
T+3s    : 📳 Device vibrates
T+3s    : Modal "Umezawadiwa! 🎉" appears
T+5s    : User closes modal
T+5s    : User sees unlocked channels on home screen
T+5s    : User can click any channel and it plays
```

---

## Success Criteria

### ✅ All Tests Pass If:
1. ✅ Socket connection log appears in console
2. ✅ Backend logs show user activation
3. ✅ Notification icon appears on status bar
4. ✅ Notification sound plays
5. ✅ Device vibrates
6. ✅ Full notification visible in drawer
7. ✅ Modal appears with granted time
8. ✅ Channel lock icons disappear
9. ✅ Clicking channel plays without unlock modal
10. ✅ Remaining time shown in profile
11. ✅ Remaining time decreases after 1 minute

### ❌ Tests Fail If:
- ❌ No notification on status bar
- ❌ No sound/vibration
- ❌ Modal doesn't appear
- ❌ Channels still show lock icon
- ❌ Unlock modal still appears when clicking channel
- ❌ Remaining time not shown

---

## Troubleshooting Quick Fixes

### Issue: Notification doesn't appear
**Fix**:
1. Check device notification permission:
   - Settings → Apps → Supasoka → Notifications → ON
2. Check device volume: Side button should be > 0
3. Check Do Not Disturb: Should be OFF
4. Restart app

### Issue: Channels still locked
**Fix**:
1. Kill app completely
2. Restart app
3. Retry the test
4. Check console logs for errors

### Issue: Socket connection fails
**Fix**:
1. Check internet connection
2. Restart both apps
3. Check backend is running: `https://supasoka-backend.onrender.com`

### Issue: No sound from notification
**Fix**:
1. Check device is not on silent (side volume button)
2. Check volume is > 0 in Settings
3. Restart app

---

## Console Logs Reference

### Successful Flow - What You Should See

```
=== USER APP CONSOLE ===

✅ AppStateContext socket connected
🔗 Emitted join-user event for user: 123

🎉 Account activated by admin: {
  remainingTime: 30,
  accessLevel: "premium",
  expiresAt: "2025-12-04T15:30:00Z",
  message: "Akaunti yako imewashwa na msimamizi! Muda: 0d 0h 30m 0s"
}

📝 Processing activation data: {...}
✅ Remaining time updated: 30 minutes
✅ Subscription status updated: true
🔓 Granting admin access with: {
  expiresAt: "2025-12-04T15:30:00Z",
  durationMinutes: 30,
  accessLevel: "premium",
  grantedBy: "admin"
}
✅ Admin access granted and persisted
✅ User data updated with activation info
🔄 Reloading app state...
✅ Account activation processed successfully

📢 Showing notification in status bar: Umezawadiwa! 🎉
✅ Status bar notification sent: {
  title: "Umezawadiwa! 🎉",
  channel: "supasoka-admin",
  priority: "max",
  timestamp: "15:30:15"
}

=== ADMIN APP CONSOLE ===

✅ Access granted successfully to user: user123
```

---

## Testing Notes

### Device Requirements
- Minimum Android 8 (API 26)
- Recommended Android 13+ for full notification support
- At least 100MB free storage
- Internet connection

### Test Duration
- **Quick Test**: 5 minutes (all features)
- **Extended Test**: 30+ minutes (wait for auto-expiry)
- **Full Test**: 30 minutes + (verify channels lock after expiry)

### Recommended Devices
- Android phone (real device preferred)
- Android emulator (if no real device)
- Both devices must be on same network OR have internet access

---

## Verification Form

Print or save this form to mark off each test:

```
Test Date: _______________
Tester: ___________________

□ Test 1: Socket connection visible in logs
□ Test 2: Admin grant completes successfully  
□ Test 3: Notification appears on status bar
□ Test 4: Notification has sound
□ Test 5: Device vibrates
□ Test 6: Notification drawer shows full message
□ Test 7: Access modal appears with time
□ Test 8: Channel lock icons disappear
□ Test 9: Clicking channel plays without unlock modal
□ Test 10: Remaining time shown in profile
□ Test 11: Time decreases after 1 minute
□ Test 12: Channels lock after 30 minutes (optional)

Result: ✅ PASS / ❌ FAIL

Notes: _________________________________________________________________
```

---

## Quick Copy-Paste Commands

### Check Backend is Running
```
Check in browser: https://supasoka-backend.onrender.com
Or in terminal: curl https://supasoka-backend.onrender.com
Should get a response (might be 404 or 200, but not Connection Refused)
```

### Clear App Data (if needed)
```
On Android: Settings → Apps → Supasoka → Storage → Clear Data
Then restart app
```

### View Device Logs
```
Using Android Studio:
1. Connect device/open emulator
2. Open Logcat window
3. Filter by app package: com.supasoka (or your package name)
4. See all console logs in real-time
```

---

## Expected Behavior Summary

| Feature | Before Admin Grant | After Admin Grant | After 30 Minutes |
|---------|-------------------|-------------------|-----------------|
| **Channels** | Locked 🔒 | Unlocked ✅ | Locked 🔒 |
| **Playback** | Unlock Modal | Plays Directly ▶️ | Unlock Modal |
| **Notification** | None | On Status Bar 🔔 | None |
| **Sound** | N/A | Plays 📢 | N/A |
| **Vibration** | N/A | Yes 📳 | N/A |
| **Time Shown** | N/A | "30 Dakika" | N/A |

---

**Test Created**: December 4, 2025  
**Test Type**: Quick 5-minute verification  
**Expected Result**: ✅ All features working
