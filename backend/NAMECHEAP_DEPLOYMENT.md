# Namecheap Deployment Guide for Supasoka Backend

This guide will help you deploy your Supasoka backend to Namecheap hosting.

## Prerequisites

1. **Namecheap Account**: Active Namecheap hosting account
2. **Domain**: Your domain registered with Namecheap (or pointing to Namecheap nameservers)
3. **Node.js Support**: Ensure your Namecheap hosting plan supports Node.js applications
4. **Database**: PostgreSQL database (Namecheap shared hosting may not support PostgreSQL - consider using Namecheap VPS or external database service)

## Deployment Options

### Option 1: Namecheap Shared Hosting (Limited Node.js Support)

Namecheap shared hosting has limited Node.js support. If you need full Node.js capabilities, consider:
- **Namecheap VPS** (Recommended for Node.js apps)
- **Namecheap Dedicated Server**
- **External Node.js hosting** (Heroku, Railway, etc.) with Namecheap domain

### Option 2: Namecheap VPS (Recommended)

For full Node.js support, use Namecheap VPS hosting.

## Step 1: Prepare Your Domain

1. Log in to your Namecheap account
2. Go to **Domain List** → Select your domain
3. Configure DNS settings:
   - **A Record**: Point `api.yourdomain.com` to your server IP
   - **CNAME Record**: (Optional) Create `api` subdomain pointing to your main domain

## Step 2: Set Up Your Server

### For Namecheap VPS:

1. **SSH into your VPS**:
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Node.js** (if not pre-installed):
   ```bash
   # Using NodeSource repository
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PostgreSQL** (if using local database):
   ```bash
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   ```

4. **Install PM2** (Process Manager):
   ```bash
   sudo npm install -g pm2
   ```

5. **Install Nginx** (Reverse Proxy):
   ```bash
   sudo apt-get install nginx
   ```

## Step 3: Deploy Your Application

1. **Clone your repository**:
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/supasoka-backend.git
   cd supasoka-backend/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   npx prisma generate
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   nano .env
   ```

   Update the following variables:
   ```env
   NODE_ENV=production
   PORT=5000
   HOST=0.0.0.0
   DATABASE_URL=postgresql://user:password@localhost:5432/supasoka_db
   JWT_SECRET=your-secure-jwt-secret-key-here
   ADMIN_EMAIL=admin@supasoka.com
   ADMIN_PASSWORD=your-secure-admin-password
   ALLOWED_ORIGINS=https://api.yourdomain.com,capacitor://localhost,ionic://localhost
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Run database migrations**:
   ```bash
   npx prisma migrate deploy
   ```

5. **Start the application with PM2**:
   ```bash
   pm2 start server.js --name supasoka-backend
   pm2 save
   pm2 startup
   ```

## Step 4: Configure Nginx Reverse Proxy

1. **Create Nginx configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/supasoka-api
   ```

2. **Add the following configuration**:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/supasoka-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Step 5: Set Up SSL Certificate

1. **Install Certbot**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

3. **Auto-renewal** (already configured by Certbot):
   ```bash
   sudo certbot renew --dry-run
   ```

## Step 6: Update Application Configuration

1. **Update all domain references** in your codebase:
   - Replace `yourdomain.com` with your actual domain in:
     - `config/apiConfig.js`
     - `config/network-config.js`
     - `services/api.js`
     - `backend/server.js`
     - `AdminSupa/src/config/api.js`

2. **Update CORS settings** in `backend/server.js`:
   ```javascript
   const allowedOrigins = [
     "https://api.yourdomain.com", // Your actual domain
     // ... other origins
   ];
   ```

## Step 7: Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 8: Database Setup

### Option A: Local PostgreSQL (VPS)

1. **Create database and user**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE supasoka_db;
   CREATE USER supasoka_user WITH PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE supasoka_db TO supasoka_user;
   \q
   ```

2. **Update DATABASE_URL** in `.env`:
   ```
   DATABASE_URL=postgresql://supasoka_user:your-secure-password@localhost:5432/supasoka_db
   ```

### Option B: External Database Service

Consider using:
- **Supabase** (PostgreSQL)
- **Railway** (PostgreSQL)
- **ElephantSQL** (PostgreSQL)
- **AWS RDS** (PostgreSQL)

Update `DATABASE_URL` in `.env` with your external database connection string.

## Step 9: Monitoring and Maintenance

1. **Check application status**:
   ```bash
   pm2 status
   pm2 logs supasoka-backend
   ```

2. **Set up automatic restarts**:
   ```bash
   pm2 startup
   pm2 save
   ```

3. **Monitor server resources**:
   ```bash
   pm2 monit
   ```

## Step 10: Update Payment Gateway Webhooks

Update webhook URLs in your payment gateway dashboards:

- **TigoPesa**: `https://api.yourdomain.com/api/users/payment/callback`
- **M-Pesa**: `https://api.yourdomain.com/api/users/payment/callback`
- **Other gateways**: Update to your new domain

## Troubleshooting

### Application won't start:
```bash
pm2 logs supasoka-backend
# Check for errors in logs
```

### Database connection issues:
```bash
# Test database connection
psql -h localhost -U supasoka_user -d supasoka_db
```

### Nginx errors:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues:
```bash
sudo certbot certificates
sudo certbot renew
```

## Environment Variables Reference

Required environment variables for production:

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@supasoka.com
ADMIN_PASSWORD=your-secure-password
ALLOWED_ORIGINS=https://api.yourdomain.com,capacitor://localhost,ionic://localhost
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Additional Resources

- [Namecheap VPS Documentation](https://www.namecheap.com/support/knowledgebase/article.aspx/9776/2237/)
- [Node.js on Linux](https://nodejs.org/en/download/package-manager/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Reverse Proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Let's Encrypt SSL](https://letsencrypt.org/docs/)

## Support

If you encounter issues:
1. Check application logs: `pm2 logs supasoka-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -u nginx`
4. Verify DNS settings in Namecheap dashboard
5. Ensure firewall allows traffic on ports 80 and 443


