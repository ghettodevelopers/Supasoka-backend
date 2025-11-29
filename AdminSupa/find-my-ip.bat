@echo off
echo ========================================
echo Finding Your Computer's IP Address
echo ========================================
echo.

ipconfig | findstr /i "IPv4"

echo.
echo ========================================
echo INSTRUCTIONS:
echo ========================================
echo 1. Look for the IPv4 Address above
echo    Example: 192.168.1.100
echo.
echo 2. Open: src\config\api.js
echo.
echo 3. Find line 18 and uncomment it:
echo    return 'http://192.168.1.100:5000/api';
echo.
echo 4. Replace 192.168.1.100 with YOUR IP
echo.
echo 5. Comment out line 21:
echo    // return 'http://10.0.2.2:5000/api';
echo.
echo 6. Save and restart Expo app
echo ========================================
echo.
pause
