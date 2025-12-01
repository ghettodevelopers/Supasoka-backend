# Deploy Backend Fixes to Render.com

## 🚀 Quick Deployment Steps

### 1. **Commit Changes to Git**

```bash
cd c:\Users\ayoub\Supasoka

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Contact settings & notification types (match_started, goal, movie)"

# Push to your repository
git push origin main
```

### 2. **Render.com Auto-Deploy**

If you have auto-deploy enabled on Render.com:
- ✅ Render will automatically detect the push
- ✅ It will rebuild and redeploy your backend
- ⏱️ Wait 2-3 minutes for deployment to complete

### 3. **Manual Deploy (if auto-deploy is off)**

1. Go to https://dashboard.render.com
2. Find your `supasoka-backend` service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deployment to complete

### 4. **Verify Deployment**

Test the health endpoint:
```bash
curl https://supasoka-backend.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T...",
  "environment": "production",
  "database": "connected"
}
```

## 📱 Update AdminSupa for Production

After deploying to Render, revert the localhost changes:

### File: `AdminSupa/src/config/api.js`

**Change from:**
```javascript
// TEMPORARY: Use localhost for testing
return LOCAL_URL;

// PRODUCTION: Always use Render.com for release
// return PRODUCTION_URL;
```

**Back to:**
```javascript
// PRODUCTION: Always use Render.com for release
return PRODUCTION_URL;
```

**Do the same for Socket URL:**
```javascript
// PRODUCTION: Always use Render.com for release
return PRODUCTION_SOCKET_URL;
```

### File: `AdminSupa/src/services/api.js`

**Ensure fallback URLs prioritize production:**
```javascript
const FALLBACK_URLS = [
  'https://supasoka-backend.onrender.com/api', // Production (FIRST)
  'http://localhost:10000/api', // Local development fallback
  'http://127.0.0.1:10000/api', // Local loopback
  'http://10.0.2.2:10000/api', // Android emulator
];
```

## 🧪 Testing After Deployment

### Test 1: Contact Settings Update
1. Open AdminSupa
2. Go to Settings → Contact Settings
3. Update WhatsApp number: `0712345678`
4. Update Call number: `0787654321`
5. Click "Hifadhi Mabadiliko"
6. **Expected**: ✅ Success message, settings saved

### Test 2: Match Started Notification
1. Go to Notifications screen
2. Click "Send" button
3. Select **"Match Started"** type
4. Title: `Liverpool vs Arsenal`
5. Message: `Match starting now! Watch live.`
6. Click "Send to All"
7. **Expected**: 
   - ✅ AdminSupa shows success
   - ✅ User app receives notification
   - ✅ Shows "Mechi Imeanza" in Swahili

### Test 3: Goal Scored Notification
1. Select **"Goal Scored"** type
2. Title: `GOAL! Liverpool 1-0`
3. Message: `Salah scores!`
4. Click "Send to All"
5. **Expected**: ✅ User app shows "Goli!" notification

### Test 4: New Movie Notification
1. Select **"New Movie"** type
2. Title: `New Movie Available`
3. Message: `Watch "The Dark Knight" now!`
4. Click "Send to All"
5. **Expected**: ✅ User app shows "Filamu Mpya" notification

## 🔧 What Was Fixed

### Backend Changes (`backend/routes/notifications.js`)
- ✅ Expanded validation to accept 12 notification types
- ✅ Added `match_started`, `goal`, `movie` types
- ✅ Added broadcast emission for all users
- ✅ Added backward compatibility events

### Backend Changes (`backend/routes/admin.js`)
- ✅ Moved parameterized routes (`PUT /:id`, `DELETE /:id`) to end of file
- ✅ Contact settings route now matches correctly

### User App Changes (`contexts/NotificationContext.js`)
- ✅ Added Swahili title mapping for all notification types
- ✅ Enhanced logging for debugging
- ✅ Better notification handling

## 📊 Notification Types Supported

| Type | AdminSupa Name | Swahili Title | Status |
|------|----------------|---------------|--------|
| `match_started` | Match Started | Mechi Imeanza | ✅ FIXED |
| `goal` | Goal Scored | Goli! | ✅ FIXED |
| `movie` | New Movie | Filamu Mpya | ✅ FIXED |
| `general` | General Update | Taarifa | ✅ WORKING |
| `subscription` | Subscription | Usajili | ✅ WORKING |
| `maintenance` | Maintenance | Matengenezo | ✅ WORKING |

## 🐛 Troubleshooting

### Issue: "Failed to update admin" error
**Solution**: Backend needs to be redeployed with route ordering fix

### Issue: "Invalid value" for notification type
**Solution**: Backend needs validation update (already fixed, just deploy)

### Issue: Notifications sent but not received
**Solution**: 
1. Check user app socket connection
2. Verify backend WebSocket is working
3. Check user app logs for socket events

### Issue: AdminSupa can't connect to backend
**Solution**:
1. Verify Render.com deployment is live
2. Check health endpoint: `https://supasoka-backend.onrender.com/health`
3. Ensure AdminSupa is using production URL

## 📝 Deployment Checklist

- [ ] Commit all changes to Git
- [ ] Push to GitHub/GitLab
- [ ] Wait for Render.com auto-deploy (or trigger manual deploy)
- [ ] Verify health endpoint responds
- [ ] Revert AdminSupa to production URLs
- [ ] Test contact settings update
- [ ] Test all notification types
- [ ] Verify users receive notifications
- [ ] Check backend logs for errors

## 🎯 Expected Results After Deployment

### Contact Settings:
- ✅ Admin can update WhatsApp number
- ✅ Admin can update Call number
- ✅ No "Failed to update admin" error
- ✅ Settings saved to database
- ✅ Users see updated contact info

### Notifications:
- ✅ All 6 notification types work
- ✅ Match Started sends successfully
- ✅ Goal Scored sends successfully
- ✅ New Movie sends successfully
- ✅ Users receive notifications in status bar
- ✅ Swahili titles display correctly
- ✅ Toast messages appear
- ✅ Notifications saved to list

---

**Ready to deploy!** 🚀

All fixes are committed and ready. Just push to Git and Render.com will handle the rest!
