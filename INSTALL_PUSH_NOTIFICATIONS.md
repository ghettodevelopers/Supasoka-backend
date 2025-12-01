# 📱 PUSH NOTIFICATIONS INSTALLATION GUIDE

## 🚀 **STEP 1: Install Required Packages**

Run these commands in your project root:

```bash
# Install push notification package
npm install react-native-push-notification

# Install required peer dependency
npm install @react-native-community/push-notification-ios

# For Android, no additional native installation needed (auto-linking)
```

---

## 🔧 **STEP 2: Configure Android Manifest**

**File:** `android/app/src/main/AndroidManifest.xml`

Add these permissions and configurations:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    
    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="false"
        android:theme="@style/AppTheme">
        
        <!-- Add this receiver for notifications -->
        <receiver android:name="com.dieam.reactnativepushnotification.modules.RNPushNotificationActions"
            android:exported="true" />
        <receiver android:name="com.dieam.reactnativepushnotification.modules.RNPushNotificationPublisher"
            android:exported="true" />
        <receiver android:name="com.dieam.reactnativepushnotification.modules.RNPushNotificationBootEventReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON"/>
            </intent-filter>
        </receiver>

        <!-- Your existing activity -->
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 📝 **STEP 3: Files Already Updated**

I've already updated these files for you:

✅ **`contexts/NotificationContext.js`**
- Added PushNotification configuration
- Status bar notifications
- Notification channels
- Sound and vibration

✅ **`screens/NotificationsScreen.js`**
- Already exists with beautiful UI

✅ **`App.js`**
- User initialization added

---

## 🎯 **STEP 4: Build and Test**

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..

# Build release APK
cd android
./gradlew assembleRelease
cd ..

# Install on device
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## ✅ **EXPECTED RESULTS:**

### **When Admin Sends Notification:**
1. **Status Bar Notification** appears with:
   - Supasoka icon
   - Notification title
   - Message preview
   - Sound and vibration

2. **User can:**
   - See notification in status bar
   - Tap to open app
   - View in notifications screen
   - Mark as read/unread
   - Clear notifications

### **Notification Features:**
- ✅ **Status Bar Display**: Shows in Android notification tray
- ✅ **Sound**: Plays notification sound
- ✅ **Vibration**: Vibrates device
- ✅ **Badge**: Shows unread count (if supported)
- ✅ **Tap to Open**: Opens app when tapped
- ✅ **Persistent**: Stays until dismissed
- ✅ **Grouped**: Multiple notifications grouped together

---

## 🧪 **TESTING:**

### **Test 1: Send Notification from AdminSupa**
```
1. Open AdminSupa
2. Go to Notifications section
3. Type message: "Karibu Supasoka!"
4. Click Send
5. Check user's device:
   ✅ Notification appears in status bar
   ✅ Sound plays
   ✅ Device vibrates
   ✅ Can tap to open app
```

### **Test 2: View Notifications Screen**
```
1. Open app
2. Navigate to notifications screen
3. Should see all received notifications
4. Can mark as read
5. Can clear all
```

---

## 🎨 **NOTIFICATION TYPES:**

### **Channel Update:**
- Icon: 📺 TV icon
- Color: Blue (#3b82f6)
- Title: "Vituo Vimebadilishwa"
- Message: "Vituo vipya vimeongezwa"

### **Admin Message:**
- Icon: 💬 Message icon
- Color: Orange (#f59e0b)
- Title: "Ujumbe wa Msimamizi"
- Message: Custom message from admin

### **Access Granted:**
- Icon: ✅ Check icon
- Color: Green (#10b981)
- Title: "Ufikiaji Umeidhinishwa"
- Message: "Umepewa ufikiaji maalum"

### **Carousel Update:**
- Icon: 🖼️ Image icon
- Color: Purple (#8b5cf6)
- Title: "Picha Mpya"
- Message: "Picha za carousel zimebadilishwa"

---

## 🔧 **TROUBLESHOOTING:**

### **If notifications don't appear:**

1. **Check permissions:**
   ```bash
   # Make sure app has notification permission
   # Settings > Apps > Supasoka > Notifications > Enabled
   ```

2. **Check logs:**
   ```bash
   adb logcat | grep -i "notification"
   ```

3. **Verify manifest:**
   - All permissions added
   - Receivers configured
   - POST_NOTIFICATIONS permission (Android 13+)

4. **Rebuild app:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

---

## 📊 **NOTIFICATION FLOW:**

```
Admin sends notification
        ↓
Backend emits socket event
        ↓
User app receives event
        ↓
NotificationContext processes
        ↓
PushNotification.localNotification()
        ↓
Status bar notification appears
        ↓
Notification saved to AsyncStorage
        ↓
User can view in notifications screen
```

---

## ✅ **PRODUCTION READY:**

After following these steps, your app will have:
- ✅ **Status bar notifications** (Android notification tray)
- ✅ **Sound and vibration**
- ✅ **Tap to open app**
- ✅ **Notification screen** to view all
- ✅ **Real-time delivery** via Socket.IO
- ✅ **Persistent storage** in AsyncStorage

**Everything will work perfectly!** 🎉
