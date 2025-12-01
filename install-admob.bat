@echo off
echo ========================================
echo   Supasoka - AdMob Installation
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [2/4] Cleaning Android build...
cd android
call gradlew clean
cd ..
echo.

echo [3/4] Building Android app...
call npx react-native run-android
if %errorlevel% neq 0 (
    echo ERROR: Failed to build app
    pause
    exit /b 1
)
echo.

echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo AdMob is now configured with:
echo - App ID: ca-app-pub-5619803043988422~5036677593
echo - Rewarded Ad ID: ca-app-pub-5619803043988422/4588410442
echo.
echo Next steps:
echo 1. Open the app
echo 2. Go to "Akaunti Yangu"
echo 3. Click "Angalia Tangazo"
echo 4. Watch the ad and earn 10 points!
echo.
echo For more info, see ADMOB_SETUP.md
echo.
pause
