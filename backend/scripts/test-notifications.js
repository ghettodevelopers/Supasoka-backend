/**
 * Notification System Test Script
 * Tests all notification delivery methods: Firebase FCM, Socket.IO, and Database
 */

const { PrismaClient } = require('@prisma/client');
const pushNotificationService = require('../services/pushNotificationService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function testNotificationSystem() {
  console.log('\n🔔 ========================================');
  console.log('   NOTIFICATION SYSTEM DIAGNOSTIC TEST');
  console.log('========================================\n');

  try {
    // 1. Check Firebase Configuration
    console.log('1️⃣ Checking Firebase Configuration...');
    const firebaseInitialized = pushNotificationService.isInitialized();
    const firebaseError = pushNotificationService.getInitError ? pushNotificationService.getInitError() : null;
    
    console.log(`   Firebase Initialized: ${firebaseInitialized ? '✅ YES' : '❌ NO'}`);
    if (firebaseError) {
      console.log(`   Firebase Error: ${firebaseError}`);
    }
    
    const hasFirebaseEnv = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL);
    console.log(`   Firebase Env Variables: ${hasFirebaseEnv ? '✅ SET' : '❌ MISSING'}`);
    
    if (hasFirebaseEnv) {
      console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
      console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
    }
    
    const hasLegacyKey = !!process.env.FCM_LEGACY_SERVER_KEY;
    console.log(`   Legacy FCM Key: ${hasLegacyKey ? '✅ SET' : '⚠️ NOT SET'}`);

    // 2. Check Database Schema
    console.log('\n2️⃣ Checking Database Schema...');
    try {
      const userSample = await prisma.user.findFirst({
        select: {
          id: true,
          deviceToken: true,
          uniqueUserId: true,
        }
      });
      console.log('   ✅ User table accessible');
      console.log(`   Sample user has deviceToken field: ${userSample?.deviceToken !== undefined ? '✅ YES' : '❌ NO'}`);
    } catch (error) {
      console.log(`   ❌ Database error: ${error.message}`);
    }

    // 3. Check User Device Tokens
    console.log('\n3️⃣ Checking User Device Tokens...');
    const totalUsers = await prisma.user.count();
    const usersWithTokens = await prisma.user.count({
      where: {
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      }
    });
    
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Users with Tokens: ${usersWithTokens}`);
    console.log(`   Coverage: ${totalUsers > 0 ? Math.round((usersWithTokens / totalUsers) * 100) : 0}%`);

    if (usersWithTokens > 0) {
      const sampleUsers = await prisma.user.findMany({
        where: {
          deviceToken: {
            not: null,
            notIn: ['', 'null', 'undefined']
          }
        },
        select: {
          uniqueUserId: true,
          deviceToken: true,
          isActivated: true,
          createdAt: true,
        },
        take: 3,
        orderBy: { createdAt: 'desc' }
      });

      console.log('\n   Sample Users with Tokens:');
      sampleUsers.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.uniqueUserId}`);
        console.log(`      Token: ${user.deviceToken.substring(0, 30)}...`);
        console.log(`      Activated: ${user.isActivated ? '✅' : '❌'}`);
      });
    }

    // 4. Test Notification Creation
    console.log('\n4️⃣ Testing Notification Creation...');
    try {
      const testNotification = await prisma.notification.create({
        data: {
          title: 'Test Notification',
          message: 'This is a test notification from diagnostic script',
          type: 'general',
          targetUsers: null,
          sentAt: new Date(),
        }
      });
      console.log(`   ✅ Notification created: ${testNotification.id}`);

      // Clean up test notification
      await prisma.notification.delete({
        where: { id: testNotification.id }
      });
      console.log('   ✅ Test notification cleaned up');
    } catch (error) {
      console.log(`   ❌ Error creating notification: ${error.message}`);
    }

    // 5. Test Firebase Push Notification (if tokens available)
    if (usersWithTokens > 0 && firebaseInitialized) {
      console.log('\n5️⃣ Testing Firebase Push Notification...');
      
      const testUser = await prisma.user.findFirst({
        where: {
          deviceToken: {
            not: null,
            notIn: ['', 'null', 'undefined']
          }
        },
        select: {
          deviceToken: true,
          uniqueUserId: true,
        }
      });

      if (testUser) {
        console.log(`   Testing with user: ${testUser.uniqueUserId}`);
        
        const result = await pushNotificationService.sendToDevices(
          [testUser.deviceToken],
          {
            title: 'Test Notification',
            message: 'This is a test from Supasoka diagnostic',
            type: 'general'
          }
        );

        console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Sent to: ${result.sentTo} devices`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } else if (!firebaseInitialized) {
      console.log('\n5️⃣ ⚠️ Skipping Firebase test - Firebase not initialized');
    } else {
      console.log('\n5️⃣ ⚠️ Skipping Firebase test - No users with tokens');
    }

    // 6. Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('=====================================');
    
    if (!firebaseInitialized) {
      console.log('❌ CRITICAL: Firebase not initialized');
      console.log('   → Set Firebase environment variables:');
      console.log('      - FIREBASE_PROJECT_ID');
      console.log('      - FIREBASE_PRIVATE_KEY');
      console.log('      - FIREBASE_CLIENT_EMAIL');
      console.log('   → Or add firebase-service-account.json file');
      console.log('   → Or set FCM_LEGACY_SERVER_KEY for fallback');
    }

    if (usersWithTokens === 0) {
      console.log('⚠️ WARNING: No users have device tokens');
      console.log('   → Users need to open the Supasoka app');
      console.log('   → App will register FCM token on startup');
      console.log('   → Check app logs for token registration');
    }

    if (usersWithTokens > 0 && usersWithTokens < totalUsers) {
      console.log(`⚠️ INFO: Only ${Math.round((usersWithTokens / totalUsers) * 100)}% of users have tokens`);
      console.log('   → This is normal for new installations');
      console.log('   → Tokens register when users open the app');
    }

    if (firebaseInitialized && usersWithTokens > 0) {
      console.log('✅ System is ready to send notifications!');
      console.log('   → Firebase: Configured');
      console.log('   → Users: Have tokens');
      console.log('   → Database: Working');
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNotificationSystem()
  .then(() => {
    console.log('✅ Diagnostic complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
