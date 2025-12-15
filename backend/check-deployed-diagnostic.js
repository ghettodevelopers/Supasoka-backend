const axios = require('axios');

const API_URL = 'https://supasoka-backend.onrender.com';
const ADMIN_EMAIL = 'Ghettodevelopers@gmail.com';
const ADMIN_PASSWORD = 'Chundabadi';

async function run() {
  try {
    const login = await axios.post(`${API_URL}/api/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const token = login.data.token;
    console.log('✅ Logged in as admin');

    const res = await axios.get(`${API_URL}/api/admin/diagnostic/device-tokens`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('🔍 Diagnostic data:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error fetching diagnostic:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();
