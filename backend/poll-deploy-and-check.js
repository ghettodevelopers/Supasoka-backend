const axios = require('axios');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const API_URL = 'https://supasoka-backend.onrender.com';
const ADMIN_EMAIL = 'Ghettodevelopers@gmail.com';
const ADMIN_PASSWORD = 'Chundabadi';

async function checkOnce() {
  try {
    const login = await axios.post(`${API_URL}/api/auth/admin/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, { timeout: 5000 });
    const token = login.data.token;
    const res = await axios.get(`${API_URL}/api/admin/diagnostic/firebase-health`, { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 });
    return res.data;
  } catch (err) {
    return { error: (err.response && err.response.data) ? err.response.data : err.message };
  }
}

(async () => {
  console.log('Polling deployed backend for firebase-health (5 min timeout)...');
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await checkOnce();
    if (res && res.success) {
      console.log('✅ Health endpoint is available:');
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    }

    console.log('Not ready yet:', JSON.stringify(res.error || res, null, 0));
    await sleep(10000);
  }

  console.error('Timed out waiting for deploy to complete');
  process.exit(1);
})();