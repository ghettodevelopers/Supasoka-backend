# PowerShell Script to Test Device Token Diagnostic
# Run this in PowerShell on Windows

Write-Host "🔍 Testing Device Token Diagnostic..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Get admin token
Write-Host "Step 1: Getting admin token..." -ForegroundColor Yellow
$loginBody = @{
    email = "Ghettodevelopers@gmail.com"
    password = "Chundabadi"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "https://supasoka-backend.onrender.com/api/auth/admin/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token
    Write-Host "✅ Token obtained successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get token: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Wait for deployment (if just pushed)
Write-Host "⏳ Waiting 30 seconds for Render.com to deploy..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host ""

# Step 3: Call diagnostic endpoint
Write-Host "Step 2: Calling diagnostic endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $diagnostic = Invoke-RestMethod -Uri "https://supasoka-backend.onrender.com/admin/diagnostic/device-tokens" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ Diagnostic retrieved successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 RESULTS:" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Total Users:              $($diagnostic.diagnosis.totalUsers)" -ForegroundColor White
    Write-Host "Users with Tokens:        $($diagnostic.diagnosis.usersWithTokens)" -ForegroundColor White
    Write-Host "Activated Users:          $($diagnostic.diagnosis.activatedUsers)" -ForegroundColor White
    Write-Host "Active Users with Tokens: $($diagnostic.diagnosis.activeUsersWithTokens)" -ForegroundColor White
    Write-Host "Percentage:               $($diagnostic.diagnosis.percentage)%" -ForegroundColor White
    Write-Host "Pushy API Key Configured: $($diagnostic.diagnosis.pushyApiKeyConfigured)" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 RECOMMENDATION:" -ForegroundColor Yellow
    Write-Host $diagnostic.recommendation -ForegroundColor White
    Write-Host ""

    # Show sample users
    if ($diagnostic.diagnosis.sampleUsers.Count -gt 0) {
        Write-Host "👥 Sample Users (first 5):" -ForegroundColor Cyan
        foreach ($user in $diagnostic.diagnosis.sampleUsers) {
            Write-Host "  - User: $($user.id)" -ForegroundColor White
            Write-Host "    Device ID: $($user.deviceId)" -ForegroundColor Gray
            Write-Host "    Has Token: $($user.hasToken)" -ForegroundColor Gray
            Write-Host "    Activated: $($user.isActivated)" -ForegroundColor Gray
            Write-Host ""
        }
    }

    # Analysis
    Write-Host "🔍 ANALYSIS:" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    
    if ($diagnostic.diagnosis.totalUsers -eq 0) {
        Write-Host "❌ PROBLEM: No users in database" -ForegroundColor Red
        Write-Host "   SOLUTION: Users need to open the Supasoka app" -ForegroundColor Yellow
    }
    elseif ($diagnostic.diagnosis.usersWithTokens -eq 0) {
        Write-Host "❌ PROBLEM: Users exist but NO device tokens" -ForegroundColor Red
        Write-Host "   SOLUTION: Users need to open the Supasoka app to register tokens" -ForegroundColor Yellow
        Write-Host "   ACTION: Open app on at least one device and wait 5 seconds" -ForegroundColor Yellow
    }
    elseif (-not $diagnostic.diagnosis.pushyApiKeyConfigured) {
        Write-Host "❌ PROBLEM: Pushy API key NOT configured" -ForegroundColor Red
        Write-Host "   SOLUTION: Redeploy Render.com service after adding PUSHY_SECRET_API_KEY" -ForegroundColor Yellow
    }
    else {
        Write-Host "✅ GOOD: System ready to send push notifications!" -ForegroundColor Green
        Write-Host "   $($diagnostic.diagnosis.usersWithTokens) users can receive notifications" -ForegroundColor Green
    }
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Failed to get diagnostic: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "1. Render.com has not finished deploying yet (wait 2-3 minutes)" -ForegroundColor Gray
    Write-Host "2. Endpoint not deployed yet (check Render.com dashboard)" -ForegroundColor Gray
    Write-Host "3. Network issue (check internet connection)" -ForegroundColor Gray
}
