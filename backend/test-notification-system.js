const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testNotificationSystem() {
  console.log('🔔 Testing Supasoka Notification System...\n');

  try {
    // Test 1: Admin Login
    console.log('1. Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/admin/login`, {
      email: 'admin@supasoka.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('✅ Admin login successful');

    // Test 2: Get Users for Notification
    console.log('\n2. Getting users for notification...');
    const usersResponse = await axios.get(`${BASE_URL}/admin/stats`, { headers: authHeaders });
    console.log(`✅ Found ${usersResponse.data.stats.totalUsers} users in system`);

    // Test 3: Send Status Bar Notification (High Priority)
    console.log('\n3. Sending HIGH priority status bar notification...');
    const highPriorityNotification = {
      title: 'Ujumbe Muhimu!',
      message: 'Hii ni ujumbe wa haraka kutoka kwa msimamizi. Soma kwa makini.',
      priority: 'high',
      targetUsers: [] // Empty array means all users
    };

    const highNotifResponse = await axios.post(
      `${BASE_URL}/notifications/admin/send-status-bar`, 
      highPriorityNotification, 
      { headers: authHeaders }
    );
    console.log('✅ High priority notification sent successfully');
    console.log(`   📱 Notification ID: ${highNotifResponse.data.notification.id}`);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Send Status Bar Notification (Normal Priority)
    console.log('\n4. Sending NORMAL priority status bar notification...');
    const normalPriorityNotification = {
      title: 'Habari za Kawaida',
      message: 'Karibu kwenye mfumo wa Supasoka! Furahia kutazama.',
      priority: 'normal',
      targetUsers: []
    };

    const normalNotifResponse = await axios.post(
      `${BASE_URL}/notifications/admin/send-status-bar`, 
      normalPriorityNotification, 
      { headers: authHeaders }
    );
    console.log('✅ Normal priority notification sent successfully');
    console.log(`   📱 Notification ID: ${normalNotifResponse.data.notification.id}`);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Send Status Bar Notification (Low Priority)
    console.log('\n5. Sending LOW priority status bar notification...');
    const lowPriorityNotification = {
      title: 'Kumbuka',
      message: 'Unaweza kupata pointi zaidi kwa kutazama matangazo.',
      priority: 'low',
      targetUsers: []
    };

    const lowNotifResponse = await axios.post(
      `${BASE_URL}/notifications/admin/send-status-bar`, 
      lowPriorityNotification, 
      { headers: authHeaders }
    );
    console.log('✅ Low priority notification sent successfully');
    console.log(`   📱 Notification ID: ${lowNotifResponse.data.notification.id}`);

    // Test 6: Send General Notification
    console.log('\n6. Sending general notification...');
    const generalNotification = {
      title: 'Tangazo la Jumla',
      message: 'Mfumo wa Supasoka umeboreshwa. Furahia huduma mpya!',
      type: 'update',
      targetUsers: []
      // Remove scheduledAt to send immediately
    };

    const generalNotifResponse = await axios.post(
      `${BASE_URL}/notifications/admin/create`, 
      generalNotification, 
      { headers: authHeaders }
    );
    console.log('✅ General notification sent successfully');
    console.log(`   📱 Notification ID: ${generalNotifResponse.data.notification.id}`);

    console.log('\n🎉 All Notification Tests Passed!');
    console.log('\n📊 Summary:');
    console.log('✅ Admin Authentication: Working');
    console.log('✅ High Priority Status Bar Notification: Sent');
    console.log('✅ Normal Priority Status Bar Notification: Sent');
    console.log('✅ Low Priority Status Bar Notification: Sent');
    console.log('✅ General Notification: Sent');
    console.log('\n📱 Mobile users should now see status bar notifications!');
    console.log('\n💡 Instructions for mobile users:');
    console.log('   - High priority notifications stay until dismissed');
    console.log('   - Normal priority notifications auto-hide after 8 seconds');
    console.log('   - Low priority notifications auto-hide after 5 seconds');
    console.log('   - All notifications appear at the top of the screen');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testNotificationSystem();
