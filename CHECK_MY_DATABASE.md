# 🔍 Check Your Supasoka Database

## Your Database Connection String
```
postgresql://supasoka:RQJyc1x5zpKSYrfATZsq7ReLWGUI8pvh@dpg-d4lbomkhg0os73b6bp3g-a/supasoka_9su4
```

## 🚀 Quick Check (Choose One Method)

### Method 1: Using psql Command Line (Fastest)

```bash
# Connect to database
psql "postgresql://supasoka:RQJyc1x5zpKSYrfATZsq7ReLWGUI8pvh@dpg-d4lbomkhg0os73b6bp3g-a/supasoka_9su4"

# Once connected, run this:
SELECT COUNT(*) as total_users, 
       COUNT("deviceToken") as users_with_tokens 
FROM users;
```

### Method 2: Using Render.com Dashboard (Easiest)

1. Go to https://dashboard.render.com
2. Select your PostgreSQL database: `supasoka_9su4`
3. Look for **"Shell"** or **"Console"** tab
4. Run this query:
```sql
SELECT COUNT(*) as total_users, 
       COUNT("deviceToken") as users_with_tokens 
FROM users;
```

### Method 3: Using Database GUI Tool

**If you have pgAdmin, TablePlus, or DBeaver:**

1. Create new connection with these details:
   - **Host**: `dpg-d4lbomkhg0os73b6bp3g-a.oregon-postgres.render.com`
   - **Port**: `5432`
   - **Database**: `supasoka_9su4`
   - **Username**: `supasoka`
   - **Password**: `RQJyc1x5zpKSYrfATZsq7ReLWGUI8pvh`
   - **SSL**: Required

2. Run the query from `CHECK_DATABASE.sql`

## 📊 What the Results Mean

### ✅ GOOD Result:
```
 total_users | users_with_tokens
-------------+-------------------
          40 |                40
```
**Meaning:** Users have device tokens registered
**Next Step:** Check if PUSHY_SECRET_API_KEY is loaded in backend

### ❌ BAD Result:
```
 total_users | users_with_tokens
-------------+-------------------
          40 |                 0
```
**Meaning:** Users exist but NO device tokens
**Solution:** Users need to open the Supasoka app

### ❌ WORSE Result:
```
 total_users | users_with_tokens
-------------+-------------------
           0 |                 0
```
**Meaning:** No users in database at all
**Solution:** Users need to open the app for first time

## 🔧 Detailed Check (Run All These)

```sql
-- 1. Total users
SELECT COUNT(*) as total_users FROM users;

-- 2. Users with device tokens
SELECT COUNT(*) as users_with_tokens 
FROM users 
WHERE "deviceToken" IS NOT NULL 
  AND "deviceToken" != '' 
  AND "deviceToken" != 'null';

-- 3. Show sample users
SELECT 
  "uniqueUserId",
  "deviceId",
  CASE 
    WHEN "deviceToken" IS NOT NULL THEN 'HAS TOKEN ✅'
    ELSE 'NO TOKEN ❌'
  END as token_status,
  "isActivated",
  "createdAt"
FROM users
ORDER BY "createdAt" DESC
LIMIT 10;

-- 4. Check recent notifications
SELECT 
  title,
  message,
  "sentAt",
  "createdAt"
FROM notifications
ORDER BY "createdAt" DESC
LIMIT 5;
```

## 🎯 Based on Results

### If users_with_tokens = 0:

**Problem:** Users haven't registered device tokens yet

**Solution:**
1. Open Supasoka app on at least one device
2. Wait 5 seconds (app auto-registers)
3. Check database again
4. Send notification from AdminSupa
5. Should now show `pushSent > 0`

### If users_with_tokens > 0 but still "0 push sent":

**Problem:** PUSHY_SECRET_API_KEY not loaded in backend

**Solution:**
1. Go to Render.com → Your backend service
2. Click **"Environment"**
3. Verify `PUSHY_SECRET_API_KEY` exists
4. Click **"Manual Deploy"** → **"Deploy latest commit"**
5. Wait 2-3 minutes
6. Check logs for "Push notifications configured"
7. Send notification again

## 📞 Report Back

After running the query, tell me:
1. **total_users**: ?
2. **users_with_tokens**: ?

Then I'll tell you exactly what to do next! 🚀
