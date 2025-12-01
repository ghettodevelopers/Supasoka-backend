# ZenoPay 403 Error - Troubleshooting Guide

## Error: 403 Forbidden

A 403 error from ZenoPay means the API is rejecting your authentication. Here's how to fix it:

## Possible Causes & Solutions

### 1. **API Key Format Issue**

**Problem**: ZenoPay might expect the API key in a different format.

**Solutions to Try**:

#### Option A: Check API Key Header Format
The service now tries multiple authentication methods:
- `Authorization: YOUR_API_KEY` (without Bearer)
- `X-API-Key: YOUR_API_KEY` (alternative header)

#### Option B: Verify API Key is Correct
```javascript
// Current API Key in zenoPayService.js:
apiKey: 'y25RazuSLyAS4bTd4Y9s3XIlSt_MBgUsf4pmSixXXSprbSzIyunQ_vzyiKJgbgMAH3c6a3sDBfsa-qqe1sVTjQ'
```

**Action**: Double-check this matches your ZenoPay dashboard exactly.

### 2. **Account Not Activated**

**Problem**: Your ZenoPay account might need activation or verification.

**Solution**:
1. Login to https://zenoapi.com/dashboard
2. Check account status
3. Verify email if required
4. Complete KYC if needed
5. Check if API access is enabled

### 3. **API Key Permissions**

**Problem**: API key might not have payment permissions.

**Solution**:
1. Go to ZenoPay dashboard
2. Navigate to API Keys section
3. Check permissions for your key
4. Ensure "Mobile Money Payments" is enabled
5. Regenerate key if needed

### 4. **IP Whitelist**

**Problem**: ZenoPay might require IP whitelisting.

**Solution**:
1. Check if ZenoPay requires IP whitelisting
2. Add your server IP to whitelist
3. For development, add your local IP

### 5. **Request Format**

**Problem**: The request payload might not match ZenoPay's expected format.

**Current Payload**:
```json
{
  "phone": "255742123456",
  "amount": 7000,
  "network": "mpesa",
  "reference": "SUPA1701234567891234",
  "description": "Supasoka Subscription",
  "callback_url": "http://your-backend.com/api/payments/zenopay/callback"
}
```

**Action**: Verify this matches ZenoPay documentation.

## Quick Fixes to Try

### Fix 1: Update API Key Header Format

If ZenoPay expects a different header format, update `zenoPayService.js`:

```javascript
// Try this format:
headers: {
  'api-key': this.apiKey,  // lowercase
  'Content-Type': 'application/json',
}

// Or this:
headers: {
  'x-api-key': this.apiKey,  // with x- prefix
  'Content-Type': 'application/json',
}

// Or this:
headers: {
  'Authorization': `ApiKey ${this.apiKey}`,  // with ApiKey prefix
  'Content-Type': 'application/json',
}
```

### Fix 2: Test with cURL

Test the API directly to isolate the issue:

```bash
curl -X POST https://zenoapi.com/api/payments/mobile_money_tanzania \
  -H "Authorization: y25RazuSLyAS4bTd4Y9s3XIlSt_MBgUsf4pmSixXXSprbSzIyunQ_vzyiKJgbgMAH3c6a3sDBfsa-qqe1sVTjQ" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "255742123456",
    "amount": 1000,
    "network": "mpesa",
    "reference": "TEST123",
    "description": "Test Payment"
  }'
```

If this works, the issue is in the app code. If it fails, the issue is with the API key or account.

### Fix 3: Contact ZenoPay Support

**Email**: support@zenoapi.com
**Website**: https://zenoapi.com/support

**Information to Provide**:
- Your API key (first/last 10 characters only)
- Error message: "403 Forbidden"
- Request payload you're sending
- Account email

## Temporary Workaround: Test Mode

While fixing the 403 error, you can enable test mode to continue development:

### Enable Test Mode

Edit `services/zenoPayService.js`:

```javascript
const ZENOPAY_CONFIG = {
  apiKey: 'y25RazuSLyAS4bTd4Y9s3XIlSt_MBgUsf4pmSixXXSprbSzIyunQ_vzyiKJgbgMAH3c6a3sDBfsa-qqe1sVTjQ',
  apiUrl: 'https://zenoapi.com/api/payments/mobile_money_tanzania',
  testMode: true, // ADD THIS LINE
};
```

Then update `initiatePayment`:

```javascript
async initiatePayment(paymentData) {
  // If test mode, simulate success
  if (ZENOPAY_CONFIG.testMode) {
    console.log('🧪 TEST MODE: Simulating payment success');
    return {
      success: true,
      data: {
        reference: paymentData.reference,
        status: 'pending',
        message: 'Test payment initiated'
      },
      message: 'Test payment initiated successfully',
    };
  }
  
  // Normal flow continues...
}
```

## Debugging Steps

### Step 1: Check Console Logs

Look for these logs in your terminal:

```
🔄 Initiating ZenoPay payment: { phone, amount, network, reference }
❌ ZenoPay payment failed: [error details]
Error details: { message, response, status, headers }
🔑 403 Error - API Key issue. Check: [checklist]
```

### Step 2: Verify Request

The service now logs the full request. Check:
- Phone number format (should be 255XXXXXXXXX)
- Amount (should be number, not string)
- Network code (mpesa, tigopesa, airtel, halopesa)
- Reference (unique string)

### Step 3: Check Response

The error details will show what ZenoPay returned:
```javascript
{
  message: "...",
  response: { /* ZenoPay error details */ },
  status: 403,
  headers: { /* response headers */ }
}
```

## Common 403 Error Messages

### "Invalid API Key"
- **Cause**: API key is wrong or malformed
- **Fix**: Copy API key again from ZenoPay dashboard

### "API Key Disabled"
- **Cause**: API key was revoked or disabled
- **Fix**: Generate new API key in dashboard

### "Insufficient Permissions"
- **Cause**: API key doesn't have payment permissions
- **Fix**: Update permissions in dashboard

### "Account Suspended"
- **Cause**: ZenoPay account has issues
- **Fix**: Contact ZenoPay support

### "IP Not Whitelisted"
- **Cause**: Your IP is not allowed
- **Fix**: Add IP to whitelist in dashboard

## Next Steps

1. **Check Console Logs**: Look at the detailed error output
2. **Verify API Key**: Ensure it matches your dashboard
3. **Test with cURL**: Isolate if it's an app issue or API issue
4. **Contact ZenoPay**: Get official support if needed
5. **Use Test Mode**: Continue development while fixing

## Alternative: Manual Testing

You can also test the backend endpoint directly:

```bash
# Test backend callback (simulates successful payment)
curl -X POST http://localhost:5000/api/payments/zenopay/callback \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "TEST123",
    "status": "completed",
    "amount": 7000,
    "phone": "255742123456",
    "network": "mpesa",
    "transaction_id": "ABC123"
  }'
```

This will activate the subscription without needing ZenoPay to work.

## Updated Files

The following files have been updated with better error handling:
- ✅ `services/zenoPayService.js` - Added multiple auth methods and detailed logging

## Status

- ✅ Enhanced error logging
- ✅ Multiple authentication methods tried
- ✅ Detailed 403 error handling
- ⏳ Waiting for ZenoPay API key verification

---

**Next Action**: Check the console logs for detailed error information, then contact ZenoPay support if needed.
