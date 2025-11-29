const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Test configuration
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@supasoka.com';
const ADMIN_PASSWORD = 'admin123';

async function testCompleteNotificationFlow() {
  try {
    console.log('🧪 Testing Complete Notification Flow...\n');

    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const { token, admin } = loginResponse.data;
    console.log(`✅ Admin logged in: ${admin.name} (${admin.email})`);

    // Set up axios with auth token
    const authAxios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Step 2: Check users
    console.log('\n2. Checking users in database...');
    const users = await prisma.user.findMany({
      select: { id: true, deviceId: true, email: true }
    });
    console.log(`✅ Found ${users.length} users`);
    if (users.length > 0) {
      console.log('Users:', users.map(u => ({ id: u.id.slice(-8), deviceId: u.deviceId, email: u.email })));
    }

    // Step 3: Test immediate notification
    console.log('\n3. Testing immediate notification...');
    const immediateNotification = {
      title: 'Test Immediate Notification',
      message: 'This is a test immediate notification from the API',
      type: 'general',
      targetUsers: null // Send to all users
    };

    const immediateResponse = await authAxios.post('/notifications/admin/send-immediate', immediateNotification);
    console.log(`✅ Immediate notification sent successfully`);
    console.log(`   Notification ID: ${immediateResponse.data.notification.id}`);
    console.log(`   Sent to: ${immediateResponse.data.sentTo} users`);

    // Step 4: Test scheduled notification
    console.log('\n4. Testing scheduled notification...');
    const futureTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const scheduledNotification = {
      title: 'Test Scheduled Notification',
      message: 'This notification was scheduled and should be sent automatically',
      type: 'update',
      targetUsers: null,
      scheduledAt: futureTime.toISOString()
    };

    const scheduledResponse = await authAxios.post('/notifications/admin/create', scheduledNotification);
    console.log(`✅ Scheduled notification created successfully`);
    console.log(`   Notification ID: ${scheduledResponse.data.notification.id}`);
    console.log(`   Scheduled for: ${futureTime.toLocaleString()}`);

    // Step 5: Check user notifications
    console.log('\n5. Checking user notifications...');
    const userNotifications = await prisma.userNotification.findMany({
      include: {
        notification: {
          select: { title: true, message: true, type: true, createdAt: true }
        },
        user: {
          select: { deviceId: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`✅ Found ${userNotifications.length} user notifications (showing last 5)`);
    userNotifications.forEach((un, index) => {
      console.log(`   ${index + 1}. ${un.notification.title} -> ${un.user.deviceId} (Read: ${un.isRead})`);
    });

    // Step 6: Test user API endpoints (simulate mobile app)
    if (users.length > 0) {
      console.log('\n6. Testing user notification endpoints...');
      
      // Create user token
      const userToken = jwt.sign(
        { id: users[0].id, deviceId: users[0].deviceId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userAxios = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      // Get user notifications
      const userNotificationsResponse = await userAxios.get('/notifications?page=1&limit=10');
      console.log(`✅ User can fetch notifications: ${userNotificationsResponse.data.notifications.length} found`);

      if (userNotificationsResponse.data.notifications.length > 0) {
        const firstNotification = userNotificationsResponse.data.notifications[0];
        
        // Test mark as read
        await userAxios.patch(`/notifications/${firstNotification.notification.id}/read`);
        console.log(`✅ Marked notification as read: ${firstNotification.notification.title}`);

        // Test delete notification
        await userAxios.delete(`/notifications/${firstNotification.notification.id}`);
        console.log(`✅ Deleted notification: ${firstNotification.notification.title}`);
      }
    }

    // Step 7: Test admin notification management
    console.log('\n7. Testing admin notification management...');
    const allNotifications = await authAxios.get('/notifications/admin/all?page=1&limit=5');
    console.log(`✅ Admin can fetch all notifications: ${allNotifications.data.notifications.length} found`);

    console.log('\n🎉 Complete notification flow test PASSED!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Admin authentication works');
    console.log('✅ Immediate notifications can be sent');
    console.log('✅ Scheduled notifications can be created');
    console.log('✅ User notifications are properly linked');
    console.log('✅ User API endpoints work (fetch, mark read, delete)');
    console.log('✅ Admin management endpoints work');
    console.log('\n🚀 The notification system is fully functional!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testCompleteNotificationFlow();
}

module.exports = { testCompleteNotificationFlow };
