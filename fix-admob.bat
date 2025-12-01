@echo off
echo ========================================
echo   Fixing AdMob Module Error
echo ========================================
echo.

echo [1/5] Stopping Metro bundler...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul
echo.

echo [2/5] Clearing Metro cache...
rd /s /q %TEMP%\metro-* 2>nul
rd /s /q %TEMP%\haste-map-* 2>nul
echo.

echo [3/5] Clearing React Native cache...
rd /s /q %TEMP%\react-* 2>nul
echo.

echo [4/5] Reinstalling react-native-google-mobile-ads...
call npm install react-native-google-mobile-ads@latest --save
echo.

echo [5/5] Starting Metro with clean cache...
echo.
echo Metro bundler will start now.
echo After it starts, press Ctrl+C and run:
echo   npx react-native run-android
echo.
call npx react-native start --reset-cache
