# AdMob Troubleshooting Guide

## Error: "Unable to resolve module react-native-google-mobile-ads"

### Quick Fix (Run this script)
```bash
fix-admob.bat
```

### Manual Fix Steps

#### Step 1: Stop Metro Bundler
Press `Ctrl+C` in the terminal running Metro, or:
```bash
taskkill /F /IM node.exe
```

#### Step 2: Clear All Caches
```bash
# Clear Metro cache
rd /s /q %TEMP%\metro-*
rd /s /q %TEMP%\haste-map-*
rd /s /q %TEMP%\react-*

# Clear npm cache (optional)
npm cache clean --force
```

#### Step 3: Reinstall Package
```bash
npm install react-native-google-mobile-ads@latest --save
```

#### Step 4: Verify Installation
Check that the package exists:
```bash
dir node_modules\react-native-google-mobile-ads
```

You should see the directory with files.

#### Step 5: Start Metro with Clean Cache
```bash
npx react-native start --reset-cache
```

#### Step 6: In a NEW Terminal, Build App
```bash
npx react-native run-android
```

## Important Notes

### ⚠️ REWARDED VIDEO ADS ONLY
This integration uses **ONLY REWARDED VIDEO ADS**:
- ✅ Rewarded Video Ads (users watch to earn points)
- ❌ NOT Banner Ads
- ❌ NOT Interstitial Ads
- ❌ NOT Native Ads

### Ad Unit IDs
- **App ID**: `ca-app-pub-5619803043988422~5036677593`
- **Rewarded Video Ad Unit**: `ca-app-pub-5619803043988422/4588410442`

## Common Issues

### Issue 1: Module Not Found After npm install
**Cause**: Metro bundler cache not cleared

**Solution**:
```bash
# Stop Metro (Ctrl+C)
npx react-native start --reset-cache
# Then rebuild app
```

### Issue 2: Package Installed But Still Error
**Cause**: Metro bundler running with old cache

**Solution**:
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Clear temp files
rd /s /q %TEMP%\metro-*

# Restart Metro
npx react-native start --reset-cache
```

### Issue 3: Build Fails After Installation
**Cause**: Android build cache

**Solution**:
```bash
cd android
gradlew clean
cd ..
npx react-native run-android
```

### Issue 4: Ads Not Showing
**Cause**: Multiple possible reasons

**Solutions**:
1. Check internet connection
2. Verify AdMob app ID in AndroidManifest.xml
3. Wait 24-48 hours for new apps (ad inventory)
4. Use test ads in development mode
5. Check AdMob account status

### Issue 5: Points Not Awarded
**Cause**: Ad not watched completely or backend error

**Solutions**:
1. Ensure user watches full ad
2. Check console logs for errors
3. Verify backend `/user/ads/view` endpoint
4. Test with test ads first

## Verification Steps

### 1. Check Package Installation
```bash
npm list react-native-google-mobile-ads
```

Expected output:
```
react-native-google-mobile-ads@14.x.x
```

### 2. Check Import
File: `services/adMobService.js`
```javascript
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads'; // Should work
```

### 3. Check Metro Bundler
When Metro starts, you should see:
```
Welcome to Metro
Fast - Scalable - Integrated
```

No errors about missing modules.

### 4. Check App Build
```bash
npx react-native run-android
```

Should build without errors.

### 5. Test Ad Loading
1. Open app
2. Go to "Akaunti Yangu"
3. Click "Angalia Tangazo"
4. Ad should load and display

## Complete Reset (If Nothing Works)

### Nuclear Option
```bash
# 1. Stop everything
taskkill /F /IM node.exe
taskkill /F /IM adb.exe

# 2. Delete node_modules
rd /s /q node_modules

# 3. Delete package-lock.json
del package-lock.json

# 4. Clear all caches
npm cache clean --force
rd /s /q %TEMP%\metro-*
rd /s /q %TEMP%\haste-map-*
rd /s /q %TEMP%\react-*

# 5. Reinstall everything
npm install

# 6. Clean Android build
cd android
gradlew clean
cd ..

# 7. Start fresh
npx react-native start --reset-cache

# 8. In new terminal, build app
npx react-native run-android
```

## Testing Checklist

After fixing, verify:
- [ ] Metro bundler starts without errors
- [ ] App builds successfully
- [ ] No "module not found" errors
- [ ] AdMob service initializes
- [ ] Test ad loads
- [ ] Test ad displays
- [ ] Points awarded after watching
- [ ] Success message shows

## Support

### Check Logs
```bash
# Metro bundler logs
# Look for any errors in the Metro terminal

# Android logs
adb logcat | grep AdMob
```

### Expected Logs
```
✅ AdMob initialized successfully
✅ Rewarded ad loaded successfully
🎉 User earned reward
```

### If Still Not Working
1. Check `package.json` - should have `react-native-google-mobile-ads`
2. Check `node_modules` - should have the package folder
3. Check `AndroidManifest.xml` - should have AdMob app ID
4. Check Metro bundler - should start without errors
5. Check app build - should complete without errors

## Quick Reference

### Start Metro (Clean)
```bash
npx react-native start --reset-cache
```

### Build App
```bash
npx react-native run-android
```

### View Logs
```bash
adb logcat | grep -E "AdMob|Supasoka"
```

### Kill Metro
```bash
taskkill /F /IM node.exe
```

---

**Remember**: This is for **REWARDED VIDEO ADS ONLY**. Users watch video ads to earn points!
