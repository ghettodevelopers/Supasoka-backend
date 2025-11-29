# 🌐 Render.com SQLite Setup

## ⚠️ Important: Render.com Environment Variable

The error you're seeing is because Render.com doesn't have the `DATABASE_URL` environment variable set.

## 🔧 Fix for Render.com

### Option 1: Add Environment Variable (Quick Fix)

1. Go to https://dashboard.render.com
2. Click on your `supasoka-backend` service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `DATABASE_URL`
   - **Value**: `file:./dev.db`
6. Click **Save Changes**
7. Render will auto-redeploy

### Option 2: Use PostgreSQL on Render.com (Recommended for Production)

SQLite on Render.com has a limitation: **data resets on every deploy** because the file system is ephemeral.

For persistent data on Render.com, use PostgreSQL:

#### Step 1: Add PostgreSQL Database

1. Go to https://dashboard.render.com
2. Click **New** → **PostgreSQL**
3. Name: `supasoka-db`
4. Region: Same as your backend (Oregon)
5. Plan: **Free** (for testing)
6. Click **Create Database**

#### Step 2: Get Connection String

1. Open your new PostgreSQL database
2. Copy the **Internal Database URL** (starts with `postgresql://`)
3. It looks like: `postgresql://user:pass@hostname/database`

#### Step 3: Update Backend Environment

1. Go to your `supasoka-backend` service
2. Go to **Environment** tab
3. Find or add `DATABASE_URL`
4. Paste the PostgreSQL connection string
5. Click **Save Changes**

#### Step 4: Update Schema (Locally)

```bash
cd c:\Users\ayoub\Supasoka\backend

# Update schema.prisma
# Change line 7 from:
#   provider = "sqlite"
# To:
#   provider = "postgresql"
```

#### Step 5: Commit and Push

```bash
git add backend/prisma/schema.prisma
git commit -m "Switch to PostgreSQL for Render.com production"
git push origin main
```

Render.com will auto-deploy and run migrations!

## 🎯 Which Option to Choose?

### Use SQLite (Option 1) if:
- ✅ Testing only
- ✅ Don't care about data persistence
- ✅ Quick setup
- ⚠️ **Data resets on every deploy**

### Use PostgreSQL (Option 2) if:
- ✅ Production use
- ✅ Need persistent data
- ✅ Multiple users
- ✅ **Data survives deploys**

## 🚀 Quick Test (Local Backend)

For immediate testing, use your local backend instead:

### 1. Make sure local backend is running:
```bash
cd c:\Users\ayoub\Supasoka\backend
npm start
```

### 2. Update AdminSupa to use local backend:

Edit `AdminSupa/src/config/api.js`:

```javascript
// Line 36-37, change to:
// Use local backend for testing
return 'http://10.74.21.98:10000/api'; // Your local IP
```

### 3. Restart AdminSupa:
```bash
cd c:\Users\ayoub\Supasoka\AdminSupa
npx expo start --clear
```

Now carousel creation will work with your local SQLite database!

## 📊 Summary

### Current Issue:
```
❌ Render.com has no DATABASE_URL
❌ Backend can't connect to database
❌ Carousel creation fails
```

### Solutions:

**Quick Fix (Testing):**
```
1. Add DATABASE_URL="file:./dev.db" to Render.com
2. Data resets on deploy
3. Good for testing only
```

**Production Fix (Recommended):**
```
1. Add PostgreSQL database on Render.com
2. Update DATABASE_URL with PostgreSQL connection
3. Change schema.prisma provider to "postgresql"
4. Push to GitHub
5. Data persists forever ✅
```

**Local Testing (Immediate):**
```
1. Use local backend (already running)
2. Update AdminSupa API URL to local IP
3. Works immediately with SQLite
4. Perfect for development
```

## 🎯 Recommended Path

For now, **use local backend** for testing:

1. ✅ Local backend already running with SQLite
2. ✅ Update AdminSupa to point to `http://10.74.21.98:10000/api`
3. ✅ Test carousel creation locally
4. ✅ Everything works!

Then later, **add PostgreSQL to Render.com** for production.

## 📝 Next Steps

Choose one:

### A. Test Locally (Fastest):
```bash
# 1. Backend already running ✅
# 2. Update AdminSupa/src/config/api.js to use local IP
# 3. Restart AdminSupa
npx expo start --clear
```

### B. Fix Render.com with SQLite (Quick):
```
1. Add DATABASE_URL="file:./dev.db" to Render.com environment
2. Save and redeploy
3. Test (data will reset on next deploy)
```

### C. Add PostgreSQL (Production):
```
1. Create PostgreSQL database on Render.com
2. Update DATABASE_URL with PostgreSQL connection
3. Change schema.prisma to use postgresql
4. Push to GitHub
5. Production ready! ✅
```

**I recommend Option A (local testing) first, then Option C (PostgreSQL) for production.**
