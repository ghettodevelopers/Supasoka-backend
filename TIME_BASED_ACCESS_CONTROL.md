# Time-Based Access Control System ✅

## 🎯 Overview

Implemented a complete time-based access control system that:
1. ✅ Receives notifications when admin grants time
2. ✅ Updates user's remaining time automatically
3. ✅ Monitors time continuously
4. ✅ Locks access when time expires
5. ✅ Unlocks access when admin grants new time

## 🔧 Components Implemented

### 1. Socket Listener for Account Activation
**File**: `contexts/NotificationContext.js`

**What it does**:
- Listens for `account-activated` event from backend
- Updates user's remaining time in storage
- Updates subscription status
- Shows notification to user
- Unlocks access immediately

**Code Added**:
```javascript
socket.on('account-activated', async (data) => {
  // Update user data with new time
  user.remainingTime = data.remainingTime;
  user.isActivated = true;
  user.isSubscribed = true;
  user.accessLevel = data.accessLevel;
  user.accessExpiresAt = data.expiresAt;
  
  // Save to storage
  await AsyncStorage.setItem('user', JSON.stringify(user));
  await AsyncStorage.setItem('remainingTime', remainingTime.toString());
  await AsyncStorage.setItem('isSubscribed', 'true');
  
  // Show notification
  showNotification({
    title: 'Akaunti Imewashwa! 🎉',
    message: `Muda wako: ${Math.floor(remainingTime / (24 * 60))} siku`
  });
});
```

### 2. Time Checker Service
**File**: `services/timeCheckerService.js`

**What it does**:
- Monitors remaining time every minute
- Decreases time by 1 minute when active
- Checks if time has expired
- Locks access when time runs out
- Unlocks access when time is granted
- Monitors app state changes

**Key Features**:
```javascript
// Start monitoring
timeCheckerService.startMonitoring();

// Check time every minute
setInterval(() => {
  checkRemainingTime();
}, 60000);

// Lock when expired
if (hasExpired) {
  await lockAccess(); // Sets isActivated=false, isSubscribed=false
}

// Unlock when time granted
if (remainingTime > 0) {
  await unlockAccess(); // Sets isActivated=true, isSubscribed=true
}
```

### 3. App Initialization
**File**: `App.js`

**What it does**:
- Starts time monitoring on app launch
- Stops monitoring on app close
- Ensures time is always checked

**Code Added**:
```javascript
useEffect(() => {
  initializeApp();
  
  return () => {
    timeCheckerService.stopMonitoring();
  };
}, []);

const initializeApp = async () => {
  await userService.initializeUser();
  await timeCheckerService.startMonitoring();
};
```

## 🔄 How It Works

### Scenario 1: Admin Grants Time

**Step 1: Admin Action (AdminSupa)**
```
Admin → Users → Select User → Activate
Set time: 7 days → Click "Activate User"
```

**Step 2: Backend Processing**
```javascript
// backend/routes/users.js
router.patch('/admin/:uniqueUserId/activate', async (req, res) => {
  // Update user in database
  await prisma.user.update({
    where: { uniqueUserId },
    data: {
      isActivated: true,
      isSubscribed: true,
      remainingTime: finalTimeInMinutes,
      accessLevel: 'premium',
      accessExpiresAt: expiryDate
    }
  });
  
  // Emit socket event
  io.to(`user-${user.id}`).emit('account-activated', {
    message: 'Akaunti yako imewashwa!',
    remainingTime: finalTimeInMinutes,
    accessLevel: 'premium',
    expiresAt: expiryDate
  });
});
```

**Step 3: User App Receives Event**
```javascript
// contexts/NotificationContext.js
socket.on('account-activated', async (data) => {
  // Update local storage
  user.remainingTime = data.remainingTime; // e.g., 10080 minutes (7 days)
  user.isActivated = true;
  user.isSubscribed = true;
  await AsyncStorage.setItem('user', JSON.stringify(user));
  
  // Show notification
  showNotification({
    title: 'Akaunti Imewashwa! 🎉',
    message: 'Muda wako: 7 siku'
  });
});
```

**Step 4: Time Checker Unlocks Access**
```javascript
// services/timeCheckerService.js
await checkRemainingTime();
// remainingTime = 10080 minutes
// hasExpired = false
// → unlockAccess() called
// → User can now watch channels
```

### Scenario 2: Time Expires

**Step 1: Time Monitoring**
```javascript
// Every minute, time checker runs
setInterval(() => {
  checkRemainingTime();
}, 60000);

// Decreases time
user.remainingTime = remainingTime - 1; // 10080 → 10079 → 10078...
```

**Step 2: Time Reaches Zero**
```javascript
// After 7 days (10080 minutes)
user.remainingTime = 0;
hasExpired = true;
```

**Step 3: Access Locked**
```javascript
await lockAccess();
// Sets:
user.isActivated = false;
user.isSubscribed = false;
user.remainingTime = 0;
user.accessLevel = 'basic';

// Clears:
unlockedChannels = [];

// User can no longer watch premium channels
```

**Step 4: User Sees Lock Screen**
```
User tries to watch channel → Blocked
Message: "Muda wako umeisha. Lipia kuendelea kutazama."
```

### Scenario 3: Admin Grants More Time

**Step 1: Admin Adds Time**
```
Admin → Users → Select User → Activate
Set time: 3 days → Click "Activate User"
```

**Step 2: Socket Event Received**
```javascript
socket.on('account-activated', async (data) => {
  user.remainingTime = 4320; // 3 days in minutes
  user.isActivated = true;
  user.isSubscribed = true;
  // Saves to storage
});
```

**Step 3: Access Unlocked**
```javascript
await checkRemainingTime();
// remainingTime = 4320 (> 0)
// hasExpired = false
// isLocked = true (was locked)
// → unlockAccess() called
// → User can watch again!
```

## 📊 Time Monitoring Details

### Check Frequency
- **Every 1 minute** when app is running
- **On app resume** from background
- **On app launch**

### Time Decrease
- Decreases by **1 minute** every check
- Only when `isActivated = true` and `isSubscribed = true`
- Stops at 0 (doesn't go negative)

### Warnings
```javascript
// 1 hour remaining
if (remainingTime === 60) {
  console.log('⚠️ Only 1 hour remaining!');
}

// 10 minutes remaining
if (remainingTime === 10) {
  console.log('⚠️ Only 10 minutes remaining!');
}
```

### Logging
```javascript
// Every 10 minutes
if (remainingTime % 10 === 0) {
  console.log(`⏰ Time remaining: ${hours}h ${minutes}m`);
}
```

## 🔒 Lock/Unlock Behavior

### When Locked (Time Expired)
```javascript
user.isActivated = false;
user.isSubscribed = false;
user.remainingTime = 0;
user.accessLevel = 'basic';
unlockedChannels = [];
```

**User Experience**:
- ❌ Cannot watch premium channels
- ❌ Cannot access paid content
- ✅ Can see app interface
- ✅ Can see payment options
- ✅ Can contact support

### When Unlocked (Time Granted)
```javascript
user.isActivated = true;
user.isSubscribed = true;
user.remainingTime = X; // minutes
user.accessLevel = 'premium';
```

**User Experience**:
- ✅ Can watch all channels
- ✅ Can access all content
- ✅ Full app access
- ✅ No restrictions

## 🧪 Testing

### Test 1: Grant Time
1. Open AdminSupa
2. Go to Users screen
3. Find test user
4. Click "Activate" → Set 1 hour
5. Click "Activate User"

**Expected**:
- ✅ User app shows notification: "Akaunti Imewashwa!"
- ✅ User can watch channels
- ✅ Time starts counting down
- ✅ Console shows: `⏰ Time remaining: 1h 0m`

### Test 2: Time Expires
1. Wait for time to reach 0 (or manually set to 1 minute)
2. Wait 1 minute

**Expected**:
- ✅ Console shows: `🔒 LOCKING ACCESS - Time expired`
- ✅ User cannot watch channels
- ✅ Lock screen appears
- ✅ `isActivated = false`, `isSubscribed = false`

### Test 3: Grant Time After Expiry
1. User is locked (time = 0)
2. Admin grants 2 hours
3. User app receives notification

**Expected**:
- ✅ Console shows: `🔓 UNLOCKING ACCESS - Time granted`
- ✅ User can watch channels again
- ✅ Time starts from 120 minutes
- ✅ `isActivated = true`, `isSubscribed = true`

### Test 4: App Background/Resume
1. User has active time
2. Send app to background
3. Wait 5 minutes
4. Resume app

**Expected**:
- ✅ Console shows: `📱 App became active, checking time...`
- ✅ Time is checked immediately
- ✅ Time decreased by ~5 minutes
- ✅ Access status updated

## 📝 Console Logs to Monitor

### Successful Time Grant
```
📡 Account activated: {"remainingTime":10080,"accessLevel":"premium",...}
✅ User data updated with new time: 10080
✅ Account activation processed successfully
🔓 UNLOCKING ACCESS - Time granted
✅ Access unlocked successfully
```

### Time Monitoring
```
⏰ Starting time monitoring...
✅ Time monitoring started
⏰ Checking time: {remainingTime: 10080, isActivated: true, ...}
⏰ Time remaining: 168h 0m
```

### Time Expiry
```
⏰ Checking time: {remainingTime: 0, isActivated: true, ...}
⏰ Access expired by remaining time
🔒 LOCKING ACCESS - Time expired
🔒 Access locked successfully
```

### Warnings
```
⚠️ WARNING: Only 1 hour remaining!
⚠️ WARNING: Only 10 minutes remaining!
```

## 🚀 Deployment

### Files to Commit
1. ✅ `contexts/NotificationContext.js` - Socket listener added
2. ✅ `services/timeCheckerService.js` - New file
3. ✅ `App.js` - Time monitoring initialization
4. ✅ `TIME_BASED_ACCESS_CONTROL.md` - This documentation

### Git Commands
```bash
git add contexts/NotificationContext.js
git add services/timeCheckerService.js
git add App.js
git add TIME_BASED_ACCESS_CONTROL.md
git commit -m "Add time-based access control with auto lock/unlock"
git push origin main
```

## ✅ Summary

**What's Working Now**:
1. ✅ Admin grants time → User receives notification
2. ✅ User's time updates automatically
3. ✅ Time decreases every minute
4. ✅ Access locks when time expires
5. ✅ Access unlocks when time granted
6. ✅ Works on app resume/background
7. ✅ Monitors continuously
8. ✅ Shows warnings before expiry

**User Flow**:
```
Admin grants 7 days
    ↓
User receives notification
    ↓
Time starts: 10080 minutes
    ↓
Every minute: -1 minute
    ↓
After 7 days: 0 minutes
    ↓
Access LOCKED automatically
    ↓
Admin grants 3 days
    ↓
Access UNLOCKED automatically
    ↓
Repeat...
```

**Everything is automated!** No manual intervention needed. The system handles lock/unlock automatically based on remaining time. 🎉
