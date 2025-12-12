const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNullUniqueIds() {
  try {
    console.log('🔍 Checking for users with NULL uniqueUserId...\n');
    
    // Find users with null uniqueUserId
    const usersWithoutUniqueId = await prisma.user.findMany({
      where: {
        OR: [
          { uniqueUserId: null },
          { uniqueUserId: '' }
        ]
      }
    });
    
    if (usersWithoutUniqueId.length === 0) {
      console.log('✅ All users have valid uniqueUserId!');
      
      // Show all users
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          deviceId: true,
          uniqueUserId: true,
          isBlocked: true
        }
      });
      
      console.log(`\n📊 Total users: ${allUsers.length}`);
      allUsers.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Device ID: ${user.deviceId}`);
        console.log(`  Unique User ID: ${user.uniqueUserId}`);
        console.log(`  Is Blocked: ${user.isBlocked}`);
      });
      
      return;
    }
    
    console.log(`⚠️  Found ${usersWithoutUniqueId.length} users with NULL uniqueUserId`);
    console.log('Fixing them now...\n');
    
    let fixed = 0;
    for (const user of usersWithoutUniqueId) {
      const uniqueUserId = `User_${Math.random().toString(36).substr(2, 6)}`;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { uniqueUserId }
      });
      
      console.log(`✅ Fixed user ${user.id}: ${uniqueUserId}`);
      fixed++;
    }
    
    console.log(`\n✅ Fixed ${fixed} users!`);
    
    // Verify fix
    const stillBroken = await prisma.user.count({
      where: {
        OR: [
          { uniqueUserId: null },
          { uniqueUserId: '' }
        ]
      }
    });
    
    if (stillBroken === 0) {
      console.log('✅ All users now have valid uniqueUserId!');
    } else {
      console.log(`⚠️  Still ${stillBroken} users with NULL uniqueUserId`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixNullUniqueIds();
