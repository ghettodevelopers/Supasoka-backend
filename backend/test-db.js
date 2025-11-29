const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Test admin table
    const admins = await prisma.admin.findMany();
    console.log('✅ Admin table accessible, found', admins.length, 'admins');
    
    // Test channel table
    const channels = await prisma.channel.findMany();
    console.log('✅ Channel table accessible, found', channels.length, 'channels');
    
    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
