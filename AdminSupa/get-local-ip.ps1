# Get Local IP Address for Tunnel Testing

Write-Host "`n🔍 Finding your local IP address for tunnel testing...`n" -ForegroundColor Cyan

# Get all network adapters
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
}

Write-Host "📡 Available IP Addresses:" -ForegroundColor Yellow
Write-Host ""

foreach ($adapter in $adapters) {
    $interface = Get-NetAdapter -InterfaceIndex $adapter.InterfaceIndex
    Write-Host "  Interface: $($interface.Name)" -ForegroundColor White
    Write-Host "  IP Address: $($adapter.IPAddress)" -ForegroundColor Green
    Write-Host "  Status: $($interface.Status)" -ForegroundColor Gray
    Write-Host ""
}

# Get the most likely IP (first non-loopback)
$localIP = ($adapters | Select-Object -First 1).IPAddress

if ($localIP) {
    Write-Host "✅ Recommended IP for tunnel testing: $localIP" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Update AdminSupa/app.json:" -ForegroundColor White
    Write-Host "     apiUrl: http://${localIP}:10000/api" -ForegroundColor Yellow
    Write-Host "     socketUrl: http://${localIP}:10000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. Start backend:" -ForegroundColor White
    Write-Host "     cd backend" -ForegroundColor Yellow
    Write-Host "     start-for-tunnel.bat" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  3. Start AdminSupa with tunnel:" -ForegroundColor White
    Write-Host "     cd AdminSupa" -ForegroundColor Yellow
    Write-Host "     npx expo start --tunnel" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Could not find local IP address" -ForegroundColor Red
    Write-Host "   Please check your network connection" -ForegroundColor Yellow
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
