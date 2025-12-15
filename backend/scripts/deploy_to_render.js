const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Usage:
// Set env vars in PowerShell before running:
// $env:RENDER_API_KEY = "<your-render-api-key>"
// $env:RENDER_SERVICE_ID = "<your-render-service-id>"
// node backend/scripts/deploy_to_render.js

async function main() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;

  if (!apiKey || !serviceId) {
    console.error('Please set RENDER_API_KEY and RENDER_SERVICE_ID environment variables');
    process.exit(1);
  }

  const saPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('firebase-service-account.json not found in backend/ — place your service account JSON there');
    process.exit(1);
  }

  const sa = require(saPath);

  // Build env var definitions
  const envs = {
    FIREBASE_PROJECT_ID: sa.project_id,
    FIREBASE_CLIENT_EMAIL: sa.client_email,
    FIREBASE_CLIENT_ID: sa.client_id,
    FIREBASE_PRIVATE_KEY_ID: sa.private_key_id,
    FIREBASE_CLIENT_CERT_URL: sa.client_x509_cert_url,
    FIREBASE_PRIVATE_KEY: sa.private_key
  };

  const client = axios.create({ baseURL: 'https://api.render.com/v1', headers: { Authorization: `Bearer ${apiKey}` } });

  try {
    console.log('Fetching existing env vars...');
    const listRes = await client.get(`/services/${serviceId}/env-vars`);
    const existing = listRes.data || [];

    for (const [name, value] of Object.entries(envs)) {
      const found = existing.find(e => e.name === name);
      if (found) {
        console.log(`Updating ${name}...`);
        await client.patch(`/services/${serviceId}/env-vars/${found.id}`, { name, value });
      } else {
        console.log(`Creating ${name}...`);
        await client.post(`/services/${serviceId}/env-vars`, { name, value });
      }
    }

    console.log('Triggering deploy...');
    const deployRes = await client.post(`/services/${serviceId}/deploys`, {});
    console.log('Deploy started:', deployRes.data.id);
    console.log('Done — check Render dashboard for deploy progress.');
  } catch (err) {
    console.error('Error while updating Render env or triggering deploy:', err.response?.data || err.message);
    process.exit(1);
  }
}

main();
