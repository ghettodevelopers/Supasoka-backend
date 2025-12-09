# Rewarded Ads Troubleshooting Guide

## ✅ What Was Fixed

### 1. **Enhanced Error Handling**
- Added detailed error codes and meanings
- Better retry logic with adaptive delays
- Network error detection with longer retry delays

### 2. **Consent Management**
- Added GDPR/COPPA consent handling
- Automatic consent form display when required
- Graceful fallback if consent not needed

### 3. **Better Diagnostics**
- Added `getDiagnostics()` method
- Added `printDiagnostics()` for console logging
- Detailed initialization logging

### 4. **App State Management**
- Auto-reload ads when app comes to foreground
- Prevents stale ad instances
- Better lifecycle management

### 5. **Improved Initialization**
- Better error messages in Swahili
- Initialization status checks
- Request configuration for better ad delivery

## 🔍 How to Debug Ad Issues

### Step 1: Check Console Logs
When you click "Angalia Matangazo", look for these logs:

```
🚀 Initializing AdMob in UserAccount...
📱 Platform: android
🔧 Environment: Development (Test Ads)
🆔 Ad Unit ID: ca-app-pub-3940256099942544/5224354917
✅ AdMob initialized successfully
🔍 AdMob Diagnostics: {
  initialized: true,
  isAdLoaded: true,
  isAdLoading: false,
  loadAttempts: 0,
  ...
}
```

### Step 2: Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 0 | Internal error | Restart app |
| 1 | Invalid request | Check ad unit ID |
| 2 | Network error | Check internet connection |
| 3 | No fill | Normal - try again later |
| 8 | Invalid ad unit ID | Check AndroidManifest.xml |
| 9 | App ID missing | Check AndroidManifest.xml |

### Step 3: Verify Configuration

#### Check AndroidManifest.xml
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-5619803043988422~5036677593"/>
```

#### Check adMobService.js
```javascript
const ADMOB_CONFIG = {
  appId: 'ca-app-pub-5619803043988422~5036677593',
  rewardedAdUnitId: __DEV__
    ? TestIds.REWARDED // Test ads in dev
    : 'ca-app-pub-5619803043988422/4588410442', // Real ads in production
};
```

## 🧪 Testing Steps

### 1. **Test in Development Mode**
- Uses Google test ads (always available)
- Should load instantly
- No real ad inventory issues

```bash
npx react-native run-android
```

### 2. **Test in Production Mode**
- Uses real ad unit ID
- May have "No fill" errors (normal)
- Requires real ad inventory

```bash
# Build release APK
cd android
./gradlew assembleRelease
```

### 3. **Manual Test Checklist**
- [ ] App starts without crashes
- [ ] Navigate to UserAccount screen
- [ ] Click "Angalia Matangazo" button
- [ ] Countdown appears (2-10 seconds)
- [ ] Ad loads and displays
- [ ] Watch ad to completion
- [ ] Receive 10 points reward
- [ ] Success modal appears
- [ ] Can watch another ad immediately

## 🔧 Common Issues & Solutions

### Issue 1: "Tangazo halipatikani"
**Cause:** Ad failed to load
**Solutions:**
1. Check internet connection
2. Wait 30 seconds and try again
3. Restart app
4. Check console for error code

### Issue 2: Ads load slowly
**Cause:** Network speed or ad inventory
**Solutions:**
1. Improved with preloading (already implemented)
2. App now preloads 2 ads in background
3. Subsequent ads load faster

### Issue 3: "No fill" errors (Error Code 3)
**Cause:** No ads available from AdMob
**Solutions:**
1. This is NORMAL - not an error
2. Try again in a few minutes
3. More common in development/testing
4. Production has better fill rates

### Issue 4: Ads don't show after watching one
**Cause:** Ad not preloaded yet
**Solutions:**
1. Already fixed - auto-preloads next ad
2. Wait 2-3 seconds between ad views
3. Check diagnostics to see if ad is loading

## 📊 Monitoring Ad Performance

### Check Ad Status Anytime
The app now logs diagnostics automatically:
- On initialization
- Before showing ad
- After ad completion
- On errors

### What to Look For
```
✅ Good Status:
{
  initialized: true,
  isAdLoaded: true,
  isAdLoading: false,
  loadAttempts: 0
}

⚠️ Loading Status:
{
  initialized: true,
  isAdLoaded: false,
  isAdLoading: true,
  loadAttempts: 1
}

❌ Error Status:
{
  initialized: true,
  isAdLoaded: false,
  isAdLoading: false,
  loadAttempts: 5  // Max attempts reached
}
```

## 🚀 Performance Improvements

### Before:
- Ads loaded on-demand (slow)
- No retry logic
- Poor error messages
- No diagnostics

### After:
- ✅ Preloads 2 ads in background
- ✅ Smart retry with exponential backoff
- ✅ Clear Swahili error messages
- ✅ Detailed diagnostics
- ✅ Auto-reload on app resume
- ✅ Better error code explanations
- ✅ Network error detection
- ✅ Consent management

## 📱 User Experience

### Fast Path (Ad Already Loaded):
1. User clicks button
2. 2-second countdown
3. Ad shows immediately
4. User watches ad
5. Gets 10 points
6. Next ad preloads

### Slow Path (Ad Not Loaded):
1. User clicks button
2. 5-10 second countdown
3. Ad loads during countdown
4. Ad shows when ready
5. User watches ad
6. Gets 10 points
7. Next ad preloads

## 🔐 Production Checklist

Before releasing to production:

- [ ] Verify real ad unit ID in `adMobService.js`
- [ ] Verify app ID in `AndroidManifest.xml`
- [ ] Test on real device (not emulator)
- [ ] Test with real internet connection
- [ ] Verify points are awarded correctly
- [ ] Test multiple ad views in sequence
- [ ] Check that ads preload properly
- [ ] Verify error messages are user-friendly

## 📞 Support

If ads still don't work after following this guide:

1. **Check Console Logs**: Look for error codes
2. **Run Diagnostics**: Call `adMobService.printDiagnostics()`
3. **Verify Configuration**: Check app ID and ad unit ID
4. **Test Internet**: Ensure stable connection
5. **Wait and Retry**: "No fill" errors are temporary

## 🎯 Expected Behavior

### Development Mode:
- ✅ Test ads always available
- ✅ Instant loading
- ✅ No "no fill" errors
- ✅ Perfect for testing

### Production Mode:
- ✅ Real ads from AdMob
- ⚠️ May have "no fill" errors (normal)
- ⚠️ Slower loading sometimes
- ✅ Better fill rates over time

## 🔄 Auto-Recovery Features

The service now includes:
- **Auto-retry**: Up to 5 attempts with delays
- **Auto-reload**: Reloads when app resumes
- **Auto-preload**: Preloads next ad after viewing
- **Smart delays**: Longer delays for network errors
- **Cleanup**: Proper cleanup on errors

All these features work automatically - no user intervention needed!
