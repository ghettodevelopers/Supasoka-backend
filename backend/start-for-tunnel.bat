@echo off
echo ========================================
echo Starting Supasoka Backend for Tunnel Testing
echo ========================================
echo.

REM Set environment variables for testing without database
set DATABASE_URL=
set JWT_SECRET=supasoka_jwt_secret_key_2024_production_ready_32chars_minimum
set JWT_EXPIRES_IN=7d
set NODE_ENV=development
set PORT=10000
set PUSHY_SECRET_API_KEY=9ff8230c9879759ce1aa9a64ad33943a8ea9dfec8fae6326a16d57b7fdece717

echo Configuration:
echo - Port: 10000
echo - JWT_SECRET: Set
echo - Database: Disabled (using hardcoded credentials)
echo - Admin Email: Ghettodevelopers@gmail.com
echo - Admin Password: Chundabadi
echo.
echo ========================================
echo Backend will work WITHOUT database
echo Login will use hardcoded credentials
echo ========================================
echo.

REM Start the server
node server.js

pause
