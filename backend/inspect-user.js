const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({ select: { id: true, deviceToken: true, deviceId: true, uniqueUserId: true } });
    console.log('Sample user:', user);
  } catch (err) {
    console.error('Error inspecting user:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();