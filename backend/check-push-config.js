const pushService = require('./services/pushNotificationService');

(async () => {
  console.log('🔍 Push config check');
  console.log('FCM env vars present:');
  console.log('  FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
  console.log('  FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
  console.log('  FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('Legacy FCM key present (FCM_LEGACY_SERVER_KEY):', !!process.env.FCM_LEGACY_SERVER_KEY);
  console.log('Pushy config (PUSHY_SECRET_API_KEY):', !!process.env.PUSHY_SECRET_API_KEY);

  try {
    console.log('PushNotificationService.isInitialized():', pushService.isInitialized());
  } catch (err) {
    console.error('Error checking push service initialization:', err.message || err);
  }

  console.log('\n🎯 Next steps: set FIREBASE env or FCM_LEGACY_SERVER_KEY and ensure device tokens exist.');
})();