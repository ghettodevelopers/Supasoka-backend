# Simple PowerShell Script to Test Device Token Diagnostic

Write-Host "Testing Device Token Diagnostic..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Get admin token
Write-Host "Step 1: Getting admin token..." -ForegroundColor Yellow
$loginBody = @{
    email = "Ghettodevelopers@gmail.com"
    password = "Chundabadi"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "https://supasoka-backend.onrender.com/api/auth/admin/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    Write-Host "Token obtained successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Failed to get token" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Step 2: Wait for deployment
Write-Host "Waiting 30 seconds for Render.com to deploy..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host ""

# Step 3: Call diagnostic endpoint
Write-Host "Step 2: Calling diagnostic endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $diagnostic = Invoke-RestMethod -Uri "https://supasoka-backend.onrender.com/admin/diagnostic/device-tokens" -Method Get -Headers $headers

    Write-Host "Diagnostic retrieved successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "RESULTS:" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Total Users:              $($diagnostic.diagnosis.totalUsers)"
    Write-Host "Users with Tokens:        $($diagnostic.diagnosis.usersWithTokens)"
    Write-Host "Activated Users:          $($diagnostic.diagnosis.activatedUsers)"
    Write-Host "Active Users with Tokens: $($diagnostic.diagnosis.activeUsersWithTokens)"
    Write-Host "Percentage:               $($diagnostic.diagnosis.percentage)%"
    Write-Host "Pushy API Key Configured: $($diagnostic.diagnosis.pushyApiKeyConfigured)"
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "RECOMMENDATION:" -ForegroundColor Yellow
    Write-Host $diagnostic.recommendation
    Write-Host ""

    # Show sample users
    if ($diagnostic.diagnosis.sampleUsers.Count -gt 0) {
        Write-Host "Sample Users:" -ForegroundColor Cyan
        foreach ($user in $diagnostic.diagnosis.sampleUsers) {
            Write-Host "  User: $($user.id)"
            Write-Host "    Device ID: $($user.deviceId)"
            Write-Host "    Has Token: $($user.hasToken)"
            Write-Host "    Activated: $($user.isActivated)"
            Write-Host ""
        }
    }

} catch {
    Write-Host "Failed to get diagnostic" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "1. Render.com deployment not finished yet (wait 2-3 minutes)"
    Write-Host "2. Endpoint not deployed yet"
    Write-Host "3. Network issue"
}
