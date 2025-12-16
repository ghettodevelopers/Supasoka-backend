/**
 * Notification System Verification Script
 *
 * This script verifies that all components of the notification system are properly configured:
 * 1. Firebase Admin SDK initialization
 * 2. Database connection and user data
 * 3. Device token availability
 * 4. FCM message sending capability
 *
 * Run this script to diagnose notification issues:
 * node verify-notification-system.js
 */

const { PrismaClient } = require('@prisma/client');
const pushNotificationService = require('./services/pushNotificationService');
const logger = require('./utils/logger');
require('dotenv').config();

const prisma = new PrismaClient();

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  header: (text) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  title: (text) => console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.cyan}ℹ️  ${text}${colors.reset}`),
  data: (label, value) => console.log(`   ${colors.magenta}${label}:${colors.reset} ${value}`),
};

async function verifyFirebaseConfiguration() {
  log.header();
  log.title('1️⃣  FIREBASE CONFIGURATION CHECK');
  log.header();

  try {
    // Check environment variables
    log.info('Checking environment variables...');

    const requiredVars = {
      'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
      'FIREBASE_PRIVATE_KEY': process.env.FIREBASE_PRIVATE_KEY ? '✅ Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : null,
      'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
      'FIREBASE_PRIVATE_KEY_ID': process.env.FIREBASE_PRIVATE_KEY_ID,
      'FIREBASE_CLIENT_ID': process.env.FIREBASE_CLIENT_ID,
    };

    let allVarsPresent = true;
    for (const [key, value] of Object.entries(requiredVars)) {
      if (value) {
        log.success(`${key}: ${typeof value === 'string' && value.startsWith('✅') ? value : '✅ Set'}`);
      } else {
        log.error(`${key}: Missing`);
        allVarsPresent = false;
      }
    }

    if (!allVarsPresent) {
      log.error('Some Firebase environment variables are missing!');
      log.warning('Set them in your .env file or Render.com dashboard');
      return false;
    }

    // Check Firebase initialization
    log.info('Checking Firebase Admin SDK initialization...');
    const isInitialized = pushNotificationService.isInitialized();

    if (isInitialized) {
      log.success('Firebase Admin SDK is initialized');
      log.data('Status', 'Ready to send push notifications');
    } else {
      const initError = pushNotificationService.getInitError();
      log.error('Firebase Admin SDK failed to initialize');
      log.data('Error', initError || 'Unknown error');
      return false;
    }

    return true;
  } catch (error) {
    log.error('Firebase configuration check failed');
    console.error(error);
    return false;
  }
}

async function verifyDatabaseConnection() {
  log.header();
  log.title('2️⃣  DATABASE CONNECTION CHECK');
  log.header();

  try {
    log.info('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    log.success('Database connection successful');

    // Get database stats
    const totalUsers = await prisma.user.count();
    const activatedUsers = await prisma.user.count({
      where: { isActivated: true }
    });
    const subscribedUsers = await prisma.user.count({
      where: { isSubscribed: true }
    });

    log.data('Total Users', totalUsers);
    log.data('Activated Users', activatedUsers);
    log.data('Subscribed Users', subscribedUsers);

    if (totalUsers === 0) {
      log.warning('No users in database!');
      log.info('Users need to open the app at least once to be registered');
    }

    return true;
  } catch (error) {
    log.error('Database connection failed');
    console.error(error);
    return false;
  }
}

async function verifyDeviceTokens() {
  log.header();
  log.title('3️⃣  DEVICE TOKENS CHECK');
  log.header();

  try {
    log.info('Checking device tokens in database...');

    const usersWithTokens = await prisma.user.count({
      where: {
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      }
    });

    const activeUsersWithTokens = await prisma.user.count({
      where: {
        isActivated: true,
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      }
    });

    const totalUsers = await prisma.user.count();
    const tokenCoverage = totalUsers > 0 ? ((usersWithTokens / totalUsers) * 100).toFixed(1) : 0;

    log.data('Users with device tokens', usersWithTokens);
    log.data('Active users with tokens', activeUsersWithTokens);
    log.data('Token coverage', `${tokenCoverage}%`);

    if (usersWithTokens === 0) {
      log.warning('No users have device tokens registered!');
      log.info('Users need to:');
      log.info('  1. Open the app');
      log.info('  2. Grant notification permission');
      log.info('  3. FCM token will be automatically registered');
      return false;
    }

    // Get sample tokens for testing
    const sampleUsers = await prisma.user.findMany({
      where: {
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      },
      select: {
        id: true,
        uniqueUserId: true,
        deviceToken: true,
        isActivated: true,
        createdAt: true
      },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });

    if (sampleUsers.length > 0) {
      log.success('Sample users with tokens:');
      sampleUsers.forEach((user, index) => {
        console.log(`\n   ${colors.bright}User ${index + 1}:${colors.reset}`);
        log.data('   ID', user.id);
        log.data('   Unique ID', user.uniqueUserId);
        log.data('   Token', user.deviceToken.substring(0, 50) + '...');
        log.data('   Activated', user.isActivated ? 'Yes' : 'No');
        log.data('   Created', user.createdAt.toISOString());
      });
    }

    return true;
  } catch (error) {
    log.error('Device tokens check failed');
    console.error(error);
    return false;
  }
}

async function testNotificationSending() {
  log.header();
  log.title('4️⃣  NOTIFICATION SENDING TEST');
  log.header();

  try {
    log.info('Attempting to send test notification...');

    // Get one user with a device token
    const testUser = await prisma.user.findFirst({
      where: {
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        }
      },
      select: {
        id: true,
        uniqueUserId: true,
        deviceToken: true
      }
    });

    if (!testUser) {
      log.warning('No users with device tokens available for testing');
      log.info('Cannot test notification sending without a valid device token');
      return false;
    }

    log.info(`Testing with user: ${testUser.uniqueUserId}`);
    log.data('Device Token (preview)', testUser.deviceToken.substring(0, 50) + '...');

    const testNotification = {
      title: 'System Verification Test',
      message: 'This is an automated test notification from the backend verification script. If you see this, notifications are working correctly!',
      type: 'general'
    };

    log.info('Sending test notification via FCM...');

    const result = await pushNotificationService.sendToDevices(
      [testUser.deviceToken],
      testNotification
    );

    if (result.success) {
      log.success('Test notification sent successfully!');
      log.data('Sent to', result.sentTo || result.sentCount || 1);
      log.data('Delivery method', result.deliveryMethod || 'firebase_admin');
      log.info('Check the device to verify notification appears on status bar');
      return true;
    } else {
      log.error('Test notification failed to send');
      log.data('Error', result.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    log.error('Notification sending test failed');
    console.error(error);
    return false;
  }
}

async function generateReport(results) {
  log.header();
  log.title('📊 VERIFICATION REPORT');
  log.header();

  const allPassed = Object.values(results).every(r => r === true);

  console.log(`\n${colors.bright}Component Status:${colors.reset}`);
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    const component = key.replace(/([A-Z])/g, ' $1').trim();
    console.log(`   ${component}: ${status}`);
  });

  console.log('');

  if (allPassed) {
    log.success('All checks passed! Notification system is ready.');
    log.info('You can now send notifications from AdminSupa.');
  } else {
    log.error('Some checks failed. Please fix the issues above.');
    log.warning('Notification system may not work properly until all checks pass.');
  }

  log.header();
}

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      SUPASOKA NOTIFICATION SYSTEM VERIFICATION             ║');
  console.log('║                                                            ║');
  console.log('║  This script verifies the notification system setup       ║');
  console.log('║  and tests Firebase Cloud Messaging functionality         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = {
    firebaseConfig: false,
    databaseConnection: false,
    deviceTokens: false,
    notificationSending: false
  };

  try {
    // Run verification steps
    results.firebaseConfig = await verifyFirebaseConfiguration();
    results.databaseConnection = await verifyDatabaseConnection();
    results.deviceTokens = await verifyDeviceTokens();

    // Only test sending if previous checks passed
    if (results.firebaseConfig && results.databaseConnection && results.deviceTokens) {
      results.notificationSending = await testNotificationSending();
    } else {
      log.warning('Skipping notification sending test due to previous failures');
    }

    // Generate final report
    await generateReport(results);

    // Additional troubleshooting tips
    if (!results.firebaseConfig) {
      console.log(`\n${colors.yellow}💡 Firebase Setup Tips:${colors.reset}`);
      console.log('   1. Download service account JSON from Firebase Console');
      console.log('   2. Extract credentials and add to .env file');
      console.log('   3. For Render.com, add as environment variables');
      console.log('   4. Restart the backend server after configuration');
    }

    if (!results.deviceTokens) {
      console.log(`\n${colors.yellow}💡 Device Token Tips:${colors.reset}`);
      console.log('   1. User must open the app at least once');
      console.log('   2. Grant notification permission when prompted');
      console.log('   3. App automatically registers FCM token with backend');
      console.log('   4. Check app logs for "FCM token registered" message');
    }

    if (!results.notificationSending && results.deviceTokens) {
      console.log(`\n${colors.yellow}💡 Notification Sending Tips:${colors.reset}`);
      console.log('   1. Verify Firebase credentials are correct');
      console.log('   2. Check backend logs for FCM errors');
      console.log('   3. Ensure device token is valid (not expired)');
      console.log('   4. Test with a recently active device');
    }

  } catch (error) {
    log.error('Verification script encountered an error:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  process.exit(results.firebaseConfig && results.databaseConnection ? 0 : 1);
}

// Run the verification
main();
