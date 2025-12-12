import Pushy from 'pushy-react-native';
import apiService from './api';

class PushyService {
  constructor() {
    this.deviceToken = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔔 Initializing Pushy for push notifications...');

      // Register device for push notifications
      const deviceToken = await Pushy.register();
      this.deviceToken = deviceToken;
      this.initialized = true;

      console.log('✅ Pushy device token obtained:', deviceToken);

      // Send token to backend
      await this.sendTokenToBackend(deviceToken);

      // Listen for push notifications
      this.setupPushNotificationListener();

      return deviceToken;
    } catch (error) {
      console.error('❌ Pushy initialization error:', error);
      throw error;
    }
  }

  async sendTokenToBackend(token) {
    try {
      console.log('📤 Sending device token to backend...');

      const response = await apiService.request('/users/device-token', {
        method: 'POST',
        body: JSON.stringify({ deviceToken: token }),
      });

      console.log('✅ Device token registered with backend:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send device token to backend:', error);
      // Don't throw - app should continue even if token registration fails
    }
  }

  setupPushNotificationListener() {
    // Listen for push notifications received
    Pushy.setNotificationListener((data) => {
      console.log('📱 Push notification received:', data);

      // Extract notification data
      const { title, message, type, ...extraData } = data;

      // Trigger local notification for status bar display
      if (global.showNotification) {
        global.showNotification({
          title: title || 'Supasoka',
          message: message || '',
          type: type || 'general',
          data: extraData,
        });
      }
    });

    console.log('✅ Push notification listener configured');
  }

  getDeviceToken() {
    return this.deviceToken;
  }

  isInitialized() {
    return this.initialized;
  }
}

export default new PushyService();
