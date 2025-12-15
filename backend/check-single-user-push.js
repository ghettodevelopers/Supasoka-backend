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

    // Fetch users with tokens
    const usersRes = await axios.get(`${API_URL}/api/admin/users/list?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = usersRes.data.users || usersRes.data;
    const userWithToken = users.find(u => u.deviceToken && u.deviceToken.length > 10);
    if (!userWithToken) {
      console.error('No user with device token found');
      process.exit(1);
    }

    console.log('Selected user:', userWithToken.uniqueUserId || userWithToken.id);
    console.log('Token preview:', (userWithToken.deviceToken || '').substring(0, 40));

    // Send a targeted notification to this user
    const payload = {
      title: 'Single User Test',
      message: 'Testing push to one device',
      type: 'general',
      targetUsers: [userWithToken.id]
    };

    const sendRes = await axios.post(`${API_URL}/api/admin/notifications/send-realtime`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Send response:');
    console.log(JSON.stringify(sendRes.data, null, 2));
  } catch (err) {
    console.error('Error during single user push:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();
