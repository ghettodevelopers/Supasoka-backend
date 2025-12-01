# 📱 Build APK Guide - Supasoka

## Current Build Status
✅ Bundle created successfully
🔄 Building release APK... (in progress)

---

## Build Commands Used

### 1. Create JavaScript Bundle
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
```

**What it does**:
- Bundles all JavaScript code
- Optimizes for production
- Copies assets to Android resources

### 2. Build Release APK
```bash
cd android
./gradlew assembleRelease
```

**What it does**:
- Compiles native Android code
- Links all dependencies
- Creates release APK
- Takes 5-10 minutes

---

## APK Location

Once the build completes, your APK will be at:

```
c:\Users\ayoub\Supasoka\android\app\build\outputs\apk\release\app-release.apk
```

---

## Install APK on Device

### Method 1: USB Cable
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Method 2: File Transfer
1. Copy `app-release.apk` to your phone
2. Open file on phone
3. Allow "Install from Unknown Sources" if prompted
4. Tap "Install"

### Method 3: Share via Cloud
1. Upload APK to Google Drive / Dropbox
2. Download on phone
3. Install

---

## Build Types

### Debug APK (Fast, for testing)
```bash
cd android
./gradlew assembleDebug
```
Location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Optimized, for distribution)
```bash
cd android
./gradlew assembleRelease
```
Location: `android/app/build/outputs/apk/release/app-release.apk`

---

## Troubleshooting

### Build Fails
```bash
# Clean build
cd android
./gradlew clean

# Try again
./gradlew assembleRelease
```

### Out of Memory
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
```

### Missing Dependencies
```bash
npm install
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## APK Signing (For Play Store)

### Generate Keystore
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore supasoka-release.keystore -alias supasoka -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing
Edit `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('supasoka-release.keystore')
        storePassword 'your-password'
        keyAlias 'supasoka'
        keyPassword 'your-password'
    }
}
```

### Build Signed APK
```bash
cd android
./gradlew assembleRelease
```

---

## Build Size Optimization

### Enable ProGuard
In `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Enable App Bundle (Smaller)
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Quick Commands

### Full Build Process
```bash
# 1. Clean
cd android
./gradlew clean

# 2. Bundle JS
cd ..
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 3. Build APK
cd android
./gradlew assembleRelease

# 4. Install on device
cd ..
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Check Build Progress
```bash
cd android
./gradlew assembleRelease --info
```

---

## Current Build

**Status**: 🔄 Building...

**Estimated Time**: 5-10 minutes

**Next Steps**:
1. Wait for build to complete
2. Find APK at: `android/app/build/outputs/apk/release/app-release.apk`
3. Transfer to phone
4. Install and test

---

## Features in This Build

✅ **Home Screen**
- YouTube-style shimmer loading
- Offline detection modal
- Pull-to-refresh

✅ **All Channels Screen**
- Search box
- Category cards (Vyote, Sports, News, etc.)
- Channel counts
- Empty categories shown

✅ **Player Screen**
- Universal format support (M3U8, HLS, MPD, DRM)
- Fullscreen with rotation
- Smooth orientation transitions
- Coming Soon modal
- Unlock modals (no alerts)

✅ **User Profile**
- Watch ads for points
- Fixed AdMob errors

✅ **Admin Features**
- Grant subscriptions
- Send notifications
- Manage users

---

**Build Started**: November 30, 2025
**Build Type**: Release APK
**Platform**: Android

---

## After Installation

### Test Checklist
- [ ] App opens successfully
- [ ] Home screen loads
- [ ] Shimmer loading works
- [ ] Pull to refresh works
- [ ] Search channels works
- [ ] Category cards display
- [ ] Channel playback works
- [ ] Fullscreen rotation smooth
- [ ] Coming Soon modal shows
- [ ] User profile works
- [ ] Watch ads works
- [ ] Notifications work

---

**Good luck with testing! 🚀**
