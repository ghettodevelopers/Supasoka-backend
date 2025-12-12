const { PrismaClient } = require('@prisma/client');
const pushyService = require('./pushyService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class NotificationHelper {
  async createUserNotifications(notificationId, userIds) {
    if (!userIds || userIds.length === 0) {
      return { success: false, error: 'No user IDs provided' };
    }

    try {
      const userNotifications = userIds.map(userId => ({
        userId,
        notificationId,
        deliveredAt: new Date()
      }));

      await prisma.userNotification.createMany({
        data: userNotifications,
        skipDuplicates: true
      });

      logger.info(`Created ${userIds.length} user notifications for notification ${notificationId}`);
      
      return { success: true, count: userIds.length };
    } catch (error) {
      logger.error(`Failed to create user notifications for ${notificationId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getTargetUsers(targetUserIds = null) {
    try {
      let users;
      
      if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        users = await prisma.user.findMany({
          where: {
            id: { in: targetUserIds },
            isBlocked: false
          },
          select: {
            id: true,
            deviceId: true,
            deviceToken: true
          }
        });
      } else {
        users = await prisma.user.findMany({
          where: {
            isBlocked: false
          },
          select: {
            id: true,
            deviceId: true,
            deviceToken: true
          }
        });
      }

      return { success: true, users };
    } catch (error) {
      logger.error('Failed to get target users:', error);
      return { success: false, error: error.message, users: [] };
    }
  }

  async emitToUsers(io, users, eventName, payload) {
    if (!io) {
      logger.error('Socket.IO instance not provided');
      return { success: false, error: 'Socket.IO not available' };
    }

    try {
      let emittedCount = 0;

      for (const user of users) {
        const room = `user-${user.id}`;
        const socketsInRoom = await io.in(room).fetchSockets();
        
        if (socketsInRoom.length > 0) {
          io.to(room).emit(eventName, payload);
          emittedCount++;
        }
      }

      logger.info(`Emitted '${eventName}' to ${emittedCount}/${users.length} online users`);
      
      return { 
        success: true, 
        emittedCount, 
        totalUsers: users.length,
        offlineCount: users.length - emittedCount
      };
    } catch (error) {
      logger.error(`Failed to emit '${eventName}' to users:`, error);
      return { success: false, error: error.message };
    }
  }

  async emitToAllUsers(io, eventName, payload) {
    if (!io) {
      logger.error('Socket.IO instance not provided');
      return { success: false, error: 'Socket.IO not available' };
    }

    try {
      io.emit(eventName, payload);
      
      const sockets = await io.fetchSockets();
      logger.info(`Broadcasted '${eventName}' to ${sockets.length} connected clients`);
      
      return { success: true, connectedClients: sockets.length };
    } catch (error) {
      logger.error(`Failed to broadcast '${eventName}':`, error);
      return { success: false, error: error.message };
    }
  }

  async emitToAdmin(io, eventName, payload) {
    if (!io) {
      logger.error('Socket.IO instance not provided');
      return { success: false, error: 'Socket.IO not available' };
    }

    try {
      io.to('admin-room').emit(eventName, payload);
      
      const adminSockets = await io.in('admin-room').fetchSockets();
      logger.info(`Emitted '${eventName}' to ${adminSockets.length} admin(s)`);
      
      return { success: true, adminCount: adminSockets.length };
    } catch (error) {
      logger.error(`Failed to emit '${eventName}' to admin:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendPushNotifications(users, notification, data = {}) {
    const deviceTokens = users
      .map(u => u.deviceToken)
      .filter(token => token && typeof token === 'string');

    if (deviceTokens.length === 0) {
      logger.info('No device tokens available for push notifications');
      return { success: true, sent: 0, reason: 'No device tokens' };
    }

    try {
      const result = await pushyService.sendToMultipleDevices(
        deviceTokens,
        notification,
        data
      );

      if (result.success) {
        logger.info(`Push notifications sent to ${result.sentCount} devices`);
      } else {
        logger.warn(`Push notification failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to send push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async sendCompleteNotification(io, notificationId, title, message, type, targetUserIds = null, sendPush = true) {
    try {
      const usersResult = await this.getTargetUsers(targetUserIds);
      
      if (!usersResult.success) {
        throw new Error(usersResult.error);
      }

      const users = usersResult.users;

      if (users.length === 0) {
        return { 
          success: false, 
          error: 'No target users found',
          details: { targetUserIds }
        };
      }

      const userIds = users.map(u => u.id);
      const createResult = await this.createUserNotifications(notificationId, userIds);

      if (!createResult.success) {
        throw new Error(createResult.error);
      }

      const notificationPayload = {
        id: notificationId,
        title,
        message,
        type,
        timestamp: new Date().toISOString()
      };

      let socketResult;
      if (targetUserIds && targetUserIds.length > 0) {
        socketResult = await this.emitToUsers(io, users, 'new-notification', notificationPayload);
      } else {
        socketResult = await this.emitToAllUsers(io, 'new-notification', notificationPayload);
      }

      let pushResult = { success: true, sentCount: 0, reason: 'Push disabled' };
      if (sendPush) {
        pushResult = await this.sendPushNotifications(
          users,
          { title, message, type },
          { notificationId }
        );
      }

      const pushedCount = pushResult.sentCount || pushResult.sentTo || 0;
      const onlineCount = socketResult.emittedCount || socketResult.connectedClients || 0;

      // Emit to admin dashboard with both new and legacy keys for compatibility
      await this.emitToAdmin(io, 'notification-sent', {
        notificationId,
        sentTo: users.length,
        totalUsers: users.length,
        online: onlineCount,
        socketEmissions: onlineCount,
        offline: users.length - onlineCount,
        offlineUsers: socketResult.offlineCount || (users.length - onlineCount),
        pushed: pushedCount,
        pushNotificationsSent: pushedCount
      });

      logger.info(`Complete notification sent: ${title} to ${users.length} users`);

      return {
        success: true,
        notificationId,
        stats: {
          totalUsers: users.length,
          userNotificationsCreated: createResult.count,
          socketEmissions: onlineCount,
          offlineUsers: socketResult.offlineCount || (users.length - onlineCount),
          pushNotificationsSent: pushedCount
        }
      };
    } catch (error) {
      logger.error(`Failed to send complete notification ${notificationId}:`, error);
      return { 
        success: false, 
        error: error.message,
        notificationId
      };
    }
  }

  async sendStatusBarNotification(io, notificationId, title, message, priority, targetUserIds = null) {
    try {
      const usersResult = await this.getTargetUsers(targetUserIds);
      
      if (!usersResult.success) {
        throw new Error(usersResult.error);
      }

      const users = usersResult.users;

      if (users.length === 0) {
        return { 
          success: false, 
          error: 'No target users found',
          details: { targetUserIds }
        };
      }

      const userIds = users.map(u => u.id);
      await this.createUserNotifications(notificationId, userIds);

      const autoHideDuration = priority === 'low' ? 5000 : priority === 'normal' ? 8000 : 0;

      const statusBarPayload = {
        id: notificationId,
        title,
        message,
        priority,
        type: 'status_bar',
        timestamp: new Date().toISOString(),
        autoHide: autoHideDuration
      };

      const socketResult = await this.emitToUsers(io, users, 'status-bar-notification', statusBarPayload);

      await this.emitToAdmin(io, 'status-bar-notification-sent', {
        notificationId,
        sentTo: users.length,
        online: socketResult.emittedCount || 0
      });

      logger.info(`Status bar notification sent: ${title} to ${users.length} users`);

      return {
        success: true,
        notificationId,
        stats: {
          totalUsers: users.length,
          onlineUsers: socketResult.emittedCount || 0,
          offlineUsers: socketResult.offlineCount || 0
        }
      };
    } catch (error) {
      logger.error(`Failed to send status bar notification ${notificationId}:`, error);
      return { 
        success: false, 
        error: error.message,
        notificationId
      };
    }
  }

  async markAsReadWithTransaction(userId, notificationId) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.userNotification.findUnique({
          where: {
            userId_notificationId: {
              userId,
              notificationId
            }
          }
        });

        if (!existing) {
          throw new Error('Notification not found for user');
        }

        if (existing.isRead) {
          return { alreadyRead: true, userNotification: existing };
        }

        const updated = await tx.userNotification.update({
          where: {
            userId_notificationId: {
              userId,
              notificationId
            }
          },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });

        return { alreadyRead: false, userNotification: updated };
      });

      return { success: true, ...result };
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as read for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async markAsClickedWithTransaction(userId, notificationId) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.userNotification.findUnique({
          where: {
            userId_notificationId: {
              userId,
              notificationId
            }
          }
        });

        if (!existing) {
          throw new Error('Notification not found for user');
        }

        if (existing.clicked) {
          return { alreadyClicked: true, userNotification: existing };
        }

        const updated = await tx.userNotification.update({
          where: {
            userId_notificationId: {
              userId,
              notificationId
            }
          },
          data: {
            clicked: true,
            clickedAt: new Date(),
            isRead: true,
            readAt: existing.readAt || new Date()
          }
        });

        return { alreadyClicked: false, userNotification: updated };
      });

      return { success: true, ...result };
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as clicked for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getUnreadCount(userId) {
    try {
      const count = await prisma.userNotification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return { success: true, count };
    } catch (error) {
      logger.error(`Failed to get unread count for user ${userId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }
}

module.exports = new NotificationHelper();
