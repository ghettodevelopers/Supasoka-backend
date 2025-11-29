@echo off
echo ========================================
echo  Supasoka Backend - Namecheap Package
echo ========================================
echo.

echo [1/3] Installing archiver package...
call npm install archiver
if %errorlevel% neq 0 (
    echo ERROR: Failed to install archiver
    pause
    exit /b 1
)
echo.

echo [2/3] Creating deployment package...
node create-namecheap-package.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to create package
    pause
    exit /b 1
)
echo.

echo [3/3] Opening deployment folder...
start "" "..\deployment"
echo.

echo ========================================
echo  Package created successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Upload the .tar.gz file to Google Drive or Dropbox
echo 2. Get the direct download link
echo 3. Follow NAMECHEAP_UPLOAD_GUIDE.md
echo.
pause
