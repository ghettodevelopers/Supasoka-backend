# Backend Connection Fix

## Problem
Getting `Network Error` when trying to fetch channels and categories.

## Solutions

### Option 1: Start Your Backend Server (Recommended)
```bash
cd c:\Users\ayoub\Supasoka\backend
npm start
```

The backend should start on `http://localhost:5000`

### Option 2: Check/Update IP Address
If using USB tethering or physical device, your IP might have changed.

1. Find your current IP:
   ```bash
   ipconfig
   ```
   Look for "Wireless LAN adapter" or "Ethernet adapter" IP address

2. Update in `src/config/api.js` line 14:
   ```javascript
   return 'http://YOUR_NEW_IP:5000/api';
   ```

### Option 3: Test Connection
Run the connection test:
```bash
cd c:\Users\ayoub\Supasoka\AdminSupa
node test-connection.js
```

This will test all possible backend URLs and show which one works.

### Option 4: Use Production Backend
If you want to use the production backend instead:

In `src/config/api.js`, change line 14 to:
```javascript
return 'https://supasoka-backend.onrender.com/api';
```

## Current Behavior
- App will show mock data when backend is not connected
- You'll see an alert: "Backend Not Connected"
- This allows you to test the UI without backend

## To Make It Fully Functional
1. Start backend server
2. Ensure IP address is correct
3. Reload the app
4. Channels will load from real database
