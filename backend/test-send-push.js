const pushService = require('./services/pushNotificationService');

(async () => {
  const token = process.env.TEST_DEVICE_TOKEN;
  if (!token) {
    console.error('Please set TEST_DEVICE_TOKEN environment variable with a valid FCM token');
    process.exit(1);
  }

  const notification = {
    title: 'Test Notification',
    message: 'This is a test notification sent from backend test script',
    type: 'test'
  };

  try {
    const result = await pushService.sendToDevices([token], notification);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error sending test push:', err);
    process.exit(1);
  }
})();