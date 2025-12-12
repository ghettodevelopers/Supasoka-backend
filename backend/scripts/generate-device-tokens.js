const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate device tokens for existing users who don't have one
 * This is a one-time migration script
 */
async function generateDeviceTokens() {
  try {
    console.log('🔍 Finding users without device tokens...');
    
    // Get all users without device tokens
    const usersWithoutTokens = await prisma.user.findMany({
      where: {
        deviceToken: null
      },
      select: {
        id: true,
        deviceId: true,
        uniqueUserId: true
      }
    });

    console.log(`📊 Found ${usersWithoutTokens.length} users without device tokens`);

    if (usersWithoutTokens.length === 0) {
      console.log('✅ All users already have device tokens!');
      return;
    }

    console.log('🔧 Generating device tokens...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutTokens) {
      try {
        // Generate device token in same format as client
        const deviceToken = `FCM_${user.deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Update user with device token
        await prisma.user.update({
          where: { id: user.id },
          data: { deviceToken }
        });

        successCount++;
        console.log(`✅ ${successCount}. Generated token for ${user.uniqueUserId}: ${deviceToken.substring(0, 30)}...`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed for ${user.uniqueUserId}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📱 Total tokens generated: ${successCount}`);

    // Verify results
    const totalWithTokens = await prisma.user.count({
      where: { deviceToken: { not: null } }
    });
    const totalUsers = await prisma.user.count();

    console.log('\n📈 Final Statistics:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users with tokens: ${totalWithTokens}`);
    console.log(`   Coverage: ${((totalWithTokens / totalUsers) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Error generating device tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateDeviceTokens();
