# 🔄 Restart Expo with Local Backend

## The Issue
The Metro bundler cached the old configuration that uses Render.com. We need to clear the cache and restart.

## ✅ Steps to Fix

### 1. Stop Current Expo Server
In the terminal where Expo is running, press **Ctrl+C** to stop it.

### 2. Clear Metro Cache and Restart
```bash
cd c:\Users\ayoub\Supasoka\AdminSupa
npx expo start --tunnel --clear
```

The `--clear` flag will clear the Metro bundler cache.

### 3. Reload App in Expo Go
1. Scan the new QR code
2. Or shake phone → Tap "Reload"

### 4. Verify Configuration
After reload, you should see:
```
🔗 API Configuration:
   Platform: android
   API URL: http://10.74.21.98:10000/api  ← LOCAL SERVER!
   Socket URL: http://10.74.21.98:10000
```

**NOT:**
```
   API URL: https://supasoka-backend.onrender.com/api  ← OLD!
```

## ✅ Expected Results After Reload

```
✅ Login successful
✅ Token saved
🔑 Using token from axios defaults
📤 Request: GET /admin/stats [Token: Bearer eyJ...]
✅ API Success: GET /admin/stats  ← SUCCESS!
```

## 🎯 Why This Works

The local backend (`http://10.74.21.98:10000`) has the **fixed auth middleware** that:
- Recognizes admin id 1 (hardcoded admin)
- Skips database lookup
- Accepts the token without errors

The Render.com backend still has the old code that tries to query the database.

## 📝 Alternative: Update Render.com Backend

If you want to use Render.com instead of local backend:

1. Commit the auth middleware fix:
```bash
cd c:\Users\ayoub\Supasoka\backend
git add middleware/auth.js
git commit -m "Fix: Skip database lookup for hardcoded admin (id: 1)"
git push
```

2. Render.com will auto-deploy the changes

3. Wait 2-3 minutes for deployment

4. Revert the config change to use Render.com again

But for now, **using local backend is faster and easier!**

## 🚀 Just Do This

1. **Press Ctrl+C** in the Expo terminal
2. **Run:** `npx expo start --tunnel --clear`
3. **Reload** the app in Expo Go
4. **Login** and it should work!

The fix is ready - just need to clear the cache! 🎉
