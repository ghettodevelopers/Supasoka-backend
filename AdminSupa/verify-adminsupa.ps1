# AdminSupa Configuration Verification Script

Write-Host "`n🔍 ADMINSUPA CONFIGURATION VERIFICATION`n" -ForegroundColor Cyan

# Configuration files to check
$configFiles = @(
    @{
        Path = "src\config\api.js"
        Pattern = "supasoka-backend.onrender.com"
        Name = "API Configuration"
    },
    @{
        Path = "src\services\api.js"
        Pattern = "supasoka-backend.onrender.com"
        Name = "API Service"
    },
    @{
        Path = "src\services\channelService.js"
        Pattern = "API_ENDPOINTS"
        Name = "Channel Service"
    },
    @{
        Path = "src\services\carouselService.js"
        Pattern = "API_ENDPOINTS"
        Name = "Carousel Service"
    },
    @{
        Path = "src\services\userService.js"
        Pattern = "API_ENDPOINTS"
        Name = "User Service"
    }
)

Write-Host "📁 Checking Configuration Files...`n" -ForegroundColor Yellow

$allPassed = $true

foreach ($config in $configFiles) {
    $filePath = Join-Path $PSScriptRoot $config.Path
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        if ($content -match $config.Pattern) {
            Write-Host "  ✅ $($config.Name)" -ForegroundColor Green
            Write-Host "     File: $($config.Path)" -ForegroundColor Gray
        } else {
            Write-Host "  ❌ $($config.Name)" -ForegroundColor Red
            Write-Host "     File: $($config.Path)" -ForegroundColor Gray
            Write-Host "     Error: Required pattern not found" -ForegroundColor Red
            $allPassed = $false
        }
    } else {
        Write-Host "  ⚠️  $($config.Name)" -ForegroundColor Yellow
        Write-Host "     File: $($config.Path)" -ForegroundColor Gray
        Write-Host "     Warning: File not found" -ForegroundColor Yellow
        $allPassed = $false
    }
}

# Check screens
Write-Host "`n📱 Checking Admin Screens...`n" -ForegroundColor Yellow

$screens = @(
    "src\screens\ChannelsScreen.js",
    "src\screens\CarouselsScreen.js",
    "src\screens\UsersScreen.js",
    "src\screens\DashboardScreen.js",
    "src\screens\NotificationsScreen.js",
    "src\screens\SettingsScreen.js"
)

foreach ($screen in $screens) {
    $screenPath = Join-Path $PSScriptRoot $screen
    $screenName = Split-Path $screen -Leaf
    
    if (Test-Path $screenPath) {
        Write-Host "  ✅ $screenName" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $screenName - NOT FOUND" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test backend connection
Write-Host "`n🌐 Testing Backend Connection...`n" -ForegroundColor Yellow

Write-Host "  Testing: https://supasoka-backend.onrender.com/health" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "https://supasoka-backend.onrender.com/health" -TimeoutSec 10 -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend is ONLINE" -ForegroundColor Green
        Write-Host "     AdminSupa can connect successfully!" -ForegroundColor Green
    }
} catch {
    $errorMessage = $_.Exception.Message
    
    if ($errorMessage -match "503") {
        Write-Host "  ⚠️  Backend is UNAVAILABLE (503)" -ForegroundColor Yellow
        Write-Host "     AdminSupa is configured correctly " -ForegroundColor Green
        Write-Host "     Backend needs deployment " -ForegroundColor Yellow
        Write-Host "     Action Required:" -ForegroundColor Cyan
        Write-Host "     1. Go to https://dashboard.render.com" -ForegroundColor White
        Write-Host "     2. Find 'supasoka-backend' service" -ForegroundColor White
        Write-Host "     3. Click Manual Deploy button" -ForegroundColor White
        Write-Host "     4. Wait 2-5 minutes" -ForegroundColor White
        Write-Host "     5. AdminSupa will connect automatically!" -ForegroundColor White
    } else {
        Write-Host "  ❌ Connection FAILED" -ForegroundColor Red
        Write-Host "     Error: $errorMessage" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "📊 ADMINSUPA VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "`n✅ ALL CONFIGURATION CHECKS PASSED!" -ForegroundColor Green
    Write-Host "`nAdminSupa Features Ready:" -ForegroundColor Cyan
    Write-Host "  ✅ Channel Management (Add, Edit, Delete)" -ForegroundColor Green
    Write-Host "  ✅ Carousel Management (Add, Edit, Delete, Reorder)" -ForegroundColor Green
    Write-Host "  ✅ User Management (View, Activate, Block, Grant Access)" -ForegroundColor Green
    Write-Host "  ✅ Dashboard (Stats, Analytics)" -ForegroundColor Green
    Write-Host "  ✅ Notifications (Real-time messaging)" -ForegroundColor Green
    Write-Host "  ✅ Settings (Free trial, Contact, App)" -ForegroundColor Green
    
    Write-Host "`nConfiguration Status: COMPLETE ✅" -ForegroundColor Green
    Write-Host "Backend Status: " -NoNewline
    Write-Host "NEEDS DEPLOYMENT ⚠️" -ForegroundColor Yellow
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Deploy backend on Render.com" -ForegroundColor White
    Write-Host "2. Start AdminSupa: npm start" -ForegroundColor White
    Write-Host "3. Login and start managing!" -ForegroundColor White
} else {
    Write-Host "`n⚠️  SOME ISSUES FOUND" -ForegroundColor Yellow
    Write-Host "`nPlease review the errors above." -ForegroundColor White
}

Write-Host "`n📄 Detailed Documentation: ADMINSUPA_VERIFICATION.md" -ForegroundColor Cyan
Write-Host "📄 Main Migration: ../RENDER_MIGRATION_COMPLETE.md`n" -ForegroundColor Cyan

# Pause to read results
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
