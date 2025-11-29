# 🔧 Login Troubleshooting Guide

## ✅ What I Fixed

### 1. Smart API URL Detection
The app now automatically detects your platform and uses the correct URL:
- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Web Browser**: `http://localhost:5000/api`
- **Production**: `https://supasoka-backend.onrender.com/api`

### 2. Better Error Messages
Now shows specific error messages:
- Network Error → "Cannot connect to server. Make sure backend is running on port 5000."
- 401 Error → Shows the actual error from backend
- Other errors → Shows detailed error message

### 3. Console Logging
Added detailed logs to help debug:
```
🔗 API Configuration:
   Platform: web
   API URL: http://localhost:5000/api
   Socket URL: http://localhost:5000

🔐 Attempting login...
   Email: Ghettodevelopers@gmail.com
   API URL: http://localhost:5000/api
```

## 🚀 Steps to Fix Your Issue

### Step 1: Verify Backend is Running
```bash
# In backend folder
cd c:\Users\ayoub\Supasoka\backend
npm start
```

Should see:
```
📧 Admin Email: Ghettodevelopers@gmail.com
🔑 Admin Password: Chundabadi
🔐 Admin Login: http://localhost:5000/api/auth/admin/login
```

### Step 2: Test Backend Directly
Open a new terminal and test:
```bash
curl http://localhost:5000/health
```

Should return: `{"status":"OK",...}`

### Step 3: Test Login Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"Ghettodevelopers@gmail.com\",\"password\":\"Chundabadi\"}"
```

Should return: `{"success":true,"token":"...","admin":{...}}`

### Step 4: Restart Expo App
```bash
# In AdminSupa folder
cd c:\Users\ayoub\Supasoka\AdminSupa

# Stop current app (Ctrl+C if running)
# Start fresh
npm start
# or
npx expo start --clear
```

### Step 5: Check Console Logs
When you try to login, check the console for:
```
🔗 API Configuration:
   Platform: [your platform]
   API URL: [should be http://localhost:5000/api or http://10.0.2.2:5000/api]
```

### Step 6: Try Login
- Email: `Ghettodevelopers@gmail.com`
- Password: `Chundabadi`

## 🐛 Common Issues & Solutions

### Issue 1: Network Error
**Symptoms**: "Cannot connect to server"

**Solutions**:
1. ✅ Backend not running → Start with `npm start` in backend folder
2. ✅ Wrong port → Backend should be on port 5000
3. ✅ Firewall blocking → Allow port 5000 in Windows Firewall
4. ✅ Wrong URL → Check console logs for API URL

### Issue 2: 401 Unauthorized
**Symptoms**: "Invalid credentials"

**Solutions**:
1. ✅ Check exact credentials:
   - Email: `Ghettodevelopers@gmail.com` (case-sensitive!)
   - Password: `Chundabadi` (case-sensitive!)
2. ✅ Backend has old credentials → Restart backend
3. ✅ Check backend console for login attempts

### Issue 3: Platform-Specific Issues

**Android Emulator**:
- Must use `10.0.2.2` instead of `localhost`
- Already handled automatically ✅

**Physical Device**:
- Must use computer's IP address (e.g., `192.168.1.100`)
- Find IP: Run `ipconfig` in terminal
- Update `app.json` manually if needed

**iOS Simulator**:
- Can use `localhost` ✅
- Already configured

**Web Browser**:
- Can use `localhost` ✅
- Already configured

## 📋 Checklist

Before trying to login, verify:

- [ ] Backend is running (`npm start` in backend folder)
- [ ] Backend shows correct credentials in console
- [ ] Backend is accessible at `http://localhost:5000/health`
- [ ] Expo app is running (`npm start` in AdminSupa folder)
- [ ] Console shows correct API URL for your platform
- [ ] Using exact credentials: `Ghettodevelopers@gmail.com` / `Chundabadi`

## 🔍 Debug Information

When you try to login, the console will show:

```
🔗 API Configuration:
   Platform: web
   API URL: http://localhost:5000/api
   Socket URL: http://localhost:5000

🔐 Attempting login...
   Email: Ghettodevelopers@gmail.com
   API URL: http://localhost:5000/api
```

If login fails:
```
❌ Login error details:
   Error type: AxiosError
   Message: Network Error
   Status: undefined
   Response: undefined
   Full URL: http://localhost:5000/api/auth/admin/login
```

This tells you exactly what went wrong!

## 🎯 Quick Test

1. **Backend running?**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Login works?**
   ```bash
   curl -X POST http://localhost:5000/api/auth/admin/login -H "Content-Type: application/json" -d "{\"email\":\"Ghettodevelopers@gmail.com\",\"password\":\"Chundabadi\"}"
   ```

3. **Restart both**:
   - Backend: Ctrl+C, then `npm start`
   - Admin app: Ctrl+C, then `npm start`

4. **Try login again** with exact credentials

## 💡 Still Not Working?

Check the console output and share:
1. Platform you're testing on (web/android/ios)
2. API URL shown in console
3. Full error message from console
4. Backend console output when you try to login
