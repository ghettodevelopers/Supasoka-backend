@echo off
echo ========================================
echo  Fix Windows Firewall for Backend
echo ========================================
echo.
echo This will allow port 5000 through Windows Firewall
echo so your Android device can connect to the backend.
echo.
echo Right-click this file and select "Run as administrator"
echo.
pause

netsh advfirewall firewall delete rule name="Node.js Server Port 5000" >nul 2>&1
netsh advfirewall firewall add rule name="Node.js Server Port 5000" dir=in action=allow protocol=TCP localport=5000

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Firewall rule added.
    echo ========================================
    echo.
    echo Port 5000 is now accessible from your network.
    echo You can now reload your app and it should connect!
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR! Failed to add firewall rule.
    echo ========================================
    echo.
    echo Please make sure you ran this as Administrator.
    echo Right-click the file and select "Run as administrator"
    echo.
)

pause
