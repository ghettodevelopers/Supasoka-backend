const Pushy = require('pushy');
const logger = require('../utils/logger');

// Initialize Pushy with API key from environment
const pushyAPI = new Pushy(process.env.PUSHY_SECRET_API_KEY);

class PushNotificationService {
  /**
   * Send push notification to specific device tokens
   * @param {Array<string>} deviceTokens - Array of device tokens
   * @param {Object} notification - Notification data {title, message, type}
   */
  async sendToDevices(deviceTokens, notification) {
    if (!deviceTokens || deviceTokens.length === 0) {
      logger.warn('No device tokens provided for push notification');
      return { success: false, message: 'No device tokens' };
    }

    try {
      const { title, message, type = 'general' } = notification;

      // Prepare notification data for Pushy
      const data = {
        title: title,
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        from: 'admin'
      };

      // Pushy notification options
      const options = {
        notification: {
          badge: 1,
          sound: 'default',
          body: message,
          title: title
        }
      };

      // Send to all device tokens
      const results = await pushyAPI.sendPushNotification(
        data,
        deviceTokens,
        options
      );

      logger.info(`✅ Push notification sent to ${deviceTokens.length} devices`);
      logger.info(`   Title: ${title}`);
      logger.info(`   Message: ${message}`);
      logger.info(`   Results: ${JSON.stringify(results)}`);

      return {
        success: true,
        sentTo: deviceTokens.length,
        results: results
      };
    } catch (error) {
      logger.error('❌ Error sending push notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send push notification to all users with device tokens
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToAllUsers(notification, prisma) {
    try {
      // Get all users with device tokens
      const users = await prisma.user.findMany({
        where: {
          deviceToken: { not: null },
          isBlocked: false
        },
        select: {
          id: true,
          deviceToken: true,
          uniqueUserId: true
        }
      });

      if (users.length === 0) {
        logger.warn('No users with device tokens found');
        return { success: false, message: 'No users with device tokens' };
      }

      const deviceTokens = users.map(u => u.deviceToken);
      
      logger.info(`📱 Sending push notification to ${users.length} users`);
      
      const result = await this.sendToDevices(deviceTokens, notification);
      
      return {
        ...result,
        totalUsers: users.length
      };
    } catch (error) {
      logger.error('Error sending push notification to all users:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToUser(userId, notification, prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          deviceToken: true,
          uniqueUserId: true,
          isBlocked: true
        }
      });

      if (!user) {
        logger.warn(`User ${userId} not found`);
        return { success: false, message: 'User not found' };
      }

      if (user.isBlocked) {
        logger.warn(`User ${user.uniqueUserId} is blocked`);
        return { success: false, message: 'User is blocked' };
      }

      if (!user.deviceToken) {
        logger.warn(`User ${user.uniqueUserId} has no device token`);
        return { success: false, message: 'User has no device token' };
      }

      logger.info(`📱 Sending push notification to user ${user.uniqueUserId}`);
      
      const result = await this.sendToDevices([user.deviceToken], notification);
      
      return result;
    } catch (error) {
      logger.error(`Error sending push notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send push notification to subscribed users only
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToSubscribedUsers(notification, prisma) {
    try {
      const users = await prisma.user.findMany({
        where: {
          deviceToken: { not: null },
          isBlocked: false,
          isSubscribed: true
        },
        select: {
          id: true,
          deviceToken: true,
          uniqueUserId: true
        }
      });

      if (users.length === 0) {
        logger.warn('No subscribed users with device tokens found');
        return { success: false, message: 'No subscribed users with device tokens' };
      }

      const deviceTokens = users.map(u => u.deviceToken);
      
      logger.info(`📱 Sending push notification to ${users.length} subscribed users`);
      
      const result = await this.sendToDevices(deviceTokens, notification);
      
      return {
        ...result,
        totalUsers: users.length
      };
    } catch (error) {
      logger.error('Error sending push notification to subscribed users:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService();
