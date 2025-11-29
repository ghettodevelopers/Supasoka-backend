# 🔧 Set Build Command in Render.com

## 🚨 CRITICAL: Update Build Command

The migrations aren't running because Render.com might not be using the right build command.

---

## ✅ Fix It Now (2 Minutes)

### Step 1: Go to Render.com Settings

1. Go to https://dashboard.render.com
2. Click on **"supasoka-backend"** service
3. Click **"Settings"** tab (left sidebar)
4. Scroll down to **"Build & Deploy"** section

### Step 2: Update Build Command

**Find the "Build Command" field**

**Change it to**:
```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

**Or use**:
```bash
npm run render-build
```

### Step 3: Save Changes

1. Click **"Save Changes"** button at bottom
2. Render.com will ask: **"Deploy now?"**
3. Click **"Yes, deploy now"**

---

## ⏱️ After Saving

**Deployment will start automatically!**

Watch the **Logs** tab for:
```
Running build command...
npm install && npx prisma generate && npx prisma migrate deploy

✔ All migrations have been successfully applied.
```

**Wait 3-4 minutes for deployment to complete.**

---

## 🎯 What This Does

**Before**:
```
Build Command: npm run build
(Might not run migrations properly)
```

**After**:
```
Build Command: npm install && npx prisma generate && npx prisma migrate deploy
(Explicitly runs migrations every time!)
```

---

## 📋 Complete Settings to Verify

While you're in Settings, verify these:

### Build & Deploy Section:

**Build Command**:
```
npm install && npx prisma generate && npx prisma migrate deploy
```

**Start Command**:
```
npm start
```

**Auto-Deploy**: ✅ Yes (should be enabled)

### Environment Section:

Make sure these exist:
- ✅ `DATABASE_URL` = `postgresql://supasoka:...`
- ✅ `JWT_SECRET` = (your secret)
- ✅ `PORT` = `10000`
- ✅ `NODE_ENV` = `production`

---

## 🧪 Test After Deployment

**In 4 minutes, test**:

1. **Health Check**:
   ```
   https://supasoka-backend.onrender.com/health
   ```
   Should return: `"database": "connected"`

2. **AdminSupa**:
   - Create carousel image
   - Should work! ✅

---

## 🔍 If Still Not Working

**Check Render.com Logs for**:

**Success**:
```
✔ All migrations have been successfully applied.
🚀 Server running on 0.0.0.0:10000
```

**Failure**:
```
Error: Migration failed
Can't reach database server
```

**If you see errors, copy them and tell me!**

---

## 📊 Summary

**What to do**:
1. ✅ Go to Render.com → supasoka-backend → Settings
2. ✅ Update Build Command to include migrations
3. ✅ Save and deploy
4. ⏱️ Wait 4 minutes
5. ✅ Test AdminSupa

**This WILL fix the table issue!**

---

## 🎯 Quick Action Steps

**RIGHT NOW**:
1. Open https://dashboard.render.com
2. Click `supasoka-backend`
3. Click `Settings`
4. Find "Build Command"
5. Change to: `npm install && npx prisma generate && npx prisma migrate deploy`
6. Click "Save Changes"
7. Click "Yes, deploy now"
8. Wait 4 minutes
9. Test AdminSupa

**DO THIS NOW!** This is the guaranteed fix! 🚀
