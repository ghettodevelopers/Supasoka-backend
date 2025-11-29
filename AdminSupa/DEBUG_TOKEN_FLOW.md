# AdminSupa Token Flow Debug Guide

## Expected Log Sequence

When you login, you should see this EXACT sequence:

### 1. Login Initiation
```
🔐 Attempting login for: Ghettodevelopers@gmail.com
🔐 Login in progress: true
```

### 2. Login Request
```
📤 Request: POST /auth/admin/login [No Token]  ← This is correct, login doesn't need token
```

### 3. Login Success
```
✅ API Success: POST /auth/admin/login
✅ Login successful, saving token...
🔍 Token received (first 20 chars): eyJhbGciOiJIUzI1NiIsIn...
✅ Token set in axios defaults
🔍 Axios default token (first 20 chars): Bearer eyJhbGciOiJIU...
✅ Token saved to SecureStore: YES
✅ Admin logged in: Ghettodevelopers@gmail.com
🔐 Login in progress: false
```

### 4. First Authenticated Request (Dashboard)
```
🔑 Using token from axios defaults
📤 Request: GET /admin/stats [Token: Bearer eyJhbGciOiJIU...]
✅ API Success: GET /admin/stats
```

### 5. Subsequent Requests
```
🔑 Using token from axios defaults
📤 Request: GET /admin/users [Token: Bearer eyJhbGciOiJIU...]
✅ API Success: GET /admin/users
```

## What to Look For

### ✅ GOOD SIGNS
- Token received and saved successfully
- "Using token from axios defaults" appears
- All requests show `[Token: Bearer ...]`
- No 401 errors after login

### ❌ BAD SIGNS
- "No token found in axios defaults or SecureStore"
- Requests show `[No Token]`
- 401 errors on authenticated endpoints
- Token not set in axios defaults

## Common Issues & Solutions

### Issue 1: Token Not Being Set
**Symptom:**
```
✅ Login successful, saving token...
🔍 Axios default token (first 20 chars): NOT SET
```

**Solution:** There's an issue with setting axios defaults. Check if `api` is the correct instance.

### Issue 2: Token Not Being Used
**Symptom:**
```
⚠️ No token found in axios defaults or SecureStore
📤 Request: GET /admin/stats [No Token]
```

**Solution:** Token is being cleared or not persisting. Check the login flag protection.

### Issue 3: Token Format Wrong
**Symptom:**
```
🔍 Token received (first 20 chars): undefined...
```

**Solution:** Backend isn't returning token correctly. Check backend response format.

### Issue 4: 401 Despite Token Being Sent
**Symptom:**
```
📤 Request: GET /admin/stats [Token: Bearer eyJ...]
❌ Client error (401): {"error": "Invalid token."}
```

**Solution:** Backend can't verify the token. Check:
- JWT_SECRET matches between login and verification
- Token hasn't expired
- Token format is correct

## Manual Test Steps

### Step 1: Clear Everything
1. Close AdminSupa
2. Clear app data/cache
3. Reopen AdminSupa

### Step 2: Login with Logging
1. Open console/logs
2. Login with credentials
3. **COPY ALL LOGS** from login to first API call
4. Share logs for analysis

### Step 3: Check Token Manually
After login, add this temporary code to check token:

```javascript
// In AuthContext after login
console.log('=== TOKEN DEBUG ===');
console.log('Token in variable:', token);
console.log('Token in axios defaults:', api.defaults.headers.common['Authorization']);
console.log('==================');
```

### Step 4: Check Backend
Verify backend is accepting the token:

```bash
# Get token from logs (the actual JWT token)
TOKEN="your_actual_token_here"

# Test manually
curl -H "Authorization: Bearer $TOKEN" \
  https://supasoka-backend.onrender.com/api/admin/stats
```

## Quick Fix Checklist

- [ ] Backend is running and accessible
- [ ] Login returns 200 OK with token
- [ ] Token is saved to axios defaults
- [ ] Token is saved to SecureStore
- [ ] Request interceptor finds the token
- [ ] Token is added to request headers
- [ ] Backend accepts the token
- [ ] No 401 errors on authenticated requests

## Emergency Workaround

If nothing works, try this temporary fix in `AuthContext.js`:

```javascript
// After setting token in axios defaults
api.defaults.headers['Authorization'] = `Bearer ${token}`;  // Try this too
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Force it on every request
api.interceptors.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
```

## Next Steps

1. **Login** and watch the logs carefully
2. **Copy the EXACT log sequence** you see
3. **Share the logs** so we can see where it's failing
4. **Check if token appears** in the request logs

The detailed logging we added will show us EXACTLY where the token flow is breaking!
