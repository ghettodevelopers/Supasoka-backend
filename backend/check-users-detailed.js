const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsersDetailed() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total users: ${totalUsers}`);
    
    if (totalUsers > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          deviceId: true,
          uniqueUserId: true,
          deviceToken: true,
          isBlocked: true,
          lastActive: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('\n📋 User Details:');
      console.log('================');
      
      users.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Device ID: ${user.deviceId || 'NULL'}`);
        console.log(`  Unique User ID: ${user.uniqueUserId || 'NULL'}`);
        console.log(`  Device Token: ${user.deviceToken || 'NULL'}`);
        console.log(`  Is Blocked: ${user.isBlocked}`);
        console.log(`  Last Active: ${user.lastActive || 'NULL'}`);
        console.log(`  Created At: ${user.createdAt}`);
      });
      
      // Check for users with null uniqueUserId
      const usersWithoutUniqueId = users.filter(u => !u.uniqueUserId);
      if (usersWithoutUniqueId.length > 0) {
        console.log(`\n⚠️  WARNING: ${usersWithoutUniqueId.length} users have NULL uniqueUserId!`);
        console.log('These users need to be fixed.');
      }
      
      // Check for users with null deviceId
      const usersWithoutDeviceId = users.filter(u => !u.deviceId);
      if (usersWithoutDeviceId.length > 0) {
        console.log(`\n⚠️  WARNING: ${usersWithoutDeviceId.length} users have NULL deviceId!`);
      }
    } else {
      console.log('\n⚠️  No users found in database!');
      console.log('Users need to open the Supasoka app to initialize.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersDetailed();
