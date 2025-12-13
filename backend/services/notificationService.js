const { PrismaClient } = require('@prisma/client');
const pushyService = require('./pushyService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    this.isEnabled = true;
    this.offlineQueue = new Map();
    logger.info('✅ Enhanced notification service initialized');
  }

  async sendToDevice(deviceToken, notification, data = {}) {
    try {
      if (!deviceToken) {
        logger.warn('No device token provided for notification');
        return { 
          success: false, 
          error: 'No device token provided'
        };
      }

      const result = await pushyService.sendToDevice(deviceToken, notification, data);
      
      if (result.success) {
        logger.info(`Notification sent to device: ${notification.title}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to send notification to device:', error);
      return { success: false, error: error.message };
    }
  }

  async sendToMultipleDevices(deviceTokens, notification, data = {}) {
    if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
      return { success: false, error: 'No device tokens provided' };
    }

    try {
      const result = await pushyService.sendToMultipleDevices(deviceTokens, notification, data);
      
      logger.info(`Notifications sent to ${result.sentCount || 0} devices`);
      
      return result;
    } catch (error) {
      logger.error('Failed to send notifications to multiple devices:', error);
      return { success: false, error: error.message };
    }
  }

  async sendChannelUpdate(io, channelData, updateType = 'updated') {
    const notification = {
      title: 'Channel Update',
      message: this.getChannelUpdateMessage(channelData, updateType),
      type: 'channel_update'
    };

    const data = {
      channelId: channelData.id,
      channelName: channelData.name,
      updateType,
      timestamp: new Date().toISOString()
    };

    try {
      if (io) {
        io.emit('channel-update', {
          ...notification,
          ...data
        });
      }

      logger.info(`Channel update notification sent: ${updateType} - ${channelData.name}`);
      
      return { 
        success: true, 
        notification,
        data
      };
    } catch (error) {
      logger.error('Failed to send channel update notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendNewChannelNotification(io, channelData) {
    return this.sendChannelUpdate(io, channelData, 'added');
  }

  async sendChannelDeletedNotification(io, channelData) {
    return this.sendChannelUpdate(io, channelData, 'deleted');
  }

  async sendChannelStatusNotification(io, channelData, isActive) {
    const updateType = isActive ? 'activated' : 'deactivated';
    return this.sendChannelUpdate(io, channelData, updateType);
  }

  getChannelUpdateMessage(channelData, updateType) {
    switch (updateType) {
      case 'added':
        return `New channel "${channelData.name}" is now available!`;
      case 'deleted':
        return `Channel "${channelData.name}" has been removed.`;
      case 'activated':
        return `Channel "${channelData.name}" is now live!`;
      case 'deactivated':
        return `Channel "${channelData.name}" is temporarily unavailable.`;
      case 'updated':
      default:
        return `Channel "${channelData.name}" has been updated.`;
    }
  }

  async subscribeToTopic(deviceId, topic) {
    try {
      logger.info(`Device ${deviceId} subscribed to topic: ${topic}`);
      return { success: true, deviceId, topic };
    } catch (error) {
      logger.error('Failed to subscribe to topic:', error);
      return { success: false, error: error.message };
    }
  }

  async unsubscribeFromTopic(deviceId, topic) {
    try {
      logger.info(`Device ${deviceId} unsubscribed from topic: ${topic}`);
      return { success: true, deviceId, topic };
    } catch (error) {
      logger.error('Failed to unsubscribe from topic:', error);
      return { success: false, error: error.message };
    }
  }

  async validateDevice(deviceId) {
    try {
      if (!deviceId || typeof deviceId !== 'string') {
        return { success: false, error: 'Invalid device ID' };
      }

      logger.info(`Device validated: ${deviceId}`);
      return { success: true, deviceId, status: 'valid' };
    } catch (error) {
      logger.error('Device validation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendRealTimeNotification(io, users, title, message, data = {}) {
    try {
      const notification = {
        id: data.notificationId || Date.now().toString(),
        title,
        message,
        type: data.type || 'general',
        timestamp: new Date().toISOString(),
        ...data
      };

      io.emit('notification', notification);
      
      if (users && Array.isArray(users)) {
        for (const user of users) {
          io.to(`user-${user.id}`).emit('notification', notification);
          
          const socketsInRoom = await io.in(`user-${user.id}`).fetchSockets();
          if (socketsInRoom.length === 0) {
            this.queueOfflineNotification(user.id, notification);
          }
        }
      }

      logger.info(`Real-time notification sent: ${title} to ${users?.length || 'all'} users`);
      
      return { 
        success: true, 
        notification,
        sentTo: users?.length || 'all users'
      };
    } catch (error) {
      logger.error('Failed to send real-time notification:', error);
      return { success: false, error: error.message };
    }
  }

  queueOfflineNotification(userId, notification) {
    if (!this.offlineQueue.has(userId)) {
      this.offlineQueue.set(userId, []);
    }
    
    const queue = this.offlineQueue.get(userId);
    queue.push(notification);
    
    if (queue.length > 50) {
      queue.shift();
    }
    
    logger.info(`Queued notification for offline user ${userId}`);
  }

  async deliverOfflineNotifications(io, userId) {
    try {
      // First try in-memory queue (fast path)
      const queue = this.offlineQueue.get(userId);

      if (queue && queue.length > 0) {
        for (const notification of queue) {
          io.to(`user-${userId}`).emit('offline-notification', notification);
        }

        const count = queue.length;
        this.offlineQueue.delete(userId);

        logger.info(`Delivered ${count} offline notifications (memory) to user ${userId}`);

        // Mark deliveredAt in DB for those notifications if possible
        try {
          const notificationIds = queue.map(n => n.id).filter(Boolean);
          if (notificationIds.length > 0) {
            await prisma.userNotification.updateMany({
              where: {
                userId,
                notificationId: { in: notificationIds }
              },
              data: { deliveredAt: new Date() }
            });
          }
        } catch (dbErr) {
          logger.error(`Failed to mark deliveredAt for memory-queued notifications for user ${userId}:`, dbErr);
        }

        return { success: true, delivered: count };
      }

      // Fallback: persistent DB queue - find userNotifications not yet delivered
      const pending = await prisma.userNotification.findMany({
        where: {
          userId,
          deliveredAt: null
        },
        include: {
          notification: true
        }
      });

      if (!pending || pending.length === 0) {
        return { success: true, delivered: 0 };
      }

      for (const item of pending) {
        const payload = {
          id: item.notificationId,
          title: item.notification.title,
          message: item.notification.message,
          type: item.notification.type,
          timestamp: item.notification.createdAt ? item.notification.createdAt.toISOString() : new Date().toISOString()
        };

        io.to(`user-${userId}`).emit('offline-notification', payload);

        // Update deliveredAt for this record
        try {
          await prisma.userNotification.update({
            where: { id: item.id },
            data: { deliveredAt: new Date() }
          });
        } catch (updErr) {
          logger.error(`Failed to update deliveredAt for userNotification ${item.id}:`, updErr);
        }
      }

      logger.info(`Delivered ${pending.length} offline notifications (DB) to user ${userId}`);
      return { success: true, delivered: pending.length };
    } catch (error) {
      logger.error(`Failed to deliver offline notifications to user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  getOfflineNotificationCount(userId) {
    const queue = this.offlineQueue.get(userId);
    return queue ? queue.length : 0;
  }
}

module.exports = new NotificationService();
