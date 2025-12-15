# Render environment variables for Firebase (Ready-to-paste)

Use this block to add/update environment variables in Render for the `supasoka-backend` service.

**Important:** It's recommended to *generate a fresh service account key* in the Firebase Console and use that instead of an old/committed key (see steps below).

---

### Required variables (copy and paste values below as-is)

FIREBASE_PROJECT_ID=supasoka-18128
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@supasoka-18128.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=111155352046035044230
FIREBASE_PRIVATE_KEY_ID=b6e9309e21935839dd007af7720d6be044506a80
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40supasoka-18128.iam.gserviceaccount.com

---

### Private key (two options). Use one — paste the full value into the `FIREBASE_PRIVATE_KEY` env var.

Option A — Multi-line (recommended if Render supports multi-line values):

FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/Begqi80AsF87
y86UDogyedWc5CRHgfoJRU9yoPSuUacDOYb6APjn/xTYygSq3M4AsJhfG8Hg9Ucv
... (rest of key) ...
-----END PRIVATE KEY-----

Option B — Escaped single-line (safe for forms that require single-line): wrap the value in quotes and replace line breaks with `\n` sequences.

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/Begqi80AsF87\ny86UDogyedWc5CRHgfoJRU9yoPSuUacDOYb6APjn/xTYygSq3M4AsJhfG8Hg9Ucv\n... (rest of key) ...\n-----END PRIVATE KEY-----\n"

---

### Optional (legacy fallback / testing)

FCM_LEGACY_SERVER_KEY=<your-legacy-fcm-key-if-any>
TEST_DEVICE_TOKEN=<one-device-token-for-ad-hoc-tests>

---

### Steps to Deploy
1. Generate a fresh service account key (recommended):
   - Firebase Console → Project Settings → Service accounts → Generate new private key
   - Download the JSON and copy the `client_email`, `private_key`, `client_id`, `private_key_id`, and `client_x509_cert_url` values into the Render env vars above.
2. In Render dashboard → your service `supasoka-backend` → Environment → Add the vars above as `key=value` pairs.
3. Trigger a redeploy (Manual Deploy or push a commit).

### Verification
- Run locally or after deploy:

```bash
# Check firebase health endpoint (admin auth required)
node backend/check-firebase-health.js

# Device token diagnostic (admin auth required)
node backend/check-deployed-diagnostic.js

# Send test notification to all users (admin script)
node backend/test-send-notification.js

# Send direct test to one token
node backend/send-direct-to-token.js
```

If the health check shows time skew or token exchange failure, ensure server time is synced on the host. If using Render, their platform time is usually correct—if problems persist, regenerate and upload a new service account key.

---

If you want, paste the new JSON here and I will format the exact `FIREBASE_PRIVATE_KEY` value and a single ready-to-paste block for you to copy directly into Render.