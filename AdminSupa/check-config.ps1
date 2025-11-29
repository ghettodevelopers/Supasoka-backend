# Quick Configuration Check for AdminSupa

Write-Host "`n🔍 CHECKING ADMINSUPA CONFIGURATION`n" -ForegroundColor Cyan

# Check app.json
Write-Host "📄 Checking app.json..." -ForegroundColor Yellow

$appJsonPath = Join-Path $PSScriptRoot "app.json"
if (Test-Path $appJsonPath) {
    $appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json
    $apiUrl = $appJson.expo.extra.apiUrl
    $socketUrl = $appJson.expo.extra.socketUrl
    
    Write-Host "`n  API URL: " -NoNewline -ForegroundColor Gray
    if ($apiUrl -like "*onrender.com*") {
        Write-Host "$apiUrl" -ForegroundColor Green
        Write-Host "  ✅ Correct - Points to Render.com" -ForegroundColor Green
    } else {
        Write-Host "$apiUrl" -ForegroundColor Red
        Write-Host "  ❌ Wrong - Should point to Render.com" -ForegroundColor Red
    }
    
    Write-Host "`n  Socket URL: " -NoNewline -ForegroundColor Gray
    if ($socketUrl -like "*onrender.com*") {
        Write-Host "$socketUrl" -ForegroundColor Green
        Write-Host "  ✅ Correct - Points to Render.com" -ForegroundColor Green
    } else {
        Write-Host "$socketUrl" -ForegroundColor Red
        Write-Host "  ❌ Wrong - Should point to Render.com" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ app.json not found!" -ForegroundColor Red
}

# Check api.js
Write-Host "`n📄 Checking src/services/api.js..." -ForegroundColor Yellow

$apiJsPath = Join-Path $PSScriptRoot "src\services\api.js"
if (Test-Path $apiJsPath) {
    $apiJs = Get-Content $apiJsPath -Raw
    
    if ($apiJs -match "currentBaseURL = 'https://supasoka-backend.onrender.com/api'") {
        Write-Host "  ✅ currentBaseURL points to Render.com" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  currentBaseURL may not be set correctly" -ForegroundColor Yellow
    }
    
    if ($apiJs -match "FALLBACK_URLS = \[") {
        Write-Host "  ✅ Fallback URLs configured" -ForegroundColor Green
    }
} else {
    Write-Host "  ❌ api.js not found!" -ForegroundColor Red
}

# Summary
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "📊 CONFIGURATION STATUS" -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

if ($apiUrl -like "*onrender.com*" -and $socketUrl -like "*onrender.com*") {
    Write-Host "`n✅ CONFIGURATION IS CORRECT!" -ForegroundColor Green
    Write-Host "`nAdminSupa will connect to:" -ForegroundColor White
    Write-Host "  🌐 https://supasoka-backend.onrender.com" -ForegroundColor Cyan
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "  1. Restart AdminSupa (Ctrl+C then npx expo start)" -ForegroundColor White
    Write-Host "  2. Check logs for correct URL" -ForegroundColor White
    Write-Host "  3. Deploy backend if not already deployed" -ForegroundColor White
} else {
    Write-Host "`n⚠️  CONFIGURATION NEEDS FIXING" -ForegroundColor Yellow
    Write-Host "`nPlease update app.json to use Render.com URLs" -ForegroundColor White
}

Write-Host "`n📄 Documentation: CONFIGURATION_FIXED.md`n" -ForegroundColor Cyan

# Pause
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
