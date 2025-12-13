#!/usr/bin/env node

/**
 * Check Device Tokens in PostgreSQL Database
 * This script helps diagnose why push notifications show "0 push sent"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeviceTokens() {
  console.log('🔍 Checking device tokens in PostgreSQL database...\n');

  try {
    // 1. Check total users
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total users in database: ${totalUsers}`);

    // 2. Check users with device tokens
    const usersWithTokens = await prisma.user.count({
      where: {
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      }
    });
    console.log(`📱 Users with device tokens: ${usersWithTokens}`);

    // 3. Check activated users
    const activatedUsers = await prisma.user.count({
      where: {
        isActivated: true
      }
    });
    console.log(`✅ Activated users: ${activatedUsers}`);

    // 4. Check users with tokens AND activated
    const activeUsersWithTokens = await prisma.user.count({
      where: {
        isActivated: true,
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      }
    });
    console.log(`🎯 Activated users with tokens: ${activeUsersWithTokens}`);

    // 5. Show sample users
    console.log('\n📋 Sample users (first 5):');
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        uniqueUserId: true,
        deviceId: true,
        deviceToken: true,
        isActivated: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    sampleUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.uniqueUserId || user.id}`);
      console.log(`   Device ID: ${user.deviceId || 'Not set'}`);
      console.log(`   Device Token: ${user.deviceToken ? user.deviceToken.substring(0, 30) + '...' : '❌ NOT SET'}`);
      console.log(`   Activated: ${user.isActivated ? '✅' : '❌'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
    });

    // 6. Diagnosis
    console.log('\n\n🔍 DIAGNOSIS:');
    console.log('═══════════════════════════════════════════════════════');
    
    if (totalUsers === 0) {
      console.log('❌ PROBLEM: No users in database');
      console.log('   SOLUTION: Users need to open the Supasoka app at least once');
    } else if (usersWithTokens === 0) {
      console.log('❌ PROBLEM: Users exist but NO device tokens registered');
      console.log('   SOLUTION: Users need to open the Supasoka app to register tokens');
      console.log('   ACTION: Open app on at least one device and wait 5 seconds');
    } else if (activeUsersWithTokens === 0) {
      console.log('⚠️  PROBLEM: Users have tokens but are not activated');
      console.log('   SOLUTION: Users need to complete activation process');
    } else {
      console.log('✅ GOOD: Users have device tokens registered');
      console.log(`   ${activeUsersWithTokens} users ready to receive push notifications`);
      console.log('\n   If notifications still show "0 push sent", check:');
      console.log('   1. PUSHY_SECRET_API_KEY is set in Render.com environment');
      console.log('   2. Backend service redeployed after adding API key');
      console.log('   3. Backend logs show "Push notifications configured" (not "mock mode")');
    }

    console.log('═══════════════════════════════════════════════════════\n');

    // 7. Check environment variable (if available)
    if (process.env.PUSHY_SECRET_API_KEY) {
      console.log('✅ PUSHY_SECRET_API_KEY is set');
      console.log(`   Key: ${process.env.PUSHY_SECRET_API_KEY.substring(0, 20)}...`);
    } else {
      console.log('❌ PUSHY_SECRET_API_KEY is NOT set');
      console.log('   Add this to Render.com environment variables');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
    console.error('   Make sure DATABASE_URL is set correctly');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDeviceTokens();
