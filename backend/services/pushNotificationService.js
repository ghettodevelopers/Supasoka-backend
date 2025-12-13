const logger = require('../utils/logger');

/**
 * Pure Node.js Push Notification Service
 * 
 * This service NO LONGER uses external push services like Pushy.
 * Instead, notifications are:
 * 1. Stored in PostgreSQL database (UserNotification table)
 * 2. Delivered via Socket.IO to online users (real-time)
 * 3. Fetched by offline users when they come online (polling)
 * 
 * This approach is more reliable and doesn't require external services.
 */
class PushNotificationService {
  /**
   * "Send" push notification to specific device tokens
   * Now just logs the notification - actual delivery is via Socket.IO + DB polling
   * @param {Array<string>} deviceTokens - Array of device tokens (kept for compatibility)
   * @param {Object} notification - Notification data {title, message, type}
   */
  async sendToDevices(deviceTokens, notification) {
    const { title, message, type = 'general' } = notification;

    logger.info(`📱 Push notification service called (DB storage mode)`);
    logger.info(`   Title: "${title}"`);
    logger.info(`   Message: "${message}"`);
    logger.info(`   Type: ${type}`);
    logger.info(`   Target devices: ${deviceTokens?.length || 0}`);
    logger.info(`   📦 Notifications stored in database for offline users`);
    logger.info(`   🔌 Online users receive via Socket.IO`);
    logger.info(`   📬 Offline users fetch via polling when they come online`);

    // Return success - actual delivery is handled by:
    // 1. Socket.IO for online users (in admin.js route)
    // 2. Database storage + polling for offline users
    return {
      success: true,
      sentTo: deviceTokens?.length || 0,
      sentCount: deviceTokens?.length || 0,
      message: 'Notifications stored in database (Socket.IO + polling delivery)',
      deliveryMethod: 'database_socketio_polling'
    };
  }

  /**
   * Send push notification to all users
   * Now uses database storage + Socket.IO + polling instead of external push
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToAllUsers(notification, prisma) {
    try {
      // Get all active users (not blocked)
      const users = await prisma.user.findMany({
        where: {
          isBlocked: false
        },
        select: {
          id: true,
          uniqueUserId: true
        }
      });

      if (users.length === 0) {
        logger.warn('⚠️ No active users found');
        return { 
          success: false, 
          message: 'No active users',
          sentCount: 0,
          totalUsers: 0
        };
      }

      logger.info(`📱 Notification will be delivered to ${users.length} users`);
      logger.info(`   Title: "${notification.title}"`);
      logger.info(`   Message: "${notification.message}"`);
      logger.info(`   📦 Stored in database for all users`);
      logger.info(`   🔌 Online users receive via Socket.IO`);
      logger.info(`   📬 Offline users fetch via polling`);
      
      return {
        success: true,
        sentCount: users.length,
        sentTo: users.length,
        totalUsers: users.length,
        message: 'Notifications stored in database (Socket.IO + polling delivery)',
        deliveryMethod: 'database_socketio_polling'
      };
    } catch (error) {
      logger.error('❌ Error in sendToAllUsers:', error);
      return {
        success: false,
        error: error.message,
        sentCount: 0,
        totalUsers: 0
      };
    }
  }

  /**
   * Send notification to specific user
   * Uses database storage + Socket.IO + polling
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

      logger.info(`📱 Notification will be delivered to user ${user.uniqueUserId}`);
      logger.info(`   📦 Stored in database`);
      logger.info(`   🔌 Delivered via Socket.IO if online`);
      logger.info(`   📬 Fetched via polling if offline`);
      
      return {
        success: true,
        sentTo: 1,
        sentCount: 1,
        message: 'Notification stored in database (Socket.IO + polling delivery)',
        deliveryMethod: 'database_socketio_polling'
      };
    } catch (error) {
      logger.error(`Error in sendToUser ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to subscribed users only
   * Uses database storage + Socket.IO + polling
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToSubscribedUsers(notification, prisma) {
    try {
      const users = await prisma.user.findMany({
        where: {
          isBlocked: false,
          isSubscribed: true
        },
        select: {
          id: true,
          uniqueUserId: true
        }
      });

      if (users.length === 0) {
        logger.warn('No subscribed users found');
        return { success: false, message: 'No subscribed users' };
      }
      
      logger.info(`📱 Notification will be delivered to ${users.length} subscribed users`);
      logger.info(`   📦 Stored in database for all users`);
      logger.info(`   🔌 Online users receive via Socket.IO`);
      logger.info(`   📬 Offline users fetch via polling`);
      
      return {
        success: true,
        sentCount: users.length,
        sentTo: users.length,
        totalUsers: users.length,
        message: 'Notifications stored in database (Socket.IO + polling delivery)',
        deliveryMethod: 'database_socketio_polling'
      };
    } catch (error) {
      logger.error('Error in sendToSubscribedUsers:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PushNotificationService();
