# 🎨 Icon Change Guide - Supasoka

## App Icon Locations

### **Android App Icon**
Replace these files with your new app icon:

#### Main Icon Files:
```
android/app/src/main/res/mipmap-hdpi/ic_launcher.png       (72x72 px)
android/app/src/main/res/mipmap-mdpi/ic_launcher.png       (48x48 px)
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png      (96x96 px)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png     (144x144 px)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png    (192x192 px)
```

#### Round Icon Files:
```
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png       (72x72 px)
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png       (48x48 px)
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png      (96x96 px)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png     (144x144 px)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png    (192x192 px)
```

### **Full Paths (Copy-Paste Ready):**
```
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-hdpi\ic_launcher.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-mdpi\ic_launcher.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-xhdpi\ic_launcher.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png

c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png
```

---

## Notification Icon Locations

### **Notification Icons (White/Transparent)**
Replace these files with your notification icon (should be white silhouette on transparent background):

```
android/app/src/main/res/drawable-hdpi/ic_notification.png       (72x72 px)
android/app/src/main/res/drawable-mdpi/ic_notification.png       (48x48 px)
android/app/src/main/res/drawable-xhdpi/ic_notification.png      (96x96 px)
android/app/src/main/res/drawable-xxhdpi/ic_notification.png     (144x144 px)
android/app/src/main/res/drawable-xxxhdpi/ic_notification.png    (192x192 px)
```

### **Full Paths (Copy-Paste Ready):**
```
c:\Users\ayoub\Supasoka\android\app\src\main\res\drawable-hdpi\ic_notification.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\drawable-mdpi\ic_notification.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\drawable-xhdpi\ic_notification.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\drawable-xxhdpi\ic_notification.png
c:\Users\ayoub\Supasoka\android\app\src\main\res\drawable-xxxhdpi\ic_notification.png
```

---

## Icon Size Requirements

### **App Icon Sizes:**
| Density | Size | Folder |
|---------|------|--------|
| mdpi | 48x48 px | mipmap-mdpi |
| hdpi | 72x72 px | mipmap-hdpi |
| xhdpi | 96x96 px | mipmap-xhdpi |
| xxhdpi | 144x144 px | mipmap-xxhdpi |
| xxxhdpi | 192x192 px | mipmap-xxxhdpi |

### **Notification Icon Sizes:**
| Density | Size | Folder |
|---------|------|--------|
| mdpi | 24x24 px | drawable-mdpi |
| hdpi | 36x36 px | drawable-hdpi |
| xhdpi | 48x48 px | drawable-xhdpi |
| xxhdpi | 72x72 px | drawable-xxhdpi |
| xxxhdpi | 96x96 px | drawable-xxxhdpi |

---

## Icon Design Guidelines

### **App Icon:**
- ✅ **Format**: PNG with transparency (or solid background)
- ✅ **Shape**: Square with rounded corners (Android will apply adaptive icon shape)
- ✅ **Colors**: Full color, vibrant, recognizable
- ✅ **Content**: Logo, brand identity, clear at small sizes
- ✅ **Background**: Can be solid color or transparent

### **Notification Icon:**
- ✅ **Format**: PNG with transparency
- ✅ **Colors**: WHITE silhouette on TRANSPARENT background
- ✅ **Shape**: Simple, recognizable silhouette
- ✅ **Content**: Simplified version of app icon or bell icon
- ✅ **Background**: MUST be transparent
- ⚠️ **Important**: Android will tint this icon, so it MUST be white/transparent

---

## Quick Icon Generation

### **Option 1: Online Tools**
Use these free tools to generate all sizes:

1. **App Icon Generator:**
   - https://appicon.co/
   - https://icon.kitchen/
   - Upload 1024x1024 px icon → Download all sizes

2. **Notification Icon Generator:**
   - https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
   - Upload icon → Select white color → Download all sizes

### **Option 2: Manual Resize**
Use image editor (Photoshop, GIMP, Figma):
1. Create base icon at 1024x1024 px
2. Resize to each required size
3. Save as PNG with transparency
4. For notification: Convert to white silhouette

---

## Step-by-Step Icon Change

### **1. Prepare Your Icons**
```
✅ App icon: 1024x1024 px (full color)
✅ Notification icon: 1024x1024 px (white on transparent)
```

### **2. Generate All Sizes**
Use online tool or manual resize to create all required sizes

### **3. Replace Files**
Copy your new icons to the folders listed above, replacing existing files

### **4. Clean Build**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### **5. Verify**
- Check app icon on home screen
- Send test notification to check notification icon
- Test on different Android versions

---

## Current Icon Configuration

### **AndroidManifest.xml**
```xml
<application
  android:icon="@mipmap/ic_launcher"
  android:roundIcon="@mipmap/ic_launcher_round"
  ...>
```

### **Notification Code (NotificationContext.js)**
```javascript
PushNotification.localNotification({
  largeIcon: 'ic_launcher',      // App icon in notification
  smallIcon: 'ic_notification',  // Small icon in status bar
  ...
});
```

---

## Troubleshooting

### **Icon Not Updating:**
1. Clean build: `cd android && ./gradlew clean`
2. Rebuild: `npm run android`
3. Uninstall app from device
4. Reinstall fresh

### **Notification Icon Not Showing:**
1. Ensure icon is WHITE on TRANSPARENT background
2. Check all drawable folders have the icon
3. Icon name must be `ic_notification.png`
4. No uppercase letters in filename

### **Icon Looks Blurry:**
1. Ensure you're using correct sizes for each density
2. Don't upscale small icons - start with large base icon
3. Use PNG format, not JPG

### **Round Icon Not Working:**
1. Some Android launchers use round icons
2. Ensure `ic_launcher_round.png` exists in all mipmap folders
3. Should be circular version of your app icon

---

## Testing Checklist

After changing icons:

- [ ] App icon shows on home screen
- [ ] App icon shows in app drawer
- [ ] App icon shows in recent apps
- [ ] Notification icon shows in status bar
- [ ] Notification icon shows in notification drawer
- [ ] Large icon shows in expanded notification
- [ ] Icons look sharp on all devices
- [ ] Round icon works on supported launchers

---

## Quick Reference

### **Just Want to Change App Icon?**
Replace these 10 files:
```
android/app/src/main/res/mipmap-*/ic_launcher.png (5 files)
android/app/src/main/res/mipmap-*/ic_launcher_round.png (5 files)
```

### **Just Want to Change Notification Icon?**
Replace these 5 files:
```
android/app/src/main/res/drawable-*/ic_notification.png (5 files)
```

### **Root Folders:**
```
App Icons: c:\Users\ayoub\Supasoka\android\app\src\main\res\mipmap-*\
Notification Icons: c:\Users\ayoub\Supasoka\android\app\src\main\res\drawable-*\
```

---

## Pro Tips

1. **Use Icon Generator**: Save time with online tools
2. **Keep Original**: Backup original icons before replacing
3. **Test Early**: Check icons before full build
4. **Consistent Branding**: Use same colors/style across all icons
5. **Simple Notification Icon**: Keep it simple for better visibility
6. **High Quality Source**: Start with 1024x1024 px or higher

---

## Need Help?

If icons still not showing:
1. Check file names match exactly (case-sensitive)
2. Ensure PNG format (not jpg, jpeg, webp)
3. Verify file sizes match requirements
4. Clean build and reinstall app
5. Check Android Studio logcat for errors

**All icon paths are now documented above! 🎨**
