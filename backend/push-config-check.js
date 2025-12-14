const pushService = require('./services/pushNotificationService');

(async () => {
  console.log('\n🔍 Push configuration check');

  console.log('Environment variables:');
  console.log('  FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
  console.log('  FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
  console.log('  FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('  FCM_LEGACY_SERVER_KEY:', !!process.env.FCM_LEGACY_SERVER_KEY);
  console.log('  TEST_DEVICE_TOKEN:', !!process.env.TEST_DEVICE_TOKEN);

  try {
    const initialized = pushService.isInitialized();
    console.log('\nPush service initialized:', initialized);
  } catch (err) {
    console.error('\nError checking push service initialization:', err);
  }

  // If TEST_DEVICE_TOKEN is set, attempt a test send (user opted-in)
  const testToken = process.env.TEST_DEVICE_TOKEN;
  if (testToken) {
    console.log('\n⚠️ TEST_DEVICE_TOKEN found - attempting test send (will actually send a push)');
    const notification = {
      title: 'Diagnostic Test',
      message: 'This is a diagnostic test from backend/push-config-check.js',
      type: 'diagnostic'
    };

    try {
      const result = await pushService.sendToDevices([testToken], notification);
      console.log('Test send result:', result);
    } catch (err) {
      console.error('Test send error:', err);
    }
  } else {
    console.log('\nNo TEST_DEVICE_TOKEN set — skipping test send. To run test send, `set TEST_DEVICE_TOKEN=<token>` and re-run this script.');
  }

  console.log('\n✅ Push configuration check complete');
})();