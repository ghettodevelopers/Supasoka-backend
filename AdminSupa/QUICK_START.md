# Quick Start Guide - AdminSupa

## Installation

```bash
cd AdminSupa
npm install
```

## Running the App

### Start Development Server
```bash
npm start
```

### Run on Android
```bash
npm run android
```

### Run on iOS
```bash
npm run ios
```

### Clear Cache and Restart
```bash
npx expo start --clear
```

## First Time Setup

### 1. Backend Configuration
The app is already configured to connect to:
- **API URL**: `https://supasoka-backend.onrender.com/api`
- **Socket URL**: `https://supasoka-backend.onrender.com`

To change these, edit `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "YOUR_API_URL",
      "socketUrl": "YOUR_SOCKET_URL"
    }
  }
}
```

### 2. Get Admin Credentials
Contact your backend administrator to create an admin account or use existing credentials.

### 3. Login
1. Open the app
2. Enter admin email and password
3. Tap "Sign In"

## Main Features Overview

### 📊 Dashboard
- View system statistics
- Monitor users and channels
- Quick actions

### 👥 Users
- Activate users with custom time
- Block/unblock users
- Search and manage

### 📺 Channels
- Add/edit/delete channels
- Enable DRM protection
- Set priorities

### 🖼️ Carousel
- Manage promotional images
- Set display order

### 🔔 Notifications
- Send real-time notifications
- Broadcast to all users

### ⚙️ Settings
- Configure free trial
- Update contact info

## Common Tasks

### Activate a User
1. Go to **Users** screen
2. Search for user
3. Tap **Activate**
4. Set time (days, hours, minutes, seconds)
5. Confirm

### Add a Channel
1. Go to **Channels** screen
2. Tap **+ Add Channel**
3. Fill in details
4. Enable DRM if needed
5. Save

### Send Notification
1. Go to **Notifications** screen
2. Enter title and message
3. Select type and priority
4. Tap **Send to All Users**

## Troubleshooting

### Metro Bundler Error
```bash
npx expo start --clear
```

### Module Not Found
```bash
rm -rf node_modules
npm install
```

### Connection Issues
- Check internet connection
- Verify backend is running
- Check API URL in `app.json`

## Development Tips

### Hot Reload
- Press `r` in terminal to reload
- Shake device to open dev menu

### Debug Mode
- Open dev menu (shake device)
- Enable "Debug Remote JS"

### View Logs
- Terminal shows Metro bundler logs
- Use `console.log()` for debugging

## Building for Production

### Android APK
```bash
eas build --platform android --profile preview
```

### iOS Build
```bash
eas build --platform ios --profile preview
```

## Support

For help:
- Check `ADMIN_GUIDE.md` for detailed documentation
- Review `README.md` for technical details
- Contact development team

---

**Ready to go!** Start the app with `npm start` and scan the QR code with Expo Go.
