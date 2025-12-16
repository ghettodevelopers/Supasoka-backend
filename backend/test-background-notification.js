/**
 * Background Notification Test Script
 *
 * This script tests that notifications work correctly when the user app is:
 * 1. In foreground (app open)
 * 2. In background (app minimized)
 * 3. Killed (app completely closed)
 *
 * Usage: node test-background-notification.js
 */

const { PrismaClient } = require('@prisma/client');
const pushNotificationService = require('./services/pushNotificationService');
const logger = require('./utils/logger');
require('dotenv').config();

const prisma = new PrismaClient();

// ANSI colors
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
  header: () => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`),
  title: (text) => console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.cyan}ℹ️  ${text}${colors.reset}`),
  step: (num, text) => console.log(`\n${colors.bright}${colors.magenta}Step ${num}:${colors.reset} ${text}`),
  instruction: (text) => console.log(`   ${colors.yellow}→${colors.reset} ${text}`),
};

async function testBackgroundNotifications() {
  log.header();
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        BACKGROUND NOTIFICATION TEST - COMPREHENSIVE              ║');
  console.log('║                                                                  ║');
  console.log('║  This test ensures notifications work in ALL app states:        ║');
  console.log('║  ✅ Foreground (app open)                                       ║');
  console.log('║  ✅ Background (app minimized)                                  ║');
  console.log('║  ✅ Killed (app completely closed)                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    // Step 1: Verify Firebase Configuration
    log.step(1, 'Verifying Firebase Configuration');
    log.header();

    const firebaseInitialized = pushNotificationService.isInitialized();
    if (!firebaseInitialized) {
      log.error('Firebase Admin SDK is not initialized!');
      const error = pushNotificationService.getInitError();
      log.error(`Error: ${error}`);
      log.warning('Fix Firebase configuration before testing notifications');
      process.exit(1);
    }

    log.success('Firebase Admin SDK is initialized and ready');

    // Step 2: Check for users with device tokens
    log.step(2, 'Checking for users with device tokens');
    log.header();

    const usersWithTokens = await prisma.user.findMany({
      where: {
        deviceToken: {
          not: null,
          notIn: ['', 'null', 'undefined']
        },
        isBlocked: false
      },
      select: {
        id: true,
        uniqueUserId: true,
        deviceToken: true,
        isActivated: true,
        lastActive: true
      },
      take: 5,
      orderBy: { lastActive: 'desc' }
    });

    if (usersWithTokens.length === 0) {
      log.error('No users with device tokens found!');
      log.warning('Users need to:');
      log.instruction('1. Open the Supasoka app');
      log.instruction('2. Grant notification permission');
      log.instruction('3. FCM token will be automatically registered');
      process.exit(1);
    }

    log.success(`Found ${usersWithTokens.length} users with device tokens`);
    console.log('');

    // Display users
    usersWithTokens.forEach((user, index) => {
      console.log(`   ${colors.bright}User ${index + 1}:${colors.reset}`);
      console.log(`   ID: ${user.uniqueUserId}`);
      console.log(`   Token: ${user.deviceToken.substring(0, 40)}...`);
      console.log(`   Activated: ${user.isActivated ? '✅' : '❌'}`);
      console.log(`   Last Active: ${user.lastActive ? user.lastActive.toISOString() : 'Never'}`);
      console.log('');
    });

    // Step 3: Interactive Test Selection
    log.step(3, 'Select Test Scenario');
    log.header();

    console.log(`
${colors.bright}Test Scenarios:${colors.reset}

${colors.green}Scenario 1: Foreground Test${colors.reset}
   → User has app OPEN
   → Should see heads-up notification popup
   → Should hear sound and feel vibration
   → Status bar icon should appear

${colors.yellow}Scenario 2: Background Test${colors.reset}
   → User has app MINIMIZED (home button pressed)
   → Should see heads-up notification popup
   → Should hear sound and feel vibration
   → Tapping notification should open app

${colors.magenta}Scenario 3: Killed State Test${colors.reset}
   → User has app COMPLETELY CLOSED (swiped away)
   → Should see notification in status bar
   → Should hear sound and feel vibration
   → Tapping notification should launch app

${colors.cyan}Scenario 4: All States Test (Recommended)${colors.reset}
   → Tests all three states sequentially
   → Complete comprehensive test
    `);

    // For automated testing, we'll run all tests
    log.info('Running COMPREHENSIVE TEST (All Scenarios)');
    log.info('This will send 3 test notifications with instructions');

    // Step 4: Test Foreground
    log.step(4, 'Testing FOREGROUND Notification');
    log.header();

    log.instruction('PREPARE: Make sure Supasoka app is OPEN on your device');
    log.instruction('The notification should popup at the top of the screen');
    await countdown(5);

    const foregroundResult = await sendTestNotification(
      usersWithTokens[0].deviceToken,
      'Foreground Test',
      'This notification should appear as a popup at the top of your screen with sound and vibration. The app is currently OPEN.',
      'general'
    );

    if (foregroundResult.success) {
      log.success('Foreground notification sent successfully!');
      log.info('Check device - you should see:');
      log.instruction('✅ Popup notification at top of screen');
      log.instruction('✅ Sound playing');
      log.instruction('✅ Device vibrating');
      log.instruction('✅ Status bar icon');
    } else {
      log.error('Failed to send foreground notification');
      log.error(`Error: ${foregroundResult.error}`);
    }

    await waitForUserConfirmation();

    // Step 5: Test Background
    log.step(5, 'Testing BACKGROUND Notification (App Minimized)');
    log.header();

    log.instruction('PREPARE: Press HOME button to minimize the app');
    log.instruction('Leave the app running in background (don\'t swipe it away)');
    log.instruction('The notification should appear in status bar');
    await countdown(10);

    const backgroundResult = await sendTestNotification(
      usersWithTokens[0].deviceToken,
      'Background Test',
      'This notification should appear in your status bar with sound and vibration. The app is MINIMIZED in background.',
      'general'
    );

    if (backgroundResult.success) {
      log.success('Background notification sent successfully!');
      log.info('Check device - you should see:');
      log.instruction('✅ Notification appears in status bar');
      log.instruction('✅ Heads-up popup (may vary by device)');
      log.instruction('✅ Sound playing');
      log.instruction('✅ Device vibrating');
      log.instruction('✅ Tap notification → app opens');
    } else {
      log.error('Failed to send background notification');
      log.error(`Error: ${backgroundResult.error}`);
    }

    await waitForUserConfirmation();

    // Step 6: Test Killed State
    log.step(6, 'Testing KILLED STATE Notification (App Closed)');
    log.header();

    log.instruction('PREPARE: Swipe away the app completely (Recent apps → Swipe)');
    log.instruction('Make sure the app is NOT running at all');
    log.instruction('The notification should still appear in status bar');
    await countdown(10);

    const killedResult = await sendTestNotification(
      usersWithTokens[0].deviceToken,
      'Killed State Test',
      'This notification should appear in your status bar even though the app is COMPLETELY CLOSED. Sound and vibration should work.',
      'general'
    );

    if (killedResult.success) {
      log.success('Killed state notification sent successfully!');
      log.info('Check device - you should see:');
      log.instruction('✅ Notification appears in status bar');
      log.instruction('✅ Sound playing');
      log.instruction('✅ Device vibrating');
      log.instruction('✅ Shows on lock screen');
      log.instruction('✅ Tap notification → app launches');
    } else {
      log.error('Failed to send killed state notification');
      log.error(`Error: ${killedResult.error}`);
    }

    // Step 7: Final Report
    log.header();
    log.title('TEST RESULTS SUMMARY');
    log.header();

    console.log('');
    console.log(`${colors.bright}Notification Delivery Results:${colors.reset}`);
    console.log(`   Foreground Test:   ${foregroundResult.success ? colors.green + '✅ SENT' : colors.red + '❌ FAILED'}${colors.reset}`);
    console.log(`   Background Test:   ${backgroundResult.success ? colors.green + '✅ SENT' : colors.red + '❌ FAILED'}${colors.reset}`);
    console.log(`   Killed State Test: ${killedResult.success ? colors.green + '✅ SENT' : colors.red + '❌ FAILED'}${colors.reset}`);
    console.log('');

    const allPassed = foregroundResult.success && backgroundResult.success && killedResult.success;

    if (allPassed) {
      log.success('All notifications sent successfully!');
      log.info('Now verify on the device that all 3 notifications appeared correctly');
    } else {
      log.error('Some notifications failed to send');
      log.warning('Check Firebase configuration and device token');
    }

    log.header();
    log.title('VERIFICATION CHECKLIST');
    log.header();

    console.log(`
${colors.bright}Please verify on your device:${colors.reset}

${colors.green}Foreground Notification (App Open):${colors.reset}
   [ ] Popup appeared at top of screen
   [ ] Sound played
   [ ] Device vibrated
   [ ] Status bar icon visible
   [ ] Notification in drawer

${colors.yellow}Background Notification (App Minimized):${colors.reset}
   [ ] Notification appeared in status bar
   [ ] Heads-up popup (device dependent)
   [ ] Sound played
   [ ] Device vibrated
   [ ] Tapping opened the app

${colors.magenta}Killed State Notification (App Closed):${colors.reset}
   [ ] Notification appeared in status bar
   [ ] Sound played
   [ ] Device vibrated
   [ ] Visible on lock screen
   [ ] Tapping launched the app

${colors.cyan}If ALL checkboxes are checked: ✅ SUCCESS!${colors.reset}
${colors.yellow}If ANY checkbox is unchecked: ⚠️  See troubleshooting below${colors.reset}
    `);

    log.header();
    log.title('TROUBLESHOOTING');
    log.header();

    console.log(`
${colors.bright}If notifications didn't appear:${colors.reset}

${colors.yellow}1. Check Notification Permission:${colors.reset}
   Settings → Apps → Supasoka → Notifications → Should be ON

${colors.yellow}2. Check Notification Channel:${colors.reset}
   Settings → Apps → Supasoka → Notifications → supasoka_notifications
   Importance should be: "High" or "Urgent"

${colors.yellow}3. Check Do Not Disturb:${colors.reset}
   Make sure DND is OFF or Supasoka is in priority apps

${colors.yellow}4. Check Device Logs:${colors.reset}
   adb logcat | grep SupasokaFCM
   Should see: "✅ Notification posted successfully"

${colors.yellow}5. Reinstall App (Recreates notification channel):${colors.reset}
   adb uninstall com.supasoka
   adb install app-debug.apk
    `);

  } catch (error) {
    log.error('Test failed with error:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function sendTestNotification(deviceToken, title, message, type) {
  try {
    logger.info(`📱 Sending test notification: "${title}"`);

    const result = await pushNotificationService.sendToDevices(
      [deviceToken],
      {
        title: title,
        message: message,
        type: type
      }
    );

    return result;
  } catch (error) {
    logger.error('Failed to send test notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function countdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${colors.yellow}⏱️  Starting in ${i} seconds...${colors.reset}`);
    await sleep(1000);
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear line
}

async function waitForUserConfirmation() {
  console.log('');
  log.info('Waiting 5 seconds for you to check the device...');
  await sleep(5000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
main();

async function main() {
  try {
    await testBackgroundNotifications();

    log.header();
    console.log(`${colors.bright}${colors.green}`);
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST COMPLETE                                 ║');
    console.log('║                                                                  ║');
    console.log('║  Check your device to verify all notifications appeared         ║');
    console.log('║  correctly in all three app states.                             ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}
