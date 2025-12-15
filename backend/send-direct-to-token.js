const axios = require('axios');
const pushService = require('./services/pushNotificationService');

const API_URL = 'https://supasoka-backend.onrender.com';
const ADMIN_EMAIL = 'Ghettodevelopers@gmail.com';
const ADMIN_PASSWORD = 'Chundabadi';

(async () => {
  try {
    const login = await axios.post(`${API_URL}/api/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const token = login.data.token;
    console.log('✅ Logged in to deployed backend');

    const usersRes = await axios.get(`${API_URL}/api/admin/users/list?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = usersRes.data.users || usersRes.data;
    const userWithToken = users.find(u => u.deviceToken && u.deviceToken.length > 10);
    if (!userWithToken) {
      console.error('No user with device token found');
      process.exit(1);
    }

    console.log('Sending direct push to token of user:', userWithToken.uniqueUserId || userWithToken.id);
    const result = await pushService.sendToDevices([userWithToken.deviceToken], {
      title: 'Direct Token Test',
      message: 'Testing direct push to a specific token',
      type: 'test'
    });

    console.log('Direct send result:', result);
  } catch (err) {
    console.error('Error in direct send:', err.response?.data || err.message);
    process.exit(1);
  }
})();