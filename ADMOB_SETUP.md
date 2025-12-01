# Google AdMob Integration - Complete Setup Guide

## Overview
Fully integrated Google AdMob rewarded ads system for earning points in Supasoka app.

## AdMob Credentials
- **App ID**: `ca-app-pub-5619803043988422~5036677593`
- **Rewarded Ad Unit ID**: `ca-app-pub-5619803043988422/4588410442`

## Installation Steps

### 1. Install Dependencies
```bash
cd c:\Users\ayoub\Supasoka
npm install
# or
yarn install
```

This will install `react-native-google-mobile-ads@^14.3.1`

### 2. Link Native Dependencies (React Native 0.80+)
```bash
# For Android
cd android
./gradlew clean
cd ..

# Rebuild the app
npx react-native run-android
```

### 3. Android Configuration (Already Done)

#### AndroidManifest.xml
Located at: `android/app/src/main/AndroidManifest.xml`

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-5619803043988422~5036677593"/>
```

#### app.json
```json
{
  "react-native-google-mobile-ads": {
    "android_app_id": "ca-app-pub-5619803043988422~5036677593",
    "ios_app_id": "ca-app-pub-5619803043988422~5036677593"
  }
}
```

### 4. Build and Run
```bash
# Clean build
cd android
./gradlew clean
cd ..

# Run app
npx react-native run-android
```

## How It Works

### 1. **AdMob Service** (`services/adMobService.js`)

**Features**:
- Singleton service for managing ads
- Auto-initialization on app start
- Pre-loads ads for instant display
- Handles all ad events
- Test ads in development mode
- Real ads in production

**Key Methods**:
```javascript
// Initialize AdMob
await adMobService.initialize();

// Load rewarded ad
await adMobService.loadRewardedAd();

// Show ad and get reward
await adMobService.showRewardedAd(onReward, onError);

// Check ad status
const status = adMobService.getAdStatus();
```

### 2. **UserAccount Screen Integration**

**Flow**:
1. User clicks "Angalia Tangazo" button
2. AdMob service checks if ad is loaded
3. If not loaded, loads ad first
4. Shows rewarded video ad
5. User watches ad completely
6. User earns 10 points
7. Points added to account
8. Ad view recorded in backend
9. Success message shown
10. Next ad pre-loaded

**Code**:
```javascript
const handleWatchAd = async () => {
  setIsAdLoading(true);
  
  await adMobService.showRewardedAd(
    async (reward) => {
      // Award 10 points
      await addPoints(10, 'Tangazo');
      
      // Record in backend
      await apiService.post('/user/ads/view', {
        adType: 'rewarded',
        completed: true,
        pointsEarned: 10,
      });
      
      // Show success
      ToastAndroid.show('Hongera! Umepata points 10!');
    },
    (error) => {
      Alert.alert('Samahani', error);
    }
  );
};
```

### 3. **Test vs Production Ads**

**Development Mode** (`__DEV__ = true`):
- Uses Google test ad units
- No real impressions
- Always available
- Fast loading

**Production Mode** (`__DEV__ = false`):
- Uses your real ad unit ID
- Real impressions and revenue
- May have limited availability
- Depends on ad inventory

## User Experience

### Watching an Ad:
1. User navigates to "Akaunti Yangu" (UserAccount)
2. Sees "Points Zangu" card with current points
3. Clicks "Angalia Tangazo" button
4. Button shows "Inapakia Tangazo..." (loading state)
5. Rewarded video ad appears fullscreen
6. User watches ad (15-30 seconds typically)
7. Ad completes
8. Success message: "Hongera! Umepata points 10!"
9. Points updated in real-time
10. User can watch another ad

### Using Points:
1. User has 50+ points
2. Clicks locked channel
3. Modal appears: "Hauna Kifurushi Kwa Sasa"
4. Clicks "Angalia Bure" button
5. 50 points deducted
6. Channel unlocked
7. User can watch channel

### Earning More Points:
1. User has <50 points
2. Tries to unlock channel
3. Alert: "Ooopsss! Hauna points za kutosha..."
4. Navigates to UserAccount
5. Watches ads to earn points
6. Returns to unlock channel

## Backend Integration

### Ad View Endpoint
**POST** `/api/user/ads/view`

**Request**:
```json
{
  "adType": "rewarded",
  "completed": true,
  "pointsEarned": 10
}
```

**Response**:
```json
{
  "user": {
    "points": 60
  },
  "pointsEarned": 10,
  "message": "Earned 10 points!"
}
```

**What It Does**:
- Updates user points in database
- Creates `adView` record
- Creates `pointsHistory` entry
- Returns updated user data

## Error Handling

### Ad Not Available
```
Message: "Tangazo halipatikani kwa sasa. Tafadhali jaribu tena baadaye."
Cause: No ad inventory available
Solution: Try again later or use test ads in dev mode
```

### Ad Loading Failed
```
Message: "Imeshindikana kupakia tangazo. Tafadhali jaribu tena."
Cause: Network error or AdMob service issue
Solution: Check internet connection and retry
```

### Ad Closed Early
```
Result: No reward given
Cause: User closed ad before completion
Solution: User must watch full ad to earn points
```

## Testing

### Test in Development
1. Build app in debug mode
2. AdMob automatically uses test ads
3. Test ads always available
4. No real revenue generated

### Test in Production
1. Build release APK
2. Install on real device
3. Real ads will show (may be limited initially)
4. Real impressions counted
5. Real revenue generated

### Verify Integration
```bash
# Check logs for AdMob initialization
adb logcat | grep AdMob

# Expected output:
# ✅ AdMob initialized successfully
# ✅ Rewarded ad loaded successfully
# 🎉 User earned reward
```

## AdMob Dashboard

### View Statistics:
1. Go to https://apps.admob.google.com
2. Login with your Google account
3. Select "Supasoka" app
4. View metrics:
   - Impressions
   - Clicks
   - Revenue
   - eCPM (earnings per 1000 impressions)

### Ad Units:
- **Rewarded Video**: `ca-app-pub-5619803043988422/4588410442`
  - Format: Video
  - Reward: 10 points
  - Duration: 15-30 seconds
  - Skippable: No

## Revenue Potential

### Estimated Earnings:
- **eCPM**: $1-5 (varies by region)
- **Per ad view**: $0.001-0.005
- **100 ad views**: $0.10-0.50
- **1000 ad views**: $1-5
- **10,000 ad views**: $10-50

### Factors Affecting Revenue:
- User location (higher in US/EU)
- Ad quality and relevance
- User engagement
- Time of year (higher in Q4)
- App category

## Troubleshooting

### Issue: Ads Not Showing
**Solutions**:
1. Check internet connection
2. Verify AdMob app ID in AndroidManifest.xml
3. Ensure app is approved in AdMob dashboard
4. Wait 24-48 hours after app approval
5. Check AdMob account status

### Issue: "Ad failed to load"
**Solutions**:
1. Check ad unit ID is correct
2. Verify app ID matches AdMob dashboard
3. Ensure device has internet
4. Try test ads in dev mode
5. Check AdMob account for violations

### Issue: Points Not Awarded
**Solutions**:
1. Check backend `/user/ads/view` endpoint
2. Verify `addPoints` function works
3. Check console logs for errors
4. Ensure ad was watched completely
5. Test with test ads first

## Best Practices

### 1. **Ad Frequency**
- Don't show ads too frequently
- Limit to 1 ad per minute
- Respect user experience
- Provide value for watching

### 2. **User Experience**
- Clear call-to-action
- Show loading states
- Provide feedback on success
- Handle errors gracefully

### 3. **Compliance**
- Follow AdMob policies
- Don't incentivize clicks
- Don't force users to watch
- Provide alternative options (payment)

### 4. **Testing**
- Always test in dev mode first
- Test error scenarios
- Verify points are awarded
- Check backend integration

## Files Modified

### New Files:
- `services/adMobService.js` - AdMob service singleton
- `ADMOB_SETUP.md` - This documentation

### Modified Files:
- `package.json` - Added react-native-google-mobile-ads
- `app.json` - Added AdMob configuration
- `android/app/src/main/AndroidManifest.xml` - Added AdMob app ID
- `screens/UserAccount.js` - Integrated real ad watching

## Next Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Clean Build**:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

3. **Run App**:
   ```bash
   npx react-native run-android
   ```

4. **Test Ads**:
   - Open app
   - Go to "Akaunti Yangu"
   - Click "Angalia Tangazo"
   - Watch test ad
   - Verify 10 points awarded

5. **Deploy to Production**:
   - Build release APK
   - Upload to Play Store
   - Wait for AdMob approval
   - Monitor earnings

## Support

### AdMob Support:
- https://support.google.com/admob

### React Native Google Mobile Ads:
- https://docs.page/invertase/react-native-google-mobile-ads

### Issues:
- Check console logs
- Review AdMob dashboard
- Test with test ads
- Contact AdMob support

---

**Status**: ✅ Fully Configured and Ready to Use

**Last Updated**: November 30, 2025

**Key Achievement**: Complete AdMob integration with rewarded video ads for earning points system.
