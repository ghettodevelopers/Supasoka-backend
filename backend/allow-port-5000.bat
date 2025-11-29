@echo off
echo ========================================
echo Windows Firewall - Allow Port 5000
echo ========================================
echo.
echo This will allow incoming connections on port 5000
echo Required for USB tethering to work
echo.
echo Right-click this file and select "Run as administrator"
echo.
pause

netsh advfirewall firewall add rule name="Supasoka Backend Port 5000" dir=in action=allow protocol=TCP localport=5000

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ SUCCESS!
    echo ========================================
    echo.
    echo Port 5000 is now allowed through Windows Firewall
    echo Your phone can now connect to the backend
    echo.
    echo Next steps:
    echo 1. Make sure backend is running (npm start)
    echo 2. Restart your Expo app
    echo 3. Try logging in again
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ FAILED
    echo ========================================
    echo.
    echo Please run this file as Administrator:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
)

pause
