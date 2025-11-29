# USB Tethering Network Fix

## The Problem
When using USB tethering, the Android emulator can't reach `10.0.2.2` because the network routing is different.

## ✅ Best Solution: Use ADB Reverse

This creates a direct tunnel from the emulator to your computer, bypassing network issues.

### Step 1: Run ADB Reverse Command
Open a **new terminal** and run:
```bash
adb reverse tcp:5000 tcp:5000
```

You should see: `5000` (or no error means success)

### Step 2: Update API Configuration
Edit `AdminSupa\src\config\api.js`

Find the Android section (around line 11-25) and change it to:

```javascript
if (Platform.OS === 'android') {
  // For USB tethering, use adb reverse + localhost
  return 'http://localhost:5000/api';
}
```

**Full change:**
```javascript
if (Platform.OS === 'android') {
  // IMPORTANT: Android emulator can't reach 10.0.2.2 if firewall blocks it
  // SOLUTION: Replace with your computer's IP address
  // Find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
  // Look for "IPv4 Address" - example: 192.168.1.100
  
  // Option 1: Use your computer's IP (RECOMMENDED)
  // return 'http://192.168.1.100:5000/api';  // ← UNCOMMENT and use YOUR IP
  
  // Option 2: Try 10.0.2.2 (may not work due to firewall)
  // return 'http://10.0.2.2:5000/api';
  
  // Option 3: Use adb reverse and localhost (BEST FOR USB TETHERING)
  return 'http://localhost:5000/api';  // ← USE THIS
}
```

### Step 3: Restart Expo App
```bash
# Press Ctrl+C to stop
npx expo start --clear
```

### Step 4: Try Login Again
- Email: `Ghettodevelopers@gmail.com`
- Password: `Chundabadi`

---

## Why This Works

USB tethering changes the network configuration:
- `10.0.2.2` doesn't work because routing is different
- `adb reverse` creates a direct tunnel: emulator port 5000 → computer port 5000
- Now `localhost:5000` in the emulator points to your computer's port 5000!

---

## Verify ADB Reverse is Working

After running `adb reverse tcp:5000 tcp:5000`, test it:

```bash
# Check if reverse is active
adb reverse --list
```

Should show:
```
tcp:5000 tcp:5000
```

---

## If You Restart the Emulator

You'll need to run `adb reverse` again:
```bash
adb reverse tcp:5000 tcp:5000
```

**Tip**: Create a batch file to run this automatically!

---

## Alternative: Create a Startup Script

Create `AdminSupa\start-with-adb.bat`:
```batch
@echo off
echo Setting up ADB reverse...
adb reverse tcp:5000 tcp:5000
echo.
echo Starting Expo...
npm start
```

Then just run this file instead of `npm start`!

---

## Expected Result

After the fix, you should see:
```
🔗 API Configuration:
   Platform: android
   API URL: http://localhost:5000/api
   Socket URL: http://localhost:5000

🔐 Attempting login...
   Email: Ghettodevelopers@gmail.com
   API URL: http://localhost:5000/api

✅ Login successful: {
  id: 1,
  email: 'Ghettodevelopers@gmail.com',
  name: 'Super Admin',
  role: 'super_admin'
}
```

---

## Quick Commands Summary

```bash
# 1. Setup ADB reverse (run once per emulator session)
adb reverse tcp:5000 tcp:5000

# 2. Verify it's working
adb reverse --list

# 3. Restart Expo
npx expo start --clear
```

That's it! The USB tethering issue should be resolved.
