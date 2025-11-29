@echo off
echo ========================================
echo   Supasoka Admin - APK Builder
echo ========================================
echo.

echo Checking if EAS CLI is installed...
call eas --version >nul 2>&1
if %errorlevel% neq 0 (
    echo EAS CLI not found. Installing...
    call npm install -g eas-cli
    echo.
)

echo.
echo ========================================
echo   Choose Build Method:
echo ========================================
echo   1. EAS Build - Preview (Recommended)
echo   2. EAS Build - Production
echo   3. Local Build (Requires Android Studio)
echo   4. Cancel
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto eas_preview
if "%choice%"=="2" goto eas_production
if "%choice%"=="3" goto local_build
if "%choice%"=="4" goto end

:eas_preview
echo.
echo ========================================
echo   Building Preview APK with EAS
echo ========================================
echo.
echo This will:
echo   - Upload your code to Expo servers
echo   - Build APK in the cloud
echo   - Take about 10-20 minutes
echo   - Provide download link when done
echo.
pause
echo.
echo Starting EAS build...
call eas build --platform android --profile preview
echo.
echo Build complete! Check the link above to download APK.
pause
goto end

:eas_production
echo.
echo ========================================
echo   Building Production APK with EAS
echo ========================================
echo.
echo This will create an optimized production APK.
echo.
pause
echo.
echo Starting EAS build...
call eas build --platform android --profile production
echo.
echo Build complete! Check the link above to download APK.
pause
goto end

:local_build
echo.
echo ========================================
echo   Building APK Locally
echo ========================================
echo.
echo Prerequisites:
echo   - Android Studio installed
echo   - Android SDK configured
echo   - ANDROID_HOME environment variable set
echo.
set /p continue="Continue? (y/n): "
if /i not "%continue%"=="y" goto end

echo.
echo Installing dependencies...
call npm install

echo.
echo Generating Android project...
call npx expo prebuild --platform android

echo.
echo Building debug APK...
cd android
call gradlew assembleDebug

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo APK Location:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo You can now install this APK on your Android device.
echo.
pause
cd ..
goto end

:end
echo.
echo Thank you for using Supasoka Admin APK Builder!
echo.
pause
