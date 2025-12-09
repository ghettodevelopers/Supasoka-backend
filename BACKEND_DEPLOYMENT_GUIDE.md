# Backend Deployment Guide - Render.com

## 🚀 Quick Deployment Steps

### Option 1: Deploy via Render Dashboard (Recommended)

#### Step 1: Prepare Repository
```bash
cd c:\Users\ayoub\Supasoka\backend

# Make sure all changes are committed
git add .
git commit -m "Backend ready for deployment with all fixes"
git push origin main
```

#### Step 2: Create Render Service
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **Supasoka** repository

#### Step 3: Configure Service
```
Name: supasoka-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npx prisma generate && npx prisma db push --accept-data-loss
Start Command: npm run start:prod
Plan: Free
```

#### Step 4: Set Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

**Required Variables:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=Ghettodevelopers@gmail.com
ADMIN_PASSWORD=Chundabadi
ALLOWED_ORIGINS=https://supasoka-backend.onrender.com,capacitor://localhost,http://localhost:3000
```

**Optional Variables:**
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

#### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Check logs for any errors
4. Test the deployment

---

### Option 2: Deploy via Render Blueprint (Faster)

#### Step 1: Push render.yaml
```bash
cd c:\Users\ayoub\Supasoka\backend
git add render.yaml
git commit -m "Add Render deployment configuration"
git push origin main
```

#### Step 2: Deploy from Blueprint
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your repository
4. Select **Supasoka** repository
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

#### Step 3: Set Secret Environment Variables
After deployment starts, set these manually:
```
DATABASE_URL=postgresql://user:password@host:5432/database
ADMIN_PASSWORD=Chundabadi
```

---

## 🗄️ Database Setup (PostgreSQL)

### Option 1: Use Render PostgreSQL (Recommended)

#### Create Database:
1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   ```
   Name: supasoka-db
   Database: supasoka
   User: supasoka_user
   Region: Oregon (same as backend)
   Plan: Free
   ```
3. Click **"Create Database"**
4. Wait for provisioning (2-3 minutes)

#### Get Connection String:
1. Open the database in dashboard
2. Copy **"Internal Database URL"**
3. Add to backend environment variables as `DATABASE_URL`

#### Connect Backend to Database:
1. Go to backend service settings
2. Add environment variable:
   ```
   DATABASE_URL=<paste internal database URL>
   ```
3. Redeploy backend

### Option 2: Use External PostgreSQL

You can use:
- **Supabase** (Free tier available)
- **ElephantSQL** (Free tier available)
- **Neon** (Free tier available)
- **Railway** (Free tier available)

Get the connection string and add it to `DATABASE_URL`.

---

## ✅ Deployment Checklist

### Pre-Deployment:
- [ ] All code committed and pushed to GitHub
- [ ] `package.json` has correct scripts
- [ ] `render.yaml` created (if using Blueprint)
- [ ] Database ready (PostgreSQL)
- [ ] Environment variables prepared

### During Deployment:
- [ ] Service created on Render
- [ ] Environment variables set
- [ ] Build command configured
- [ ] Start command configured
- [ ] Health check path set to `/health`

### Post-Deployment:
- [ ] Check deployment logs for errors
- [ ] Test health endpoint: `https://supasoka-backend.onrender.com/health`
- [ ] Test API endpoints
- [ ] Verify database connection
- [ ] Test admin login
- [ ] Check Socket.IO connection

---

## 🧪 Testing Deployment

### 1. Health Check
```bash
curl https://supasoka-backend.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### 2. Test Admin Login
```bash
curl -X POST https://supasoka-backend.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Ghettodevelopers@gmail.com",
    "password": "Chundabadi"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "email": "Ghettodevelopers@gmail.com"
  }
}
```

### 3. Test Channels Endpoint
```bash
curl https://supasoka-backend.onrender.com/api/channels
```

**Expected Response:**
```json
{
  "channels": [...]
}
```

### 4. Test Socket.IO
Open browser console and run:
```javascript
const socket = io('https://supasoka-backend.onrender.com');
socket.on('connect', () => console.log('Connected!'));
```

---

## 🔧 Environment Variables Reference

### Required Variables:

#### `DATABASE_URL`
PostgreSQL connection string
```
postgresql://username:password@host:5432/database?schema=public
```

#### `JWT_SECRET`
Secret key for JWT tokens (minimum 32 characters)
```
your-super-secret-jwt-key-minimum-32-characters-long
```

#### `ADMIN_EMAIL`
Admin login email
```
Ghettodevelopers@gmail.com
```

#### `ADMIN_PASSWORD`
Admin login password
```
Chundabadi
```

### Optional Variables:

#### `PORT`
Server port (Render sets this automatically)
```
10000
```

#### `NODE_ENV`
Environment mode
```
production
```

#### `JWT_EXPIRES_IN`
JWT token expiration
```
7d
```

#### `ALLOWED_ORIGINS`
CORS allowed origins (comma-separated)
```
https://supasoka-backend.onrender.com,capacitor://localhost,http://localhost:3000
```

#### `RATE_LIMIT_WINDOW_MS`
Rate limit time window in milliseconds
```
900000
```

#### `RATE_LIMIT_MAX_REQUESTS`
Maximum requests per window
```
1000
```

---

## 📊 Monitoring & Logs

### View Logs:
1. Go to Render Dashboard
2. Select your service
3. Click **"Logs"** tab
4. View real-time logs

### Key Log Messages to Look For:
```
✅ Database connected successfully
✅ Server running on port 10000
✅ Socket.IO server initialized
✅ Admin user created/verified
🚀 Supasoka Backend is ready!
```

### Check Metrics:
1. Go to **"Metrics"** tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## 🔄 Updating Deployment

### Auto-Deploy (Recommended):
1. Make changes to code
2. Commit and push to GitHub
   ```bash
   git add .
   git commit -m "Update backend"
   git push origin main
   ```
3. Render automatically detects changes
4. Deployment starts automatically
5. Wait 5-10 minutes for completion

### Manual Deploy:
1. Go to Render Dashboard
2. Select your service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deployment

---

## 🐛 Troubleshooting

### Issue 1: Build Failed
**Check**:
- Build logs for errors
- `package.json` scripts
- Node version compatibility

**Solution**:
- Fix errors in code
- Ensure `engines` in package.json matches Render's Node version
- Check Prisma schema for errors

### Issue 2: Database Connection Failed
**Check**:
- `DATABASE_URL` is correct
- Database is running
- Network connectivity

**Solution**:
- Verify connection string format
- Check database status in Render
- Ensure database and backend are in same region

### Issue 3: App Crashes on Start
**Check**:
- Start command is correct
- Environment variables are set
- Port configuration

**Solution**:
- Check logs for error messages
- Verify `npm run start:prod` works locally
- Ensure `PORT` environment variable is set

### Issue 4: 502 Bad Gateway
**Check**:
- App is listening on correct port
- Health check endpoint works
- App started successfully

**Solution**:
- Check if app is listening on `process.env.PORT`
- Verify `/health` endpoint returns 200
- Review startup logs

---

## 🔐 Security Best Practices

### 1. Environment Variables:
- ✅ Never commit `.env` file
- ✅ Use strong `JWT_SECRET` (32+ characters)
- ✅ Use strong admin password
- ✅ Rotate secrets regularly

### 2. CORS Configuration:
- ✅ Only allow necessary origins
- ✅ Don't use `*` in production
- ✅ Include mobile app origins

### 3. Rate Limiting:
- ✅ Enable rate limiting
- ✅ Set appropriate limits
- ✅ Monitor for abuse

### 4. Database:
- ✅ Use strong database password
- ✅ Enable SSL connection
- ✅ Regular backups
- ✅ Monitor connections

---

## 📱 Update Mobile Apps

After deployment, update mobile apps with new backend URL:

### AdminSupa (`src/config/api.js`):
```javascript
const PRODUCTION_URL = 'https://supasoka-backend.onrender.com/api';
```

### Supasoka User App:
Update socket URLs and API endpoints to:
```javascript
const SOCKET_URL = 'https://supasoka-backend.onrender.com';
const API_BASE_URL = 'https://supasoka-backend.onrender.com/api';
```

---

## 🎯 Production URL

After successful deployment, your backend will be available at:
```
https://supasoka-backend.onrender.com
```

### API Endpoints:
- Health: `https://supasoka-backend.onrender.com/health`
- Channels: `https://supasoka-backend.onrender.com/api/channels`
- Admin Login: `https://supasoka-backend.onrender.com/api/admin/login`
- Users: `https://supasoka-backend.onrender.com/api/users`
- Notifications: `https://supasoka-backend.onrender.com/api/notifications`

### Socket.IO:
```
wss://supasoka-backend.onrender.com
```

---

## ✅ Deployment Complete!

Once deployed successfully:
1. ✅ Backend running on Render.com
2. ✅ Database connected
3. ✅ API endpoints working
4. ✅ Socket.IO functioning
5. ✅ Admin panel accessible
6. ✅ Mobile apps can connect
7. ✅ Auto-deploy enabled

Your Supasoka backend is now live and ready for production use! 🎉
