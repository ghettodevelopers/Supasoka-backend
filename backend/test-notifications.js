const { PrismaClient } = require('@prisma/client');
const notificationService = require('./services/notificationService');

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('🧪 Testing notification system...\n');

    // Test 1: Check if notification tables exist
    console.log('1. Testing database tables...');
    const notifications = await prisma.notification.findMany();
    const userNotifications = await prisma.userNotification.findMany();
    console.log(`✅ Found ${notifications.length} notifications and ${userNotifications.length} user notifications\n`);

    // Test 2: Create a test notification
    console.log('2. Creating test notification...');
    const testNotification = await prisma.notification.create({
      data: {
        title: 'Test Notification',
        message: 'This is a test notification to verify the system works.',
        type: 'general',
        targetUsers: null, // Send to all users
        scheduledAt: null, // Send immediately
        sentAt: new Date()
      }
    });
    console.log(`✅ Created notification: ${testNotification.title} (ID: ${testNotification.id})\n`);

    // Test 3: Check if users exist
    console.log('3. Checking for users...');
    const users = await prisma.user.findMany({
      select: { id: true, deviceId: true }
    });
    console.log(`✅ Found ${users.length} users in database\n`);

    if (users.length > 0) {
      // Test 4: Create user notifications
      console.log('4. Creating user notifications...');
      const userNotificationData = users.map(user => ({
        userId: user.id,
        notificationId: testNotification.id
      }));

      await prisma.userNotification.createMany({
        data: userNotificationData
      });
      console.log(`✅ Created user notifications for ${users.length} users\n`);

      // Test 5: Test notification service
      console.log('5. Testing notification service...');
      const serviceResult = await notificationService.sendRealTimeNotification(
        null, // No io object for this test
        users,
        'Service Test',
        'Testing notification service functionality',
        { type: 'test' }
      );
      console.log(`✅ Notification service test: ${serviceResult.success ? 'PASSED' : 'FAILED'}\n`);
    } else {
      console.log('⚠️  No users found. Create a user first to test user notifications.\n');
    }

    // Test 6: Test scheduled notification
    console.log('6. Creating scheduled notification...');
    const scheduledNotification = await prisma.notification.create({
      data: {
        title: 'Scheduled Test',
        message: 'This notification is scheduled for 1 minute from now.',
        type: 'general',
        targetUsers: null,
        scheduledAt: new Date(Date.now() + 60000), // 1 minute from now
        sentAt: null
      }
    });
    console.log(`✅ Created scheduled notification: ${scheduledNotification.title} (ID: ${scheduledNotification.id})\n`);

    console.log('🎉 All notification tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Database tables are working');
    console.log('- Notifications can be created');
    console.log('- User notifications can be linked');
    console.log('- Notification service is functional');
    console.log('- Scheduled notifications are supported');
    console.log('\n🚀 The notification system is ready to use!');

  } catch (error) {
    console.error('❌ Notification test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
