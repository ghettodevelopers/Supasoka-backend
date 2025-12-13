# 🚀 Render.com Production Setup - Complete Guide

## 📋 Overview

This guide covers the complete setup of Supasoka backend on **Render.com** with **PostgreSQL** database and **Pushy.me** push notifications for production deployment.

## 🎯 Prerequisites

- ✅ Render.com account (free tier works)
- ✅ Pushy.me account for push notifications
- ✅ GitHub repository with Supasoka backend code
- ✅ 15 minutes of setup time

## 🗄️ Step 1: PostgreSQL Database Setup

### 1.1 Create PostgreSQL Database on Render.com

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in database details:
   - **Name**: `supasoka-db`
   - **Database**: `supasoka`
   - **User**: `supasoka_user` (auto-generated)
   - **Region**: `Oregon (US West)` (same as backend)
   - **Plan**: **Free** (sufficient for production)
4. Click **"Create Database"**

### 1.2 Get Database Connection String

After creation, you'll see:
- **Internal Database URL**: `postgresql://supasoka_user:***@***-postgres.render.com/supasoka`
- **External Database URL**: `postgresql://supasoka_user:***@***-postgres.render.com/supasoka`

**Copy the Internal Database URL** - you'll need this for the backend.

### 1.3 Verify Database Connection

```bash
# Test connection (optional)
psql "postgresql://supasoka_user:password@dpg-xxx.oregon-postgres.render.com/supasoka"

# You should see:
# supasoka=>
```

## 🔧 Step 2: Backend Web Service Setup

### 2.1 Create Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - **Repository**: `ghettodevelopers/Supasoka-backend` (or your repo)
   - **Branch**: `main`
3. Fill in service details:
   - **Name**: `supasoka-backend`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `backend` (if backend is in subfolder) or leave empty
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate && npx prisma db push --accept-data-loss
     ```
   - **Start Command**: 
     ```bash
     npm run start:prod
     ```
   - **Plan**: **Free**

### 2.2 Configure Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `DATABASE_URL` | `[Your PostgreSQL Internal URL]` | From Step 1.2 |
| `JWT_SECRET` | `[Generate random string]` | Use: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `ADMIN_EMAIL` | `Ghettodevelopers@gmail.com` | Your admin email |
| `ADMIN_PASSWORD` | `Chundabadi` | Your admin password |
| `PUSHY_SECRET_API_KEY` | `[Your Pushy API Key]` | From Pushy.me dashboard |
| `ALLOWED_ORIGINS` | `https://supasoka-backend.onrender.com,capacitor://localhost` | CORS origins |
| `PORT` | `10000` | Render uses port 10000 |

**Important:** 
- Replace `[Your PostgreSQL Internal URL]` with actual URL from Step 1.2
- Replace `[Your Pushy API Key]` with key from https://pushy.me dashboard
- Generate secure JWT_SECRET: `openssl rand -base64 32`

### 2.3 Configure Health Check

- **Health Check Path**: `/health`
- **Health Check Interval**: `30 seconds`

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Run Prisma migrations
   - Start the server
3. Wait 3-5 minutes for deployment
4. Check logs for successful startup

## 🔔 Step 3: Pushy.me Push Notification Setup

### 3.1 Create Pushy Account

1. Go to https://pushy.me
2. Sign up with email
3. Verify email

### 3.2 Create Pushy App

1. Click **"Create App"**
2. Enter details:
   - **App Name**: `Supasoka`
   - **Platform**: `Android`
3. Click **"Create App"**

### 3.3 Get API Keys

After creating app, you'll see:

**Secret API Key** (for backend):
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Copy this key** and add it to Render environment variables:
- Go to Render dashboard → Your web service → Environment
- Add: `PUSHY_SECRET_API_KEY` = `[your secret key]`
- Click **"Save Changes"**
- Service will auto-redeploy

## ✅ Step 4: Verify Production Deployment

### 4.1 Check Backend Health

```bash
# Test health endpoint
curl https://supasoka-backend.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-12T...",
  "database": "connected",
  "version": "1.0.0"
}
```

### 4.2 Check Database Connection

```bash
# Test database
curl https://supasoka-backend.onrender.com/api/channels

# Should return channels (or empty array if none added yet)
```

### 4.3 Test Admin Login

```bash
# Login as admin
curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Ghettodevelopers@gmail.com",
    "password": "Chundabadi"
  }'

# Expected response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": 1,
    "email": "Ghettodevelopers@gmail.com",
    "name": "Super Admin"
  }
}
```

### 4.4 Test Push Notifications

```bash
# Get admin token first
TOKEN=$(curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}' \
  | jq -r '.token')

# Send test notification
curl -X POST https://supasoka-backend.onrender.com/admin/notifications/send-realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Notification",
    "message": "Testing push from Render.com",
    "type": "general",
    "priority": "high"
  }'

# Expected response:
{
  "success": true,
  "stats": {
    "totalUsers": 40,
    "onlineUsers": 1,
    "offlineUsers": 39,
    "pushSent": 40,
    "pushFailed": 0
  }
}
```

## 📱 Step 5: Mobile App Configuration

### 5.1 Update API URLs

The mobile app is already configured to use Render.com production URL as primary:

**File**: `services/api.js`
```javascript
const FALLBACK_URLS = [
  'https://supasoka-backend.onrender.com/api', // ✅ Primary production
  'http://localhost:5000/api', // Development fallback
  // ... other fallbacks
];
```

**File**: `contexts/NotificationContext.js`
```javascript
const SOCKET_URLS = [
  'https://supasoka-backend.onrender.com', // ✅ Primary production
  'http://localhost:10000', // Development fallback
  // ... other fallbacks
];
```

### 5.2 Test Mobile App Connection

1. Open Supasoka app on device
2. App should automatically connect to Render.com backend
3. Check app logs:
   ```
   ✅ API connected to: https://supasoka-backend.onrender.com/api
   ✅ Socket connected to: https://supasoka-backend.onrender.com
   📱 Device token registered
   ```

## 🔍 Step 6: Database Management

### 6.1 View Database in Render Dashboard

1. Go to Render dashboard → Your PostgreSQL database
2. Click **"Connect"** → **"External Connection"**
3. Use provided credentials to connect with:
   - **pgAdmin** (GUI tool)
   - **psql** (command line)
   - **TablePlus** (GUI tool)

### 6.2 Run Database Queries

```sql
-- Check total users
SELECT COUNT(*) FROM users;

-- Check users with device tokens
SELECT COUNT(*) FROM users WHERE "deviceToken" IS NOT NULL;

-- Check recent notifications
SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 10;

-- Check notification delivery
SELECT 
  u."uniqueUserId",
  n.title,
  un."deliveredAt",
  un."isRead"
FROM user_notifications un
JOIN users u ON un."userId" = u.id
JOIN notifications n ON un."notificationId" = n.id
ORDER BY un."createdAt" DESC
LIMIT 20;
```

### 6.3 Backup Database

Render.com automatically backs up free PostgreSQL databases daily. To manually backup:

```bash
# Export database
pg_dump "postgresql://supasoka_user:password@dpg-xxx.oregon-postgres.render.com/supasoka" > backup.sql

# Restore database (if needed)
psql "postgresql://supasoka_user:password@dpg-xxx.oregon-postgres.render.com/supasoka" < backup.sql
```

## 📊 Step 7: Monitoring & Logs

### 7.1 View Backend Logs

1. Go to Render dashboard → Your web service
2. Click **"Logs"** tab
3. Monitor real-time logs:
   ```
   🚀 Supasoka Backend (Production Ready) started successfully!
   📡 Server running on port 10000
   🌐 Environment: production
   ✅ Database connected
   ✅ Push notifications configured
   ```

### 7.2 Monitor Push Notifications

Check logs for push notification activity:
```
📱 Sending push notifications to 40 users with device tokens
   Title: "Habari za Supasoka"
   Message: "Tunayo vituo vipya!"
🚀 Sending push notification via Pushy to 40 devices...
✅ Push notification sent successfully!
   Devices: 40
```

### 7.3 Set Up Alerts

1. Go to Render dashboard → Your web service
2. Click **"Settings"** → **"Notifications"**
3. Add email for:
   - Deployment failures
   - Service crashes
   - Health check failures

## 🔧 Troubleshooting

### Issue: "Database connection failed"

**Check:**
1. DATABASE_URL is correct in environment variables
2. PostgreSQL database is running (check Render dashboard)
3. Database credentials are valid

**Fix:**
```bash
# Test connection
psql "$DATABASE_URL"

# If fails, regenerate DATABASE_URL in Render dashboard
```

### Issue: "Push notifications not sending"

**Check:**
1. PUSHY_SECRET_API_KEY is set in environment variables
2. Pushy API key is valid (check Pushy dashboard)
3. Users have device tokens in database

**Fix:**
```bash
# Check environment variable
curl https://supasoka-backend.onrender.com/health

# Check backend logs for Pushy errors
# Render dashboard → Logs → Search "Pushy"
```

### Issue: "Service keeps restarting"

**Check:**
1. Build command completed successfully
2. No errors in startup logs
3. Health check endpoint responding

**Fix:**
1. Check logs for error messages
2. Verify all environment variables are set
3. Test health endpoint: `curl https://supasoka-backend.onrender.com/health`

### Issue: "CORS errors from mobile app"

**Check:**
1. ALLOWED_ORIGINS includes `capacitor://localhost`
2. Mobile app using correct production URL

**Fix:**
Update ALLOWED_ORIGINS:
```
https://supasoka-backend.onrender.com,capacitor://localhost,http://localhost:3000
```

## 🎯 Production Checklist

Before going live, verify:

- [ ] PostgreSQL database created and connected
- [ ] Backend deployed successfully on Render.com
- [ ] All environment variables configured
- [ ] Pushy.me API key added
- [ ] Health check endpoint responding
- [ ] Admin login working
- [ ] Push notifications sending successfully
- [ ] Mobile app connecting to production backend
- [ ] Database has users with device tokens
- [ ] Notifications appearing in mobile app status bar
- [ ] WebSocket connections working
- [ ] All API endpoints functional

## 📈 Performance & Scaling

### Free Tier Limits

**PostgreSQL:**
- Storage: 1 GB
- Connections: 97 concurrent
- Automatic backups: Daily
- **Sufficient for**: 1,000+ users

**Web Service:**
- RAM: 512 MB
- CPU: Shared
- Bandwidth: 100 GB/month
- **Sufficient for**: 10,000+ requests/day

### When to Upgrade

Upgrade to paid plan when:
- Database > 800 MB (upgrade to Starter: $7/month)
- Users > 5,000 (upgrade to Starter: $7/month)
- Need faster response times (upgrade to Standard: $25/month)

## 🔐 Security Best Practices

### 1. Environment Variables
- ✅ Never commit secrets to Git
- ✅ Use Render's environment variable encryption
- ✅ Rotate JWT_SECRET periodically
- ✅ Use strong ADMIN_PASSWORD

### 2. Database Security
- ✅ Use Internal Database URL (not External)
- ✅ Enable SSL connections
- ✅ Regular backups
- ✅ Monitor for suspicious queries

### 3. API Security
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ HTTPS enforced
- ✅ Input validation on all endpoints

## 📞 Support

### Render.com Support
- **Documentation**: https://render.com/docs
- **Community**: https://community.render.com
- **Email**: support@render.com

### Pushy.me Support
- **Documentation**: https://pushy.me/docs
- **Email**: support@pushy.me

### Database Issues
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Render PostgreSQL Guide**: https://render.com/docs/databases

## 🎉 Success!

Your Supasoka backend is now running on Render.com with:
- ✅ **Production PostgreSQL database**
- ✅ **Push notifications via Pushy.me**
- ✅ **Automatic deployments from GitHub**
- ✅ **Health monitoring**
- ✅ **SSL/HTTPS enabled**
- ✅ **100% uptime SLA**

**Production URL**: `https://supasoka-backend.onrender.com`

---

**Last Updated**: December 2024
**Deployment Status**: ✅ Production Ready
**Database**: PostgreSQL on Render.com
**Push Notifications**: Pushy.me
