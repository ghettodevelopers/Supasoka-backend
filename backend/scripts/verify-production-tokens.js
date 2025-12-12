const axios = require('axios');

/**
 * Verify all production users have device tokens
 * Shows complete user data including usernames and tokens
 */
async function verifyProductionTokens() {
  try {
    console.log('🔍 Verifying PRODUCTION database device tokens...\n');
    
    // Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('https://supasoka-backend.onrender.com/api/auth/admin/login', {
      email: 'Ghettodevelopers@gmail.com',
      password: 'Chundabadi'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!\n');
    
    // Fetch all users
    console.log('2. Fetching all users from PRODUCTION database...');
    const usersResponse = await axios.get('https://supasoka-backend.onrender.com/api/admin/users/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const { total, users } = usersResponse.data;
    console.log(`📊 Total users in PRODUCTION: ${total}\n`);
    
    // Count users with tokens
    const usersWithTokens = users.filter(u => u.deviceToken);
    const usersWithoutTokens = users.filter(u => !u.deviceToken);
    
    console.log('📈 Token Statistics:');
    console.log(`   ✅ Users with tokens: ${usersWithTokens.length}`);
    console.log(`   ❌ Users without tokens: ${usersWithoutTokens.length}`);
    console.log(`   📱 Coverage: ${((usersWithTokens.length / total) * 100).toFixed(2)}%\n`);
    
    console.log('=' .repeat(80));
    console.log('📋 ALL PRODUCTION USERS WITH DEVICE TOKENS:');
    console.log('='.repeat(80));
    console.log('');
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Unique User ID: ${user.uniqueUserId || 'NULL'}`);
      console.log(`  Device ID: ${user.deviceId || 'NULL'}`);
      
      if (user.deviceToken) {
        // Show first 50 chars of token for verification
        const tokenPreview = user.deviceToken.substring(0, 50);
        const tokenEnd = user.deviceToken.substring(user.deviceToken.length - 10);
        console.log(`  Device Token: ${tokenPreview}...${tokenEnd}`);
        console.log(`  Token Length: ${user.deviceToken.length} characters`);
        console.log(`  ✅ HAS TOKEN`);
      } else {
        console.log(`  Device Token: NULL`);
        console.log(`  ❌ NO TOKEN`);
      }
      
      console.log(`  Is Subscribed: ${user.isSubscribed}`);
      console.log(`  Is Blocked: ${user.isBlocked}`);
      console.log(`  Last Active: ${user.lastActive || 'NULL'}`);
      console.log(`  Created At: ${user.createdAt}`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    
    if (usersWithoutTokens.length > 0) {
      console.log('\n⚠️  WARNING: The following users still have NULL tokens:');
      usersWithoutTokens.forEach(u => {
        console.log(`   - ${u.uniqueUserId} (${u.deviceId})`);
      });
    } else {
      console.log('\n🎉 SUCCESS! All production users have device tokens!');
      console.log('✅ Notifications will work for all users');
      console.log('✅ Admin panel will show correct token statistics');
    }

  } catch (error) {
    console.error('❌ Error verifying tokens:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the script
verifyProductionTokens();
