# 🚀 Deploy Backend to Render.com - Quick Guide

## ⚡ FASTEST METHOD (5 Minutes)

### Step 1: Commit and Push Code
```bash
cd c:\Users\ayoub\Supasoka

# Add all changes
git add .

# Commit with message
git commit -m "Backend ready for production deployment"

# Push to GitHub
git push origin main
```

### Step 2: Create Render Service
1. **Go to**: https://dashboard.render.com
2. **Click**: "New +" → "Web Service"
3. **Connect**: Your GitHub account (if not already)
4. **Select**: Supasoka repository
5. **Click**: "Connect"

### Step 3: Configure Service
Fill in these details:

**Basic Settings:**
```
Name: supasoka-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
```

**Build & Start:**
```
Build Command: npm install && npx prisma generate && npx prisma db push --accept-data-loss
Start Command: npm run start:prod
```

**Plan:**
```
Instance Type: Free
```

### Step 4: Add Environment Variables
Click "Advanced" → Add these variables:

**Copy and paste these one by one:**

```
NODE_ENV=production
```

```
PORT=10000
```

```
JWT_SECRET=supasoka-secret-key-2024-production-minimum-32-chars
```

```
JWT_EXPIRES_IN=7d
```

```
ADMIN_EMAIL=Ghettodevelopers@gmail.com
```

```
ADMIN_PASSWORD=Chundabadi
```

```
ALLOWED_ORIGINS=https://supasoka-backend.onrender.com,capacitor://localhost,http://localhost:3000
```

**DATABASE_URL** (You'll add this after creating database - see Step 5)

### Step 5: Create PostgreSQL Database
1. **In Render Dashboard**, click "New +" → "PostgreSQL"
2. **Configure**:
   ```
   Name: supasoka-db
   Database: supasoka
   User: supasoka_user
   Region: Oregon (same as backend!)
   Plan: Free
   ```
3. **Click**: "Create Database"
4. **Wait**: 2-3 minutes for provisioning
5. **Copy**: "Internal Database URL" from database dashboard
6. **Go back** to backend service settings
7. **Add environment variable**:
   ```
   DATABASE_URL=<paste the Internal Database URL here>
   ```

### Step 6: Deploy!
1. **Click**: "Create Web Service"
2. **Wait**: 5-10 minutes for deployment
3. **Watch logs** for any errors
4. **Look for**: "🚀 Supasoka Backend is ready!"

### Step 7: Test Deployment
Open browser and visit:
```
https://supasoka-backend.onrender.com/health
```

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🎯 Your Backend URL

After deployment, your backend will be at:
```
https://supasoka-backend.onrender.com
```

---

## 📱 Update Mobile Apps

### Update AdminSupa
File: `AdminSupa/src/config/api.js`

Change:
```javascript
const PRODUCTION_URL = 'https://supasoka-backend.onrender.com/api';
```

### Update Supasoka User App
Files to update:
- `contexts/NotificationContext.js`
- `contexts/AppStateContext.js`
- `services/api.js`

Change:
```javascript
const SOCKET_URL = 'https://supasoka-backend.onrender.com';
const API_BASE_URL = 'https://supasoka-backend.onrender.com/api';
```

---

## ✅ Deployment Checklist

- [ ] Code committed and pushed to GitHub
- [ ] Render service created
- [ ] Environment variables set
- [ ] PostgreSQL database created
- [ ] DATABASE_URL added to backend
- [ ] Deployment successful
- [ ] Health check passes
- [ ] Admin login works
- [ ] Mobile apps updated with new URL

---

## 🐛 Common Issues

### Issue: Build Failed
**Solution**: Check build logs, ensure all dependencies in package.json

### Issue: Database Connection Error
**Solution**: Verify DATABASE_URL is correct, check database is running

### Issue: 502 Bad Gateway
**Solution**: Check app is listening on PORT environment variable

### Issue: Admin Login Fails
**Solution**: Verify ADMIN_EMAIL and ADMIN_PASSWORD are set correctly

---

## 📞 Need Help?

Check the full guide: `BACKEND_DEPLOYMENT_GUIDE.md`

Or check Render logs:
1. Go to your service in Render Dashboard
2. Click "Logs" tab
3. Look for error messages

---

## 🎉 Success!

Once you see:
- ✅ Health check returns "healthy"
- ✅ Admin login works
- ✅ API endpoints respond
- ✅ Socket.IO connects

**Your backend is LIVE! 🚀**

Now you can:
- Use AdminSupa to manage content
- Users can watch channels
- Notifications work
- Ads system functional
- DRM channels play correctly

**Congratulations! Your Supasoka backend is deployed and ready for production!** 🎊
