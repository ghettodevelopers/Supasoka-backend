# ⚡ Quick Setup Guide - Render.com + PostgreSQL

## 🎯 5-Minute Setup for Push Notifications

### Step 1: Add Pushy API Key to Render.com (2 minutes)

1. **Get Pushy API Key:**
   - Go to https://pushy.me/dashboard
   - Select your "Supasoka" app
   - Copy **Secret API Key** (looks like: `a1b2c3d4e5f6...`)

2. **Add to Render.com:**
   - Go to https://dashboard.render.com
   - Select your `supasoka-backend` web service
   - Click **"Environment"** in left sidebar
   - Click **"Add Environment Variable"**
   - **Key**: `PUSHY_SECRET_API_KEY`
   - **Value**: `[paste your Pushy secret key]`
   - Click **"Save Changes"**
   - Service will auto-redeploy (wait 2-3 minutes)

### Step 2: Verify Push Notifications Work (3 minutes)

1. **Test from AdminSupa:**
   - Open AdminSupa dashboard
   - Go to **Notifications** section
   - Send test notification:
     - Title: "Test"
     - Message: "Testing push notifications"
     - Click **Send**

2. **Check Response:**
   ```json
   {
     "success": true,
     "stats": {
       "totalUsers": 40,
       "onlineUsers": 1,
       "offlineUsers": 39,
       "pushSent": 40,  // ✅ Should be > 0
       "pushFailed": 0
     }
   }
   ```

3. **Verify on Mobile:**
   - Kill Supasoka app on test device
   - Wait 5 seconds
   - Check device status bar → notification should appear ✅

## ✅ That's It!

If you see `pushSent: 40` (or your user count), push notifications are working perfectly!

---

## 🔍 Current Environment Variables on Render.com

Your backend should have these set:

| Variable | Value | Status |
|----------|-------|--------|
| `NODE_ENV` | `production` | ✅ Set |
| `DATABASE_URL` | `postgresql://...` | ✅ Set (from PostgreSQL) |
| `JWT_SECRET` | `[auto-generated]` | ✅ Set |
| `ADMIN_EMAIL` | `Ghettodevelopers@gmail.com` | ✅ Set |
| `ADMIN_PASSWORD` | `Chundabadi` | ✅ Set |
| `PUSHY_SECRET_API_KEY` | `[your key]` | ⚠️ **ADD THIS** |
| `ALLOWED_ORIGINS` | `https://supasoka-backend.onrender.com,...` | ✅ Set |

## 🐛 Troubleshooting

### Issue: "0 push sent"

**Cause:** PUSHY_SECRET_API_KEY not set or invalid

**Fix:**
1. Check Render.com → Environment → Verify `PUSHY_SECRET_API_KEY` exists
2. Verify key is correct (copy from Pushy dashboard)
3. Redeploy service after adding key

### Issue: "No users with device tokens"

**Cause:** Users haven't opened the app yet

**Fix:**
1. Open Supasoka app on at least one device
2. App will auto-register device token
3. Check database:
   ```sql
   SELECT COUNT(*) FROM users WHERE "deviceToken" IS NOT NULL;
   ```

### Issue: "Database connection failed"

**Cause:** DATABASE_URL incorrect or database not running

**Fix:**
1. Go to Render.com → PostgreSQL database
2. Copy **Internal Database URL**
3. Update `DATABASE_URL` in web service environment
4. Save and redeploy

## 📊 Check Backend Logs

View real-time logs on Render.com:

1. Go to https://dashboard.render.com
2. Select `supasoka-backend`
3. Click **"Logs"** tab
4. Look for:
   ```
   ✅ Push notifications configured
   📱 Sending push notifications to X users
   ✅ Push notification sent successfully!
   ```

## 🎯 Production URLs

- **Backend**: https://supasoka-backend.onrender.com
- **Health Check**: https://supasoka-backend.onrender.com/health
- **Admin Login**: https://supasoka-backend.onrender.com/api/auth/admin/login

## 📱 Mobile App Configuration

**Already configured** - no changes needed! The app automatically uses:
- Primary: `https://supasoka-backend.onrender.com`
- Fallback: Local development servers

## ✨ Success Indicators

Push notifications are working when you see:

1. **In AdminSupa response:**
   - `pushSent: 40` (matches your user count)
   - `pushFailed: 0`

2. **In Render.com logs:**
   - `✅ Push notification sent successfully!`
   - `Devices: 40`

3. **On mobile devices:**
   - Notification appears in status bar
   - Sound/vibration plays
   - Tapping opens the app

---

**Need Help?**
- Check full guide: `RENDER_PRODUCTION_SETUP.md`
- View push notification docs: `docs/PUSH_NOTIFICATION_SYSTEM.md`
- Pushy setup: `docs/PUSHY_SETUP_GUIDE.md`
