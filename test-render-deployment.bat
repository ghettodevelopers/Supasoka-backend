@echo off
echo Testing Render.com deployment status...
echo.

echo 1. Testing health endpoint...
curl -s https://supasoka-backend.onrender.com/health
echo.
echo.

echo 2. Testing admin login...
curl -s -X POST https://supasoka-backend.onrender.com/api/auth/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"Ghettodevelopers@gmail.com\",\"password\":\"Chundabadi\"}"
echo.
echo.

echo 3. Waiting 2 minutes for deployment to complete...
timeout /t 120 /nobreak
echo.

echo 4. Testing new users endpoint...
node backend\test-production-users.js

pause
