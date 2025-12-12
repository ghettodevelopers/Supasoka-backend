const Pushy = require('pushy');
const logger = require('../utils/logger');

class PushyService {
  constructor() {
    this.apiKey = process.env.PUSHY_API_KEY;
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      this.pushy = new Pushy(this.apiKey);
      logger.info('✅ Pushy notification service initialized');
    } else {
      logger.warn('⚠️ Pushy API key not configured - push notifications disabled');
    }
  }

  async sendToDevice(deviceToken, notification, data = {}) {
    if (!this.isEnabled) {
      logger.warn('Push notifications disabled - no API key configured');
      return { success: false, error: 'Push notifications not configured' };
    }

    if (!deviceToken) {
      return { success: false, error: 'No device token provided' };
    }

    try {
      const payload = {
        notification: {
          title: notification.title,
          body: notification.message,
          badge: 1,
          sound: 'default'
        },
        data: {
          type: notification.type || 'general',
          ...data
        }
      };

      await this.pushy.sendPushNotification(payload, deviceToken, {});
      
      logger.info(`Push notification sent to device: ${deviceToken.substring(0, 10)}...`);
      
      return { 
        success: true, 
        deviceToken,
        notification
      };
    } catch (error) {
      logger.error(`Failed to send push notification to ${deviceToken}:`, error);
      return { success: false, error: error.message, deviceToken };
    }
  }

  async sendToMultipleDevices(deviceTokens, notification, data = {}) {
    if (!this.isEnabled) {
      logger.warn('Push notifications disabled - no API key configured');
      return { success: false, error: 'Push notifications not configured' };
    }

    if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
      return { success: false, error: 'No device tokens provided' };
    }

    const validTokens = deviceTokens.filter(token => token && typeof token === 'string');
    
    if (validTokens.length === 0) {
      return { success: false, error: 'No valid device tokens provided' };
    }

    try {
      const payload = {
        notification: {
          title: notification.title,
          body: notification.message,
          badge: 1,
          sound: 'default'
        },
        data: {
          type: notification.type || 'general',
          ...data
        }
      };

      await this.pushy.sendPushNotification(payload, validTokens, {});
      
      logger.info(`Push notifications sent to ${validTokens.length} devices`);
      
      return { 
        success: true, 
        sentCount: validTokens.length,
        totalDevices: deviceTokens.length
      };
    } catch (error) {
      logger.error('Failed to send push notifications to multiple devices:', error);
      return { success: false, error: error.message };
    }
  }

  async sendToDeviceWithRetry(deviceToken, notification, data = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const result = await this.sendToDevice(deviceToken, notification, data);
      
      if (result.success) {
        return result;
      }
      
      if (attempt < retries) {
        logger.warn(`Retry ${attempt}/${retries} for device ${deviceToken.substring(0, 10)}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return { 
      success: false, 
      error: `Failed after ${retries} attempts`,
      deviceToken 
    };
  }

  async validateDeviceToken(deviceToken) {
    if (!deviceToken || typeof deviceToken !== 'string') {
      return { success: false, error: 'Invalid device token format' };
    }

    if (deviceToken.length < 10) {
      return { success: false, error: 'Device token too short' };
    }

    return { success: true, deviceToken };
  }
}

module.exports = new PushyService();
