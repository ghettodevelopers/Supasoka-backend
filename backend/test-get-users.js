const helper = require('./services/notificationHelper');

(async () => {
  try {
    const res = await helper.getTargetUsers();
    console.log('getTargetUsers result:', res.success, 'count:', res.users.length);
  } catch (err) {
    console.error('Error:', err);
  }
})();