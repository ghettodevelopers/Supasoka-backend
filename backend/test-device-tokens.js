const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Test script to check device token collection
 */

async function testDeviceTokens() {
  try {
    console.log('🧪 Testing Device Token Collection...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        uniqueUserId: true,
        deviceToken: true,
        deviceId: true,
        lastActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total Users: ${users.length}\n`);

    // Count users with tokens
    const usersWithTokens = users.filter(u => u.deviceToken !== null);
    const usersWithoutTokens = users.filter(u => u.deviceToken === null);

    console.log(`✅ Users with Device Tokens: ${usersWithTokens.length}`);
    console.log(`❌ Users without Device Tokens: ${usersWithoutTokens.length}`);
    console.log(`📈 Token Coverage: ${((usersWithTokens.length / users.length) * 100).toFixed(2)}%\n`);

    // Show sample users with tokens
    if (usersWithTokens.length > 0) {
      console.log('📱 Sample Users with Tokens:');
      usersWithTokens.slice(0, 5).forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.uniqueUserId}`);
        console.log(`   Token: ${user.deviceToken.substring(0, 30)}...`);
        console.log(`   Device ID: ${user.deviceId || 'N/A'}`);
        console.log(`   Last Active: ${user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}`);
      });
    }

    // Show users without tokens
    if (usersWithoutTokens.length > 0) {
      console.log('\n\n⚠️ Users WITHOUT Tokens:');
      usersWithoutTokens.forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.uniqueUserId}`);
        console.log(`   Device ID: ${user.deviceId || 'N/A'}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
        console.log(`   Last Active: ${user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}`);
      });
      console.log('\n💡 These users need to open the app to register their device tokens.');
    }

    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDeviceTokens();
