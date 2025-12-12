const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRealUsers() {
  try {
    console.log('🔍 Checking REAL users in database (excluding test data)...\n');
    
    // Find all users that are NOT test data
    // Test data patterns: TEST_DEVICE, test_, demo_, staging_
    const realUsers = await prisma.user.findMany({
      where: {
        deviceId: { not: undefined },
        uniqueUserId: { not: undefined },
        AND: [
          { deviceId: { notIn: ['TEST_DEVICE_1765501072595'] } },
          {
            NOT: {
              OR: [
                { deviceId: { contains: 'TEST_DEVICE' } },
                { deviceId: { contains: 'test_' } },
                { deviceId: { contains: 'demo_' } },
                { deviceId: { contains: 'staging_' } },
              ]
            }
          }
        ]
      },
      select: {
        id: true,
        deviceId: true,
        uniqueUserId: true,
        deviceToken: true,
        isBlocked: true,
        isActivated: true,
        points: true,
        remainingTime: true,
        subscriptionType: true,
        isSubscribed: true,
        lastActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRealUsers = realUsers.length;
    console.log(`📊 Total REAL users: ${totalRealUsers}\n`);

    if (totalRealUsers > 0) {
      console.log('📋 Real User Details:');
      console.log('==========================================\n');

      realUsers.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Device ID: ${user.deviceId}`);
        console.log(`  Unique User ID: ${user.uniqueUserId}`);
        console.log(`  Device Token: ${user.deviceToken || 'Not set'}`);
        console.log(`  Status: ${user.isBlocked ? '❌ BLOCKED' : '✅ ACTIVE'}`);
        console.log(`  Activated: ${user.isActivated ? '✅ Yes' : '❌ No'}`);
        console.log(`  Points: ${user.points}`);
        console.log(`  Remaining Time: ${user.remainingTime} minutes`);
        console.log(`  Subscription: ${user.subscriptionType || 'None'} ${user.isSubscribed ? '(ACTIVE)' : '(INACTIVE)'}`);
        console.log(`  Last Active: ${new Date(user.lastActive).toLocaleString()}`);
        console.log(`  Created: ${new Date(user.createdAt).toLocaleString()}`);
        console.log('-------------------------------------------\n');
      });

      console.log(`\n✅ Total REAL users found: ${totalRealUsers}`);
      console.log('✅ All users have valid deviceId and uniqueUserId\n');

    } else {
      console.log('⚠️  No REAL users found in database!');
      console.log('Users need to open the Supasoka app to register with their device.\n');
      console.log('📝 To register a real device, run: node test-real-device.js\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealUsers();
