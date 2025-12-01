# 🚀 Quick Start - AdMob Rewarded Video Ads

## ⚠️ IMPORTANT: REWARDED VIDEO ADS ONLY
This integration uses **ONLY REWARDED VIDEO ADS** where users watch videos to earn points.

## Your Credentials
- **App ID**: `ca-app-pub-5619803043988422~5036677593`
- **Rewarded Ad Unit**: `ca-app-pub-5619803043988422/4588410442`

## 🔧 Fix "Module Not Found" Error

### Option 1: Run Fix Script (Easiest)
```bash
fix-admob.bat
```

### Option 2: Manual Steps
```bash
# 1. Stop Metro (Ctrl+C in Metro terminal)

# 2. Clear cache and reinstall
npm install react-native-google-mobile-ads@latest --save
npx react-native start --reset-cache

# 3. In NEW terminal, rebuild app
npx react-native run-android
```

## ✅ How to Test

1. **Open App**
2. **Go to "Akaunti Yangu"** (bottom tab)
3. **Click "Angalia Tangazo"** button
4. **Watch the video ad** (15-30 seconds)
5. **Earn 10 points!** ✨

## 📱 User Flow

```
User clicks "Angalia Tangazo"
        ↓
Rewarded video ad loads
        ↓
User watches full video
        ↓
User earns 10 points
        ↓
Points added to balance
        ↓
Success message shown
```

## 🎯 Using Points

- **50 points** = Unlock 1 channel
- **Unlimited ads** per day
- **Real-time** balance updates

## 🐛 Troubleshooting

### Error: "Unable to resolve module"
```bash
# Run this:
fix-admob.bat

# Or manually:
taskkill /F /IM node.exe
npx react-native start --reset-cache
```

### Ads Not Showing
- ✅ Check internet connection
- ✅ Wait 24-48 hours for new apps
- ✅ Use test ads in dev mode (`__DEV__ = true`)

### Points Not Awarded
- ✅ Watch full ad (don't skip)
- ✅ Check console logs
- ✅ Verify backend is running

## 📚 Documentation

- **Setup Guide**: `ADMOB_SETUP.md`
- **Troubleshooting**: `ADMOB_TROUBLESHOOTING.md`
- **Complete Guide**: `ADMOB_INTEGRATION_COMPLETE.md`

## 💰 Revenue

- **Per ad**: $0.0005 - $0.002
- **1,000 views/day**: $15 - $60/month
- **10,000 views/day**: $150 - $600/month

---

**Status**: ✅ Ready to Use (Rewarded Video Ads Only)
