const axios = require('axios');

const BASE_URL = 'http://localhost:10000/api';

async function testUserInitialization() {
  try {
    console.log('🧪 Testing user initialization endpoint...\n');
    
    const testDeviceId = `TEST_DEVICE_${Date.now()}`;
    
    const response = await axios.post(`${BASE_URL}/auth/initialize`, {
      deviceId: testDeviceId,
      deviceName: 'Test Android Device',
      platform: 'android'
    });
    
    console.log('✅ User initialization successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userCount = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${userCount}`);
    
    const user = await prisma.user.findUnique({
      where: { deviceId: testDeviceId }
    });
    
    if (user) {
      console.log('✅ User found in database:');
      console.log('   ID:', user.id);
      console.log('   Device ID:', user.deviceId);
      console.log('   Unique User ID:', user.uniqueUserId);
      console.log('   Is Blocked:', user.isBlocked);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testUserInitialization();
