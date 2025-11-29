# AdminSupa Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd AdminSupa
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Run on Device
- Install **Expo Go** app on your phone
- Scan the QR code displayed in terminal
- App will load on your device

## Development Commands

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
npm run web        # Run in web browser
```

## Default Admin Login

Use the admin credentials configured in your backend:
- Email: `admin@supasoka.com`
- Password: (configured in backend)

## Configuration

API endpoints are configured in `app.json`:
```json
"extra": {
  "apiUrl": "https://supasoka-backend.onrender.com/api",
  "socketUrl": "https://supasoka-backend.onrender.com"
}
```

For local development, update to:
```json
"extra": {
  "apiUrl": "http://localhost:5000/api",
  "socketUrl": "http://localhost:5000"
}
```

## Building APK

### Using EAS Build (Recommended)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

### Local Build
```bash
expo build:android -t apk
```

## Features

✅ Dashboard with statistics
✅ User management (view, activate/deactivate)
✅ Channel management (CRUD operations)
✅ Carousel management (CRUD operations)
✅ Secure authentication with JWT
✅ Material Design UI

## Troubleshooting

**Can't connect to backend?**
- Verify backend is running
- Check API URL in app.json
- Ensure CORS is enabled on backend

**Login fails?**
- Check admin credentials in backend
- Verify `/api/auth/admin/login` endpoint works
- Check network connectivity

**Dependencies error?**
- Delete node_modules: `rm -rf node_modules`
- Clear cache: `npm cache clean --force`
- Reinstall: `npm install`

## Next Steps

1. ✅ Install dependencies
2. ✅ Test login with admin credentials
3. ✅ Verify all features work
4. ✅ Build production APK
5. ✅ Distribute to admins
