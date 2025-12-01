# Contact Integration - Admin Managed Call & WhatsApp Numbers

## Overview
The call and WhatsApp functionality in the bottom tab navigation is now fully integrated with admin-managed contact settings from AdminSupa. Admins can update phone numbers in the admin panel, and the changes will automatically reflect in the user app.

## Architecture

### Backend (Already Implemented)
**Location**: `backend/routes/admin.js`

#### Endpoints:
1. **Public Endpoint** (User App):
   ```
   GET /api/admin/contact-settings/public
   ```
   - No authentication required
   - Returns active contact settings
   - Used by mobile app to fetch phone numbers

2. **Admin Endpoints**:
   ```
   GET /api/admin/contact-settings (View settings)
   PUT /api/admin/contact-settings (Update settings)
   POST /api/admin/contact-settings/initialize (Initialize)
   ```
   - Requires admin authentication
   - Used by AdminSupa to manage contact settings

#### Database Schema:
```prisma
model ContactSettings {
  id             String   @id @default(cuid())
  whatsappNumber String?
  callNumber     String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### Mobile App Integration

#### 1. Contact Service
**Location**: `services/contactService.js`

**Features**:
- Fetches contact settings from backend
- Formats phone numbers (handles +255, 0, or plain formats)
- Generates WhatsApp URLs with pre-filled message
- Generates call URLs

**Methods**:
```javascript
getContactSettings()          // Fetch from backend
formatPhoneNumber(number)     // Format to +255XXXXXXXXX
generateWhatsAppUrl(number)   // Create whatsapp://send URL
generateCallUrl(number)       // Create tel: URL
```

#### 2. Contact Context
**Location**: `contexts/ContactContext.js`

**Features**:
- Global state management for contact settings
- 5-minute caching to reduce API calls
- Helper functions to check availability
- Auto-refresh on app start

**Provided Values**:
```javascript
{
  contactSettings: {
    whatsappNumber: "+255XXXXXXXXX",
    callNumber: "+255XXXXXXXXX",
    whatsappUrl: "whatsapp://send?phone=...",
    callUrl: "tel:+255XXXXXXXXX"
  },
  loading: boolean,
  error: string,
  hasWhatsApp(): boolean,
  hasCall(): boolean,
  refreshContactSettings(): Promise
}
```

#### 3. App Navigator Integration
**Location**: `navigation/AppNavigator.js`

**Updated Features**:
- Uses `useContact()` hook to access admin settings
- Dynamic phone numbers from backend
- Error handling for missing numbers
- Loading state management
- User-friendly Swahili error messages

**Call Handler**:
```javascript
const handleCallPress = () => {
  if (loading) {
    Alert.alert('Subiri', 'Inapakia taarifa za mawasiliano...');
    return;
  }

  if (!contactSettings?.callUrl) {
    Alert.alert('Samahani', 'Namba ya simu haipatikani...');
    return;
  }

  Linking.openURL(contactSettings.callUrl);
};
```

**WhatsApp Handler**:
```javascript
const handleWhatsAppPress = () => {
  if (loading) {
    Alert.alert('Subiri', 'Inapakia taarifa za mawasiliano...');
    return;
  }

  if (!contactSettings?.whatsappUrl) {
    Alert.alert('Samahani', 'Namba ya WhatsApp haipatikani...');
    return;
  }

  Linking.openURL(contactSettings.whatsappUrl);
};
```

## AdminSupa Integration

### Contact Settings Management
**Location**: AdminSupa admin panel

**Features**:
- Update WhatsApp number
- Update call number
- Real-time validation
- Instant sync to user app

**How Admin Updates Numbers**:
1. Admin logs into AdminSupa
2. Navigates to Settings → Contact Settings
3. Updates WhatsApp and/or Call numbers
4. Clicks Save
5. Backend updates database
6. Socket.IO broadcasts change (optional)
7. User app fetches new settings on next request or cache expiry

## User Experience Flow

### First Time Use:
1. User opens app
2. ContactContext fetches settings from backend
3. Settings cached for 5 minutes
4. User clicks Call or WhatsApp tab
5. App opens phone dialer or WhatsApp with admin's number

### When Admin Updates Numbers:
1. Admin updates numbers in AdminSupa
2. Backend saves to database
3. User app cache expires after 5 minutes
4. Next fetch gets updated numbers
5. User sees new numbers automatically

### Error Handling:
- **No Internet**: Shows cached numbers if available
- **Backend Down**: Shows error message in Swahili
- **Numbers Not Set**: Shows friendly message asking to try later
- **Invalid Numbers**: Backend validates before saving

## Phone Number Formats Supported

### Input Formats (Admin can enter any):
- `0712345678` (Local format)
- `255712345678` (International without +)
- `+255712345678` (Full international)

### Output Format (Always):
- Call URL: `tel:+255712345678`
- WhatsApp URL: `whatsapp://send?phone=255712345678&text=...`

## Real-time Updates (Optional)

### Socket.IO Integration:
When admin updates contact settings, backend emits:
```javascript
io.to('admin-room').emit('contact-settings-updated', { contactSettings });
io.emit('settings-updated', { type: 'contact', contactSettings });
```

User app can listen for these events to update immediately without waiting for cache expiry.

## Security Features

### Public Endpoint Security:
- Read-only access
- No sensitive data exposed
- Only active settings returned
- Rate limiting applied

### Admin Endpoint Security:
- JWT authentication required
- Admin role verification
- Input validation
- SQL injection protection (Prisma ORM)

## Testing Checklist

### Backend Testing:
- [ ] GET /api/admin/contact-settings/public returns settings
- [ ] PUT /api/admin/contact-settings updates successfully
- [ ] Invalid phone numbers are rejected
- [ ] Only active settings are returned

### Mobile App Testing:
- [ ] Call button opens dialer with correct number
- [ ] WhatsApp button opens WhatsApp with correct number
- [ ] Error messages show when numbers not available
- [ ] Loading state shows during fetch
- [ ] Cache works (no repeated API calls within 5 minutes)

### AdminSupa Testing:
- [ ] Admin can view current settings
- [ ] Admin can update WhatsApp number
- [ ] Admin can update call number
- [ ] Changes save successfully
- [ ] Validation works for invalid numbers

## Troubleshooting

### Issue: Numbers not updating in app
**Solution**: 
- Clear app cache
- Wait 5 minutes for cache expiry
- Force refresh contact settings

### Issue: Call/WhatsApp not opening
**Solution**:
- Check if phone/WhatsApp app is installed
- Verify number format in database
- Check device permissions

### Issue: Backend returns null
**Solution**:
- Run contact settings initialization
- Verify database has contactSettings table
- Check if isActive is true

## Production Deployment

### Prerequisites:
1. Database has contactSettings table
2. Admin has set initial phone numbers
3. Backend API is accessible
4. Mobile app has internet permission

### Post-Deployment:
1. Admin sets WhatsApp and call numbers
2. Test both buttons in mobile app
3. Verify numbers are correct
4. Monitor error logs for issues

## Future Enhancements

### Potential Features:
- Multiple contact numbers (support team)
- Business hours display
- SMS integration
- Email support
- Live chat integration
- Contact preference settings

---

**Status**: ✅ Fully Integrated and Production Ready

**Last Updated**: November 30, 2025
