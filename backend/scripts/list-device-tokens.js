const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const totalUsers = await prisma.user.count();
    const usersWithTokens = await prisma.user.count({ where: { deviceToken: { not: null, notIn: ['', 'null', 'undefined'] } } });
    const sample = await prisma.user.findMany({ take: 5, where: { deviceToken: { not: null } }, select: { id: true, uniqueUserId: true, deviceToken: true, isActivated: true, createdAt: true }, orderBy: { createdAt: 'desc' } });

    console.log('Total users:', totalUsers);
    console.log('Users with tokens:', usersWithTokens);
    console.log('Sample tokens:');
    sample.forEach(u => console.log(` - ${u.uniqueUserId || u.id} | token:${u.deviceToken.substring(0, 20)}... | activated:${u.isActivated}`));
  } catch (err) {
    console.error('Error listing device tokens:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
})();