const axios = require('axios');

/**
 * Generate device tokens for existing production users who don't have one
 * Connects to Render.com production database via API
 */
async function generateDeviceTokensProduction() {
  try {
    console.log('🔍 Connecting to PRODUCTION database (Render.com)...\n');
    
    // Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('https://supasoka-backend.onrender.com/api/auth/admin/login', {
      email: 'Ghettodevelopers@gmail.com',
      password: 'Chundabadi'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!\n');
    
    // Fetch all users
    console.log('2. Fetching users from production database...');
    const usersResponse = await axios.get('https://supasoka-backend.onrender.com/api/admin/users/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const { total, users } = usersResponse.data;
    console.log(`📊 Total users in production: ${total}\n`);
    
    // Filter users without device tokens
    const usersWithoutTokens = users.filter(u => !u.deviceToken);
    console.log(`📊 Found ${usersWithoutTokens.length} users without device tokens\n`);

    if (usersWithoutTokens.length === 0) {
      console.log('✅ All users already have device tokens!');
      return;
    }

    console.log('🔧 Generating device tokens for production users...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutTokens) {
      try {
        // Generate device token in same format as client
        const deviceToken = `FCM_${user.deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Update user via admin API
        await axios.patch(
          `https://supasoka-backend.onrender.com/api/admin/users/${user.id}/device-token`,
          { deviceToken },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        successCount++;
        console.log(`✅ ${successCount}. Generated token for ${user.uniqueUserId}: ${deviceToken.substring(0, 30)}...`);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed for ${user.uniqueUserId}:`, error.response?.data?.error || error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📱 Total tokens generated: ${successCount}`);

    // Verify results
    console.log('\n3. Verifying results...');
    const verifyResponse = await axios.get('https://supasoka-backend.onrender.com/api/admin/users/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const usersWithTokensAfter = verifyResponse.data.users.filter(u => u.deviceToken);
    const coverage = ((usersWithTokensAfter.length / verifyResponse.data.total) * 100).toFixed(2);

    console.log('\n📈 Final Statistics:');
    console.log(`   Total users: ${verifyResponse.data.total}`);
    console.log(`   Users with tokens: ${usersWithTokensAfter.length}`);
    console.log(`   Coverage: ${coverage}%`);

    if (coverage === '100.00') {
      console.log('\n🎉 SUCCESS! All production users now have device tokens!');
    }

  } catch (error) {
    console.error('❌ Error generating device tokens:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the script
generateDeviceTokensProduction();
