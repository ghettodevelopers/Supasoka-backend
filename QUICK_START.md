# 🚀 Quick Start - Carousel Real-Time Testing

## ✅ **Backend is Already Running!**

Your backend server is running on **port 10000**:
- Health Check: http://localhost:10000/health
- API Base: http://localhost:10000/api

---

## 📱 **What You Need to Do Now:**

### **1. Restart AdminSupa** (if it's running)

The configuration has been updated to use `localhost:10000` instead of production server.

```bash
# Stop AdminSupa if running (Ctrl+C)
# Then restart:
cd AdminSupa
npx expo start
```

**Check the console - should show:**
```
🔗 API Configuration:
   API URL: http://localhost:10000/api
   Socket URL: http://localhost:10000
```

---

### **2. Restart User App** (if it's running)

```bash
# Stop Metro bundler if running (Ctrl+C)
# Then restart:
npx react-native start

# In another terminal:
npx react-native run-android
```

**Check the console - should show:**
```
🔍 Testing API connections...
✅ Connection successful: http://localhost:10000/api
```

---

### **3. Test Carousel Real-Time Update**

#### **In AdminSupa:**
1. Open Carousels screen
2. Click "Add Carousel Image"
3. Enter:
   - **Image URL**: `https://picsum.photos/800/400?random=1`
   - **Title**: `Test Image`
   - **Active**: ✓ Yes
4. Click "Save"

#### **In User App (Immediately):**
- ✅ Toast appears: "Picha Mpya: Picha za carousel zimebadilishwa"
- ✅ Carousel image displays on home screen
- ✅ No app rebuild needed!

---

## 🔍 **Troubleshooting**

### **If AdminSupa shows "failed to load":**

**Check backend is running:**
```bash
# Open browser:
http://localhost:10000/health

# Should show:
{"status":"healthy",...}
```

If not working, backend might have stopped. Restart it:
```bash
cd backend
node server.js
```

---

### **If User App doesn't show carousel:**

1. **Pull down to refresh** on home screen
2. **Check console logs** for:
   ```
   ✅ Socket connected
   📡 Carousel updated
   ```
3. **Verify API connection**:
   ```
   ✅ Connection successful: http://localhost:10000/api
   ```

---

## 🎯 **Expected Flow**

```
AdminSupa: Add Carousel
    ↓
Backend: Saves to database
    ↓
Socket.IO: Emits 'carousel-updated'
    ↓
User App: Receives event
    ↓
Shows Toast + Fetches new data
    ↓
Carousel displays immediately!
```

---

## ✅ **All Configurations Updated**

The following files have been updated to use `localhost:10000`:

- ✅ `AdminSupa/src/config/api.js` - API & Socket URLs
- ✅ `services/api.js` - User app API URLs
- ✅ `contexts/NotificationContext.js` - User app Socket URLs

---

## 🎨 **Test Images**

Use these for testing:
```
https://picsum.photos/800/400?random=1
https://picsum.photos/800/400?random=2
https://picsum.photos/800/400?random=3
```

---

## 📊 **Success Checklist**

- [ ] Backend running on port 10000
- [ ] AdminSupa shows `localhost:10000` in console
- [ ] User app shows `localhost:10000` in console
- [ ] Can add carousel in AdminSupa
- [ ] Toast appears in user app immediately
- [ ] Carousel displays without rebuild

---

**Ready to test! 🚀**

Just restart AdminSupa and User App, then add a carousel image!
