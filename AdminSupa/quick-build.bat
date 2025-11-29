@echo off
echo ========================================
echo   Quick Build - AdminSupa APK
echo ========================================
echo.
echo Building preview APK with EAS...
echo This will take 10-20 minutes.
echo.
echo Make sure you're logged in to EAS:
echo   Run: eas login
echo.
pause

call eas build --platform android --profile preview

echo.
echo ========================================
echo   Build Started!
echo ========================================
echo.
echo Check your terminal for the build progress.
echo You'll get a download link when it's done.
echo.
pause
