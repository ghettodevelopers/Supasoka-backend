#!/bin/bash

# Supasoka Backend - Namecheap Deployment Script
# This script automates the deployment process to Namecheap VPS

set -e  # Exit on error

echo "🚀 Starting Supasoka Backend Deployment to Namecheap..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/supasoka-backend/backend"
REPO_URL="https://github.com/yourusername/supasoka-backend.git"  # UPDATE THIS
BRANCH="main"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run with sudo"
    exit 1
fi

# Step 1: Pull latest code
echo "📥 Pulling latest code from repository..."
cd $APP_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH
print_success "Code updated"

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install --production
print_success "Dependencies installed"

# Step 3: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Step 4: Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy
print_success "Database migrations completed"

# Step 5: Restart application with PM2
echo "🔄 Restarting application..."
pm2 restart supasoka-backend || pm2 start ecosystem.config.js
pm2 save
print_success "Application restarted"

# Step 6: Check application status
echo "📊 Checking application status..."
pm2 status supasoka-backend

# Step 7: Show recent logs
echo "📝 Recent logs:"
pm2 logs supasoka-backend --lines 20 --nostream

print_success "Deployment completed successfully!"
echo ""
echo "🌐 Your API should be available at: https://api.yourdomain.com"
echo "📊 Monitor logs with: pm2 logs supasoka-backend"
echo "📈 Monitor status with: pm2 monit"
