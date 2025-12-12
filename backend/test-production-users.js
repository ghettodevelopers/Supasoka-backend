const axios = require('axios');

async function testProductionUsers() {
  try {
    console.log('🔍 Testing production database endpoint...\n');
    
    // First, login as admin to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('https://supasoka-backend.onrender.com/api/auth/admin/login', {
      email: 'Ghettodevelopers@gmail.com',
      password: 'Chundabadi'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!\n');
    
    // Now fetch users list
    console.log('2. Fetching users from production database...');
    const usersResponse = await axios.get('https://supasoka-backend.onrender.com/api/admin/users/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const { total, users } = usersResponse.data;
    
    console.log(`\n📊 Total users in PRODUCTION database: ${total}\n`);
    
    if (total > 0) {
      console.log('📋 User Details:');
      console.log('================\n');
      
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Device ID: ${user.deviceId || 'NULL'}`);
        console.log(`  Unique User ID: ${user.uniqueUserId || 'NULL'}`);
        console.log(`  Device Token: ${user.deviceToken ? 'SET' : 'NULL'}`);
        console.log(`  Is Blocked: ${user.isBlocked}`);
        console.log(`  Is Subscribed: ${user.isSubscribed}`);
        console.log(`  Last Active: ${user.lastActive || 'NULL'}`);
        console.log(`  Created At: ${user.createdAt}`);
        console.log('');
      });
      
      // Check for issues
      const usersWithoutUniqueId = users.filter(u => !u.uniqueUserId);
      if (usersWithoutUniqueId.length > 0) {
        console.log(`⚠️  WARNING: ${usersWithoutUniqueId.length} users have NULL uniqueUserId!`);
      }
      
      const usersWithoutDeviceId = users.filter(u => !u.deviceId);
      if (usersWithoutDeviceId.length > 0) {
        console.log(`⚠️  WARNING: ${usersWithoutDeviceId.length} users have NULL deviceId!`);
      }
      
      if (usersWithoutUniqueId.length === 0 && usersWithoutDeviceId.length === 0) {
        console.log('✅ All users have valid data!');
      }
    } else {
      console.log('⚠️  No users found in PRODUCTION database!');
      console.log('This means:');
      console.log('  - No users have opened the Supasoka app yet, OR');
      console.log('  - Users are connecting to a different backend, OR');
      console.log('  - User initialization is failing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed. Check admin credentials.');
    }
  }
}

testProductionUsers();
