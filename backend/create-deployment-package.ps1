# Create deployment package for Namecheap VPS
Write-Host "Creating Supasoka Backend Deployment Package..." -ForegroundColor Cyan

# Create temp directory
$tempDir = "C:\Users\ayoub\Supasoka\supasoka-backend-deploy"
$zipFile = "C:\Users\ayoub\Supasoka\supasoka-backend.zip"

# Remove old files if they exist
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
if (Test-Path $zipFile) {
    Remove-Item -Path $zipFile -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying backend files (excluding node_modules)..." -ForegroundColor Yellow

# Copy all files except node_modules and other unnecessary files
$excludeDirs = @('node_modules', '.git', 'uploads', 'logs', 'test-results')
$backendPath = "C:\Users\ayoub\Supasoka\backend"

Get-ChildItem -Path $backendPath -Recurse | Where-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($exclude in $excludeDirs) {
        if ($item.FullName -like "*\$exclude\*" -or $item.Name -eq $exclude) {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
} | ForEach-Object {
    $relativePath = $_.FullName.Substring($backendPath.Length + 1)
    $targetPath = Join-Path $tempDir $relativePath
    
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    } else {
        $targetDir = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $targetPath -Force
    }
}

Write-Host "Creating deployment script..." -ForegroundColor Yellow

# Create deployment script for the server
$deployScript = @"
#!/bin/bash
# Supasoka Backend Deployment Script for Namecheap VPS

echo "🚀 Starting Supasoka Backend Deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Node.js 18.x if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Create database and user
echo "🗄️ Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE supasoka;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER supasoka WITH PASSWORD 'supasoka123';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE supasoka TO supasoka;" 2>/dev/null

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Run Prisma migrations
echo "🗄️ Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# Stop existing PM2 process if running
pm2 stop supasoka-backend 2>/dev/null || true
pm2 delete supasoka-backend 2>/dev/null || true

# Start with PM2
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 5000/tcp
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Deployment complete!"
echo "🌐 Backend running on: http://159.198.46.126:5000"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs supasoka-backend"
"@

Set-Content -Path "$tempDir\deploy.sh" -Value $deployScript

Write-Host "Creating .env file template..." -ForegroundColor Yellow

# Create .env template
$envTemplate = @"
# Database
DATABASE_URL="postgresql://supasoka:supasoka123@localhost:5432/supasoka"

# Server
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Credentials
ADMIN_EMAIL=Ghettodevelopers@gmail.com
ADMIN_PASSWORD=Chundabadi

# CORS
CORS_ORIGIN=*
"@

Set-Content -Path "$tempDir\.env.example" -Value $envTemplate

Write-Host "Compressing files..." -ForegroundColor Yellow

# Compress to ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "`n✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host "📦 Package location: $zipFile" -ForegroundColor Cyan
Write-Host "📊 Package size: $([math]::Round((Get-Item $zipFile).Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload $zipFile to your VPS using WinSCP or SFTP" -ForegroundColor White
Write-Host "2. Extract: unzip supasoka-backend.zip" -ForegroundColor White
Write-Host "3. Run: chmod +x deploy.sh && ./deploy.sh" -ForegroundColor White
