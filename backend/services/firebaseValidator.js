const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function loadServiceAccount() {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^\"|\"$/g, '').trim(),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      token_uri: process.env.FIREBASE_CLIENT_CERT_URL || 'https://oauth2.googleapis.com/token'
    };
  }

  const jsonPath = path.join(__dirname, '../firebase-service-account.json');
  if (fs.existsSync(jsonPath)) {
    return require(jsonPath);
  }

  throw new Error('Firebase service account not found');
}

async function getGoogleDateHeader() {
  try {
    const res = await axios.get('https://www.googleapis.com/generate_204', { timeout: 5000 });
    return res.headers && res.headers.date ? new Date(res.headers.date) : null;
  } catch (err) {
    try {
      const res = await axios.get('https://www.googleapis.com', { timeout: 5000 });
      return res.headers && res.headers.date ? new Date(res.headers.date) : null;
    } catch (err2) {
      return null;
    }
  }
}

async function validateCredentials() {
  const result = {
    ok: false,
    projectId: null,
    timeDiffMs: null,
    tokenExchange: null,
    error: null
  };

  try {
    const sa = await loadServiceAccount();
    result.projectId = sa.project_id || sa.projectId;

    const googleDate = await getGoogleDateHeader();
    const localDate = new Date();
    result.timeDiffMs = googleDate ? (localDate - googleDate) : null;

    // Build JWT assertion
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: sa.client_email || sa.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform',
      aud: sa.token_uri || sa.tokenUri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3599
    };

    const privateKey = sa.private_key || sa.privateKey;
    if (!privateKey) throw new Error('Private key missing');

    const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256', noTimestamp: true });

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', assertion);

    const tokenUri = sa.token_uri || sa.tokenUri || 'https://oauth2.googleapis.com/token';

    try {
      const res = await axios.post(tokenUri, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      });
      result.tokenExchange = { success: true, scope: res.data.scope, expires_in: res.data.expires_in };
      result.ok = true;
      return result;
    } catch (err) {
      result.tokenExchange = { success: false, body: err.response ? err.response.data : err.message, status: err.response ? err.response.status : null };
      result.error = 'Token exchange failed';
      return result;
    }
  } catch (err) {
    result.error = err.message || err;
    return result;
  }
}

module.exports = {
  validateCredentials
};
