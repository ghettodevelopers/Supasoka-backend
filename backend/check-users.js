const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const totalUsers = await prisma.user.count();
    console.log('Total users in database:', totalUsers);
    
    const activeUsers = await prisma.user.count({
      where: { isBlocked: false }
    });
    console.log('Active (non-blocked) users:', activeUsers);
    
    if (totalUsers > 0) {
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          deviceId: true,
          deviceToken: true,
          isBlocked: true
        }
      });
      console.log('\nSample users:', JSON.stringify(sampleUsers, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
