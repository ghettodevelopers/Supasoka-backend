const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Test Real Device Registration
 * This script simulates a real mobile app registering with the backend
 * and saves the device info to the database
 */

async function testRealDeviceRegistration() {
  try {
    console.log('🔄 Testing Real Device Registration...\n');

    // Simulate a real Android device
    const realDeviceId = `android_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📱 Simulating real Android device:');
    console.log(`  Device ID: ${realDeviceId}`);
    console.log(`  Device Name: Samsung Galaxy S23`);
    console.log(`  Platform: Android\n`);

    // Step 1: Register device with backend
    console.log('📤 Sending registration request to backend...\n');
    
    const registerResponse = await axios.post(`${BASE_URL}/auth/initialize`, {
      deviceId: realDeviceId,
      deviceName: 'Samsung Galaxy S23',
      platform: 'android',
      appVersion: '1.0.0'
    });

    if (!registerResponse.data || !registerResponse.data.user) {
      throw new Error('Invalid response from backend');
    }

    const { user, token } = registerResponse.data;

    console.log('✅ Device registered successfully!\n');
    console.log('📋 User Created:');
    console.log(`  User ID: ${user.id}`);
    console.log(`  Device ID: ${user.deviceId}`);
    console.log(`  Unique Username: ${user.uniqueUserId}`);
    console.log(`  Points: ${user.points}`);
    console.log(`  Access Level: ${user.accessLevel}`);
    console.log(`  Activated: ${user.isActivated ? '✅ Yes' : '❌ No'}\n`);

    // Step 2: Verify in database
    console.log('🔍 Verifying in database...\n');
    
    const dbUser = await prisma.user.findUnique({
      where: { deviceId: realDeviceId },
      select: {
        id: true,
        deviceId: true,
        uniqueUserId: true,
        points: true,
        remainingTime: true,
        isActivated: true,
        isBlocked: true,
        accessLevel: true,
        createdAt: true
      }
    });

    if (!dbUser) {
      throw new Error('User not found in database after registration!');
    }

    console.log('✅ User found in database!\n');
    console.log('📊 Database Record:');
    console.log(`  ID: ${dbUser.id}`);
    console.log(`  Device ID: ${dbUser.deviceId}`);
    console.log(`  Unique Username: ${dbUser.uniqueUserId}`);
    console.log(`  Points: ${dbUser.points}`);
    console.log(`  Remaining Time: ${dbUser.remainingTime} minutes`);
    console.log(`  Activated: ${dbUser.isActivated ? '✅ Yes' : '❌ No'}`);
    console.log(`  Blocked: ${dbUser.isBlocked ? '❌ Yes' : '✅ No'}`);
    console.log(`  Access Level: ${dbUser.accessLevel}`);
    console.log(`  Created At: ${new Date(dbUser.createdAt).toLocaleString()}\n`);

    console.log('🎉 SUCCESS! Real device registered and saved to database!\n');
    console.log('📝 Next Steps:');
    console.log('  1. Run "node check-real-users.js" to see all real users');
    console.log('  2. Users can now login with their unique username\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    console.log('\n⚠️  Make sure backend is running at:', BASE_URL);
    console.log('   Start with: npm run dev\n');
  } finally {
    await prisma.$disconnect();
  }
}

testRealDeviceRegistration();
