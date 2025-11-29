# Supasoka Backend - Quick Deployment Guide for Namecheap

## Prerequisites Checklist

- [ ] Namecheap VPS or Dedicated Server (Node.js support required)
- [ ] Domain name configured in Namecheap
- [ ] SSH access to your server
- [ ] PostgreSQL database (local or external service)

## Quick Start (5 Steps)

### Step 1: Update Domain Configuration

**Replace `yourdomain.com` with your actual domain in these files:**

1. **Backend Server** - [backend/server.js](file:///c:/Users/ayoub/Supasoka/backend/server.js)
   - Line 33: `"https://api.yourdomain.com"`
   - Line 34: `"https://yourdomain.com"`

2. **AdminSupa Config** - [AdminSupa/src/config/api.js](file:///c:/Users/ayoub/Supasoka/AdminSupa/src/config/api.js)
   - Line 27: `const PRODUCTION_URL = 'https://api.yourdomain.com/api';`
   - Line 40: `const PRODUCTION_SOCKET_URL = 'https://api.yourdomain.com';`

3. **Nginx Config** - [backend/nginx/supasoka-api.conf](file:///c:/Users/ayoub/Supasoka/backend/nginx/supasoka-api.conf)
   - Line 8: `server_name api.yourdomain.com;`
   - Line 15: `server_name api.yourdomain.com;`
   - Lines 20-21: SSL certificate paths

4. **Environment Variables** - [backend/.env.production](file:///c:/Users/ayoub/Supasoka/backend/.env.production)
   - Update `DATABASE_URL` with your database credentials
   - Update `ALLOWED_ORIGINS` with your domain
   - Set secure `JWT_SECRET` and `ADMIN_PASSWORD`

### Step 2: Configure DNS (Namecheap Dashboard)

1. Log in to Namecheap
2. Go to **Domain List** → Select your domain → **Advanced DNS**
3. Add A Record:
   ```
   Type: A Record
   Host: api
   Value: [Your VPS IP Address]
   TTL: Automatic
   ```

### Step 3: Deploy to Server

**SSH into your Namecheap VPS:**
```bash
ssh root@your-server-ip
```

**Install dependencies:**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (if using local database)
sudo apt-get install postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install nginx
```

**Clone and setup:**
```bash
cd /var/www
git clone https://github.com/yourusername/supasoka-backend.git
cd supasoka-backend/backend

# Install dependencies
npm install

# Setup environment
cp .env.production .env
nano .env  # Update with your actual values

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx/supasoka-api.conf /etc/nginx/sites-available/supasoka-api

# Update domain in the config file
sudo nano /etc/nginx/sites-available/supasoka-api
# Replace 'yourdomain.com' with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/supasoka-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Setup SSL Certificate

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Verification

**Test your deployment:**

1. **Health Check:**
   ```bash
   curl https://api.yourdomain.com/health
   ```
   Should return: `{"status":"ok",...}`

2. **API Root:**
   ```bash
   curl https://api.yourdomain.com/
   ```
   Should return: `{"message":"Supasoka Backend is running! 🚀",...}`

3. **Admin Login:**
   - Open AdminSupa app
   - Try logging in with admin credentials
   - Should connect to your Namecheap backend

## Monitoring

**Check application status:**
```bash
pm2 status
pm2 logs supasoka-backend
pm2 monit
```

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/supasoka-api-access.log
sudo tail -f /var/log/nginx/supasoka-api-error.log
```

## Automated Deployment

For future updates, use the deployment script:

```bash
cd /var/www/supasoka-backend/backend
sudo bash deploy-namecheap.sh
```

## Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U supasoka_user -d supasoka_db

# Check if PostgreSQL is running
sudo systemctl status postgresql
```

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs supasoka-backend --lines 50

# Restart application
pm2 restart supasoka-backend
```

### Nginx Errors
```bash
# Test Nginx configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong JWT_SECRET
- [ ] Configured firewall (UFW)
- [ ] SSL certificate installed
- [ ] Database password is secure
- [ ] Environment variables are not committed to git

## Firewall Configuration

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Database Options

### Option A: Local PostgreSQL (on VPS)
```bash
sudo -u postgres psql
CREATE DATABASE supasoka_db;
CREATE USER supasoka_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE supasoka_db TO supasoka_user;
\q
```

Update `.env`:
```
DATABASE_URL=postgresql://supasoka_user:your-secure-password@localhost:5432/supasoka_db
```

### Option B: External Database Service

Use one of these services:
- **Supabase** (Free tier available): https://supabase.com
- **Railway** (PostgreSQL): https://railway.app
- **ElephantSQL** (Free tier): https://www.elephantsql.com

Update `.env` with the connection string provided by the service.

## Support

For detailed deployment instructions, see:
- [NAMECHEAP_DEPLOYMENT.md](file:///c:/Users/ayoub/Supasoka/backend/NAMECHEAP_DEPLOYMENT.md) - Full deployment guide

For issues:
1. Check logs: `pm2 logs supasoka-backend`
2. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `nslookup api.yourdomain.com`
4. Test database: `psql -h localhost -U supasoka_user -d supasoka_db`
