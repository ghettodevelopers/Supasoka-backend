# API Connection Fix Guide

## Problem
The app is trying to connect to the backend but getting errors:
- Network Error - Can't reach backend
- 401 Unauthorized - Wrong credentials or URL

## Solution Depends on Your Testing Environment

### Option 1: Testing on Web Browser (Expo Web)
✅ **Use**: `http://localhost:5000/api`

Already updated in `app.json`:
```json
"extra": {
  "apiUrl": "http://localhost:5000/api",
  "socketUrl": "http://localhost:5000"
}
```

### Option 2: Testing on Android Emulator
Use: `http://10.0.2.2:5000/api`

Update `app.json`:
```json
"extra": {
  "apiUrl": "http://10.0.2.2:5000/api",
  "socketUrl": "http://10.0.2.2:5000"
}
```

### Option 3: Testing on Physical Device (Same WiFi)
Use your computer's local IP address.

**Find your IP**:
- Windows: `ipconfig` (look for IPv4 Address)
- Example: `192.168.1.100`

Update `app.json`:
```json
"extra": {
  "apiUrl": "http://192.168.1.100:5000/api",
  "socketUrl": "http://192.168.1.100:5000"
}
```

### Option 4: Testing on iOS Simulator
✅ **Use**: `http://localhost:5000/api` (same as web)

### Option 5: Use Production Backend (Render)
If you want to test with the deployed backend:
```json
"extra": {
  "apiUrl": "https://supasoka-backend.onrender.com/api",
  "socketUrl": "https://supasoka-backend.onrender.com"
}
```

**Note**: You'll need to deploy the updated backend with new credentials to Render first.

## Quick Fix Steps

1. **Identify your testing platform**:
   - Web browser? → Use `localhost:5000`
   - Android emulator? → Use `10.0.2.2:5000`
   - Physical device? → Use your computer's IP
   - iOS simulator? → Use `localhost:5000`

2. **Update `app.json`** with the correct URL

3. **Restart the Expo app**:
   ```bash
   # Stop the current app (Ctrl+C)
   # Start again
   npm start
   # or
   expo start
   ```

4. **Test login** with:
   - Email: `Ghettodevelopers@gmail.com`
   - Password: `Chundabadi`

## Verify Backend is Running

Check if backend is accessible:
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test login endpoint
curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}'
```

## Common Issues

### Network Error
- Backend not running → Start with `npm start` in backend folder
- Wrong URL → Check your testing platform and use correct URL
- Firewall blocking → Allow port 5000

### 401 Unauthorized
- Wrong credentials → Use exact: `Ghettodevelopers@gmail.com` / `Chundabadi`
- Wrong endpoint → Should be `/api/auth/admin/login`
- Backend not updated → Make sure backend has new credentials

## Current Configuration

Your `app.json` is currently set to:
```json
"apiUrl": "http://localhost:5000/api"
```

This works for:
- ✅ Web browser (Expo Web)
- ✅ iOS Simulator
- ❌ Android Emulator (use 10.0.2.2 instead)
- ❌ Physical Device (use your IP address)
