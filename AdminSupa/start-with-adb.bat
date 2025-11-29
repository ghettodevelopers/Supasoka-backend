@echo off
echo ========================================
echo Supasoka Admin - USB Tethering Setup
echo ========================================
echo.

echo Step 1: Setting up ADB reverse for port 5000...
adb reverse tcp:5000 tcp:5000

if %errorlevel% equ 0 (
    echo ✅ ADB reverse successful!
) else (
    echo ❌ ADB reverse failed. Make sure:
    echo    - Android emulator is running
    echo    - ADB is installed
    echo    - USB debugging is enabled
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Verifying ADB reverse...
adb reverse --list

echo.
echo ========================================
echo ✅ Setup Complete!
echo ========================================
echo.
echo Your emulator can now reach:
echo   http://localhost:5000 → Your computer's port 5000
echo.
echo Backend should be running on port 5000
echo.
echo Press any key to start Expo...
pause > nul

echo.
echo Starting Expo...
npm start
