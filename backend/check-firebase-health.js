const axios = require('axios');

const API_URL = 'https://supasoka-backend.onrender.com';
const ADMIN_EMAIL = 'Ghettodevelopers@gmail.com';
const ADMIN_PASSWORD = 'Chundabadi';

(async () => {
  try {
    const login = await axios.post(`${API_URL}/api/auth/admin/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.data.token;
    const res = await axios.get(`${API_URL}/api/admin/diagnostic/firebase-health`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
})();