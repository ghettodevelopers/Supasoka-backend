const axios = require('axios');

async function testSendNotification() {
    try {
        console.log('🧪 Testing Notification System Fix\n');
        console.log('='.repeat(60));

        const API_URL = 'https://supasoka-backend.onrender.com';

        // Step 1: Login as admin
        console.log('\n1️⃣  Logging in as admin...');
        const loginResponse = await axios.post(`${API_URL}/api/auth/admin/login`, {
            email: 'Ghettodevelopers@gmail.com',
            password: 'Chundabadi'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful!\n');

        // Step 2: Get user count first
        console.log('2️⃣  Checking current user count...');
        const usersResponse = await axios.get(`${API_URL}/api/admin/users/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const totalUsersInDb = usersResponse.data.total;
        console.log(`📊 Total users in database: ${totalUsersInDb}`);

        const usersWithTokens = usersResponse.data.users.filter(u => u.deviceToken);
        console.log(`📱 Users with device tokens: ${usersWithTokens.length}\n`);

        // Step 3: Send test notification
        console.log('3️⃣  Sending test notification...');
        const notificationData = {
            title: 'Test Notification',
            message: 'This is a test notification to verify the fix works! All users should receive this.',
            type: 'general'
        };

        const sendResponse = await axios.post(
            `${API_URL}/api/admin/notifications/send-realtime`,
            notificationData,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        console.log('✅ Notification sent successfully!\n');

        // Debug: Show full response
        console.log('🔍 Full Response Data:');
        console.log(JSON.stringify(sendResponse.data, null, 2));
        console.log('\n');

        // Step 4: Display results
        console.log('='.repeat(60));
        console.log('📊 NOTIFICATION RESULTS:');
        console.log('='.repeat(60));

        const { notification, stats } = sendResponse.data;

        console.log('\n📝 Notification Details:');
        console.log(`   ID: ${notification.id}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Message: ${notification.message}`);
        console.log(`   Type: ${notification.type}`);
        console.log(`   Created: ${notification.createdAt}`);

        console.log('\n📊 Statistics:');
        console.log(`   Total Users: ${stats.totalUsers}`);
        console.log(`   Online Users: ${stats.socketEmissions}`);
        console.log(`   Offline Users: ${stats.offlineUsers}`);
        console.log(`   Push Notifications Sent: ${stats.pushNotificationsSent}`);
        console.log(`   Database Records Created: ${stats.userNotificationsCreated}`);

        console.log('\n' + '='.repeat(60));

        // Step 5: Verify expectations
        console.log('\n✅ VERIFICATION:');
        if (stats.totalUsers === totalUsersInDb) {
            console.log(`   ✅ Total users matches database (${totalUsersInDb})`);
        } else {
            console.log(`   ⚠️  Total users mismatch: expected ${totalUsersInDb}, got ${stats.totalUsers}`);
        }

        if (stats.userNotificationsCreated === totalUsersInDb) {
            console.log(`   ✅ UserNotification records created for all users`);
        } else {
            console.log(`   ⚠️  UserNotification records mismatch`);
        }

        if (stats.pushNotificationsSent > 0) {
            console.log(`   ✅ Push notifications sent to ${stats.pushNotificationsSent} devices`);
        } else {
            console.log(`   ⚠️  No push notifications sent`);
        }

        console.log('\n🎉 Test completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed!');
        console.error('Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('\n⚠️  Authentication failed. Check admin credentials.');
        }
        process.exit(1);
    }
}

testSendNotification();
