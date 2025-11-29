@echo off
echo ========================================
echo Fixing Worklets Error
echo ========================================
echo.

echo Step 1: Clearing Metro bundler cache...
npx expo start --clear

echo.
echo ========================================
echo If error persists, run these commands:
echo ========================================
echo.
echo 1. Delete node_modules:
echo    rmdir /s /q node_modules
echo.
echo 2. Reinstall:
echo    npm install
echo.
echo 3. Start fresh:
echo    npx expo start --clear
echo.
pause
