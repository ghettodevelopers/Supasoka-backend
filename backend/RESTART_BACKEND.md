# Backend Restart Instructions

## ⚠️ IMPORTANT: Backend Must Be Restarted

The auth middleware fix requires restarting the backend server.

## Quick Restart

### Option 1: If Backend is Running Locally
```bash
# 1. Stop the current backend (Ctrl+C in the terminal)
# 2. Restart it
cd c:\Users\ayoub\Supasoka\backend
node server-production-ready.js
```

### Option 2: If Using Render.com
1. Go to https://dashboard.render.com
2. Find "supasoka-backend" service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-3 minutes for deployment

## Verify Backend is Working

Test the health endpoint:
```bash
curl https://supasoka-backend.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...,
  "version": "1.0.0"
}
```

## Test Admin Login

```bash
curl -X POST https://supasoka-backend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}'
```

Should return:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "email": "Ghettodevelopers@gmail.com",
    "name": "Super Admin",
    "role": "super_admin"
  }
}
```

## Test Authenticated Endpoint

```bash
# Replace YOUR_TOKEN with the token from login
curl https://supasoka-backend.onrender.com/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return stats (not 401 error).

## After Restart

1. **Clear AdminSupa cache** (close and reopen app)
2. **Login again** with credentials
3. **All sections should work** without 401 errors

The fix is complete - just needs backend restart!
