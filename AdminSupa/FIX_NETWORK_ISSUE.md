# Network Configuration - Render.com

## Production Configuration
AdminSupa is now configured to use Render.com production backend at `https://supasoka-backend.onrender.com`

## For Local Development (Optional)

### Option 1: Run PowerShell as Administrator
1. Press `Win + X` and select "Windows PowerShell (Admin)" or "Terminal (Admin)"
2. Run this command:
```powershell
netsh advfirewall firewall add rule name="Node.js Server Port 5000" dir=in action=allow protocol=TCP localport=5000
```

### Option 2: Use Windows Firewall GUI
1. Press `Win + R`, type `wf.msc`, press Enter
2. Click "Inbound Rules" on the left
3. Click "New Rule..." on the right
4. Select "Port", click Next
5. Select "TCP" and enter "5000" in Specific local ports
6. Select "Allow the connection", click Next
7. Check all profiles (Domain, Private, Public), click Next
8. Name it "Node.js Server Port 5000", click Finish

### Option 3: Temporarily Disable Firewall (Not Recommended)
1. Press `Win + R`, type `firewall.cpl`, press Enter
2. Click "Turn Windows Defender Firewall on or off"
3. Turn off for Private network
4. Test the app
5. **Remember to turn it back on!**

## Verify Connection After Firewall Fix

### Test Production Backend:
```bash
curl https://supasoka-backend.onrender.com/health
```
Should return: `{"status":"healthy",...}`

### Test API Endpoints:
```bash
curl https://supasoka-backend.onrender.com/api/channels
```
Should return: `{"channels":[...]}`

### Test Local Development (if needed):
```bash
curl http://localhost:5000/health
```

## After Firewall is Fixed

1. **Reload the app** - Press `r` in Expo terminal or shake device and tap "Reload"
2. **Navigate to Channels** - Should now load real channels from backend
3. **Test CRUD operations**:
   - ✅ Add new channel
   - ✅ Edit existing channel
   - ✅ Delete channel
   - ✅ Toggle channel status

## Alternative: Use Production Backend

If you can't fix the firewall, use the production backend instead:

The `src/config/api.js` is already configured for production:
```javascript
// Production URL (default)
const PRODUCTION_URL = 'https://supasoka-backend.onrender.com/api';
return PRODUCTION_URL;
```

Then reload the app.

## Current Status
- ✅ Modal form now shows all input fields (categories load with defaults)
- ✅ Mock channels are protected (can't edit/delete until backend connects)
- ⏳ Waiting for firewall fix to connect to backend
