# Supasoka Backend - Namecheap Deployment Guide

## 🎯 Overview

Your Supasoka backend is now ready for deployment on Namecheap hosting. All Render.com-specific files and configurations have been removed, and the codebase has been optimized for Namecheap deployment.

## ✅ What Was Changed

### Files Removed
- ✅ `.env.render` - Render-specific environment template
- ✅ `render.yaml.backup` - Render deployment configuration
- ✅ `render-setup.js` - Render setup script
- ✅ `deploy-to-render.js` - Render deployment automation
- ✅ `server-render-ready.js` - Render-specific server
- ✅ `server-auth-fix.js` - Duplicate minimal server
- ✅ `server-main.js` - Duplicate server copy
- ✅ `server-production-ready.js` - Duplicate production server
- ✅ `server-minimal-fix.js` - Duplicate minimal server
- ✅ `test-render-api.js` - Render-specific test file

### Files Updated
- ✅ `package.json` - Updated start script to use `server.js`
- ✅ `server.js` - Removed all Render.com references and comments
- ✅ `.env.production` - Updated JWT secret and port configuration

### Files Created
- ✅ `.env.namecheap` - Comprehensive Namecheap environment template

## 📋 Pre-Deployment Checklist

### 1. Update Domain Configuration

Open `server.js` and replace placeholder domains:

```javascript
// Line 34-35: Update these with your actual Namecheap domain
"https://api.yourdomain.com",  // Replace with your API domain
"https://yourdomain.com",       // Replace with your main domain
```

### 2. Configure Environment Variables

Copy `.env.namecheap` to `.env` and update the following:

```bash
# Copy the template
cp .env.namecheap .env

# Edit with your actual values
nano .env  # or use your preferred editor
```

**Required Updates:**
- `DATABASE_URL` - Your Namecheap database connection string
- `JWT_SECRET` - Generate a secure secret (see below)
- `ADMIN_EMAIL` - Your admin email
- `ADMIN_PASSWORD` - Secure admin password
- `ALLOWED_ORIGINS` - Your actual domain(s)

**Generate Secure JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Verify Dependencies

```bash
cd backend
npm install
```

All dependencies should install successfully (already verified ✅).

## 🚀 Deployment Steps for Namecheap

### Option A: Shared Hosting (cPanel)

1. **Enable Node.js Application**
   - Log into cPanel
   - Go to "Setup Node.js App"
   - Create new application:
     - Node.js version: 18.x or higher
     - Application mode: Production
     - Application root: `/home/username/supasoka-backend`
     - Application URL: Your domain or subdomain
     - Application startup file: `server.js`

2. **Upload Files**
   ```bash
   # Using FTP or cPanel File Manager, upload:
   - All backend files
   - Exclude: node_modules, .git, logs
   ```

3. **Install Dependencies via SSH**
   ```bash
   ssh username@yourdomain.com
   cd supasoka-backend
   npm install
   npm run generate  # Generate Prisma client
   ```

4. **Configure Environment**
   - Upload your `.env` file with production values
   - Ensure database credentials are correct

5. **Run Database Migrations**
   ```bash
   npm run migrate
   ```

6. **Start Application**
   - In cPanel Node.js App Manager, click "Start"
   - Or via SSH: `npm start`

### Option B: VPS Hosting

1. **Connect to VPS**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PostgreSQL** (if not already installed)
   ```bash
   sudo apt-get install postgresql postgresql-contrib
   ```

4. **Clone/Upload Your Code**
   ```bash
   cd /var/www
   git clone your-repo-url supasoka-backend
   # Or upload via SCP/SFTP
   cd supasoka-backend
   ```

5. **Install Dependencies**
   ```bash
   npm install
   npm run generate
   ```

6. **Configure Environment**
   ```bash
   cp .env.namecheap .env
   nano .env  # Update with your values
   ```

7. **Setup Database**
   ```bash
   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE supasoka_db;
   CREATE USER supasoka_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE supasoka_db TO supasoka_user;
   \q

   # Run migrations
   npm run migrate
   ```

8. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name supasoka-backend
   pm2 save
   pm2 startup
   ```

9. **Configure Nginx (Reverse Proxy)**
   ```bash
   sudo nano /etc/nginx/sites-available/supasoka
   ```

   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:10000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable and restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/supasoka /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Setup SSL with Let's Encrypt**
    ```bash
    sudo apt-get install certbot python3-certbot-nginx
    sudo certbot --nginx -d api.yourdomain.com
    ```

## 🔍 Verification

### 1. Health Check
```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": 123,
  "environment": "production",
  "database": "connected"
}
```

### 2. Test Admin Login
```bash
curl -X POST https://api.yourdomain.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@supasoka.com","password":"admin123"}'
```

### 3. Test Channels Endpoint
```bash
curl https://api.yourdomain.com/api/channels
```

## 📱 Update Mobile Apps

After deployment, update your mobile apps with the new API URL:

### React Native App
Update `.env.production` in the mobile app:
```bash
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_SOCKET_URL=https://api.yourdomain.com
```

### Admin App
Update API configuration in AdminSupa:
```javascript
const API_URL = 'https://api.yourdomain.com/api';
```

## 🔧 Troubleshooting

### Server Won't Start
- Check logs: `pm2 logs supasoka-backend` (VPS) or cPanel error logs
- Verify `.env` file exists and has correct values
- Ensure database is accessible

### Database Connection Failed
- Verify `DATABASE_URL` in `.env`
- Check database server is running
- Ensure firewall allows database connections

### CORS Errors
- Update `ALLOWED_ORIGINS` in `.env`
- Restart the server after changes

### 502 Bad Gateway (Nginx)
- Check if Node.js app is running: `pm2 status`
- Verify port 10000 is correct in Nginx config
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## 📊 Monitoring

### Check Server Status (PM2)
```bash
pm2 status
pm2 logs supasoka-backend
pm2 monit
```

### Check Server Uptime
```bash
curl https://api.yourdomain.com/health | jq '.uptime'
```

## 🔐 Security Recommendations

1. **Change Default Credentials**
   - Update `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
   - Use strong, unique passwords

2. **Secure JWT Secret**
   - Generate a new random JWT_SECRET
   - Never commit `.env` to version control

3. **Enable HTTPS**
   - Always use SSL/TLS in production
   - Use Let's Encrypt for free SSL certificates

4. **Configure Firewall**
   - Only allow necessary ports (80, 443, 22)
   - Restrict database access to localhost

5. **Regular Updates**
   ```bash
   npm audit
   npm update
   ```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all environment variables are set correctly
4. Ensure your Namecheap hosting supports Node.js 18+

## ✨ Next Steps

1. Deploy the backend to Namecheap
2. Update mobile app API URLs
3. Test all functionality (login, channels, subscriptions)
4. Monitor server performance
5. Set up automated backups for the database

---

**Congratulations!** Your Supasoka backend is ready for Namecheap deployment! 🎉
