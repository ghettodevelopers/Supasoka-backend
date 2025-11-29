# Supasoka Backend Deployment Guide

## 🚀 Production Deployment Checklist

This guide will help you deploy the Supasoka backend to your production server safely and efficiently.

## ✅ Pre-Deployment Verification

### 1. Run Production Readiness Test
```bash
cd /home/ayoub/Projects/Supasoka/backend
node test-production-readiness.js
```

**Expected Result:** All tests should pass ✅

### 2. Current System Status
- ✅ **Backend Server**: Running on port 5000
- ✅ **Database**: PostgreSQL connected with 9 users, 4 channels, 4 carousel images
- ✅ **Admin Authentication**: Working (admin@supasoka.com / admin123)
- ✅ **API Endpoints**: All endpoints tested and functional
- ✅ **Notification System**: Real-time Socket.IO working
- ✅ **CORS Configuration**: Properly configured for Capacitor compatibility
- ✅ **Security**: Helmet, rate limiting, input validation implemented
- ✅ **Error Handling**: Comprehensive error handling and logging

## 🔧 Production Environment Setup

### 1. Update Production Environment Variables

Edit `.env.production` with your actual production values:

```bash
# CRITICAL: Replace these with your actual production values
DATABASE_URL="postgresql://username:password@your-db-host:5432/supasoka_prod"
JWT_SECRET="your_super_secure_jwt_secret_key_minimum_32_characters_long_for_production"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your_secure_admin_password"

# Replace with your actual domains
ALLOWED_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com,capacitor://localhost,http://localhost"
REACT_APP_API_URL="https://api.yourdomain.com/api"
REACT_APP_SOCKET_URL="https://api.yourdomain.com"

# Optional: Add your API keys
PUSHY_SECRET_API_KEY="your_pushy_api_key_here"
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

### 2. Database Setup

**For PostgreSQL:**
```bash
# Create production database
createdb supasoka_prod

# Run migrations
NODE_ENV=production npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Install Dependencies
```bash
npm ci --only=production
```

## 🌐 Server Deployment Options

### Option 1: Direct Node.js Deployment

```bash
# Start in production mode
npm run start:prod

# Or with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "supasoka-backend" --env production
pm2 save
pm2 startup
```

### Option 2: Using Deployment Script

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

### Option 3: Systemd Service (Linux)

```bash
# Copy service file
sudo cp supasoka-backend.service /etc/systemd/system/

# Enable and start service
sudo systemctl enable supasoka-backend
sudo systemctl start supasoka-backend

# Check status
sudo systemctl status supasoka-backend
```

## 🔒 Security Configuration

### 1. Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/supasoka-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy to Node.js backend
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
        
        # WebSocket support for Socket.IO
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/supasoka-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL Certificate Setup

**Using Let's Encrypt (Certbot):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## 📊 Monitoring and Logging

### 1. Health Check Endpoint
```bash
curl https://api.yourdomain.com/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-12T04:40:32.344Z",
  "uptime": 25.322120077,
  "environment": "production"
}
```

### 2. Log Monitoring
```bash
# View logs (if using PM2)
pm2 logs supasoka-backend

# View logs (if using systemd)
sudo journalctl -u supasoka-backend -f

# Check log files
tail -f logs/combined.log
tail -f logs/error.log
```

### 3. Performance Monitoring

**Using PM2 Monitoring:**
```bash
pm2 monit
```

**Health Check Script:**
```bash
# Run health check
./health-check.sh
```

## 🔄 Post-Deployment Steps

### 1. Verify All Endpoints

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Test admin login
curl -X POST https://api.yourdomain.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your_secure_password"}'

# Test channels endpoint
curl https://api.yourdomain.com/api/channels

# Test carousel endpoint
curl https://api.yourdomain.com/api/channels/carousel
```

### 2. Update Mobile App Configuration

Update your mobile app's API configuration to point to the production server:

```javascript
// In your mobile app's API configuration
const API_BASE_URL = 'https://api.yourdomain.com/api';
const SOCKET_URL = 'https://api.yourdomain.com';
```

### 3. Test Admin Dashboard

1. Navigate to your admin dashboard
2. Login with production credentials
3. Verify all functionality works
4. Test real-time notifications
5. Verify channel and user management

## 🚨 Troubleshooting

### Common Issues and Solutions

**1. Database Connection Issues**
```bash
# Check database connectivity
npx prisma db pull

# Verify environment variables
echo $DATABASE_URL
```

**2. Port Already in Use**
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process if needed
sudo kill -9 <PID>
```

**3. Permission Issues**
```bash
# Fix file permissions
chmod +x server.js
chmod +x deploy.sh
chmod +x health-check.sh
```

**4. SSL Certificate Issues**
```bash
# Test SSL certificate
openssl s_client -connect api.yourdomain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew
```

## 📈 Performance Optimization

### 1. Database Optimization
- Enable connection pooling
- Add database indexes for frequently queried fields
- Regular database maintenance

### 2. Caching Strategy
- Implement Redis for session storage
- Cache frequently accessed data
- Use CDN for static assets

### 3. Load Balancing
- Use multiple server instances
- Implement load balancer (nginx/HAProxy)
- Database read replicas

## 🔐 Security Best Practices

### 1. Environment Security
- ✅ Strong JWT secret (32+ characters)
- ✅ Secure admin password
- ✅ Database credentials secured
- ✅ API keys properly configured

### 2. Network Security
- ✅ HTTPS enforced
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Security headers implemented

### 3. Application Security
- ✅ Input validation
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection
- ✅ Authentication middleware

## 📞 Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Check logs for errors
2. **Monthly**: Update dependencies
3. **Quarterly**: Security audit
4. **As needed**: Database backups

### Backup Strategy
```bash
# Database backup
pg_dump supasoka_prod > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf supasoka_backend_$(date +%Y%m%d).tar.gz /path/to/backend
```

---

## 🎉 Deployment Complete!

Your Supasoka backend is now ready for production use with:

- ✅ **Secure Authentication**: JWT-based admin and user auth
- ✅ **Real-time Features**: Socket.IO notifications
- ✅ **Scalable Architecture**: Express.js with PostgreSQL
- ✅ **Mobile Compatibility**: Full Capacitor support
- ✅ **Production Security**: Comprehensive security measures
- ✅ **Monitoring**: Health checks and logging
- ✅ **Documentation**: Complete API documentation

**Admin Access**: https://api.yourdomain.com/api/auth/admin/login
**Health Check**: https://api.yourdomain.com/health
**API Documentation**: Available in route files

For support or issues, refer to the troubleshooting section or check the application logs.
