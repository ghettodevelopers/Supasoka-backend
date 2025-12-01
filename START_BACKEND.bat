@echo off
echo ========================================
echo Starting Supasoka Backend Server
echo ========================================
echo.

cd backend

echo Checking if node_modules exists...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting backend server on port 5000...
echo.
echo Backend will be available at:
echo   - http://localhost:5000
echo   - http://127.0.0.1:5000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js
