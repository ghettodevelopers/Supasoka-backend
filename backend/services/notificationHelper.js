const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const pushNotificationService = require('./pushNotificationService');

// Firebase Cloud Messaging notification system
// Notifications are stored in PostgreSQL and delivered via:
// 1. Socket.IO for online users (real-time in-app)
// 2. Firebase Cloud Messaging for status bar notifications (works when app is minimized/closed)
// 3. Database polling for offline users (when they come online)

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
        deliveredAt: null
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
      const onlineUserIds = [];

      for (const user of users) {
        const room = `user-${user.id}`;
        const socketsInRoom = await io.in(room).fetchSockets();

        if (socketsInRoom.length > 0) {
          io.to(room).emit(eventName, payload);
          emittedCount++;
          onlineUserIds.push(user.id);
        }
      }

      logger.info(`Emitted '${eventName}' to ${emittedCount}/${users.length} online users`);
      
      return { 
        success: true, 
        emittedCount, 
        totalUsers: users.length,
        offlineCount: users.length - emittedCount,
        onlineUserIds
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
      // Broadcast to ALL connected sockets
      io.emit(eventName, payload);
      
      // Also emit immediate-notification for status bar display
      io.emit('immediate-notification', payload);
      
      const sockets = await io.fetchSockets();
      logger.info(`📢 Broadcasted '${eventName}' to ${sockets.length} connected clients`);
      
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

  // Store notifications for offline users in database
  // They will be fetched when user comes online via polling
  async storeNotificationsForOfflineUsers(users, onlineUserIds, notificationId, title, message, type) {
    try {
      // Get offline user IDs (users not currently connected via Socket.IO)
      const offlineUserIds = users
        .filter(u => !onlineUserIds.includes(u.id))
        .map(u => u.id);

      if (offlineUserIds.length === 0) {
        logger.info('All users are online, no offline storage needed');
        return { success: true, storedCount: 0, reason: 'All users online' };
      }

      // Mark these notifications as pending delivery for offline users
      // The UserNotification records are already created, just need to ensure deliveredAt is null
      // When user polls, they'll get notifications where deliveredAt is null
      
      logger.info(`📦 ${offlineUserIds.length} users are offline - notifications stored in DB for later delivery`);
      
      return { 
        success: true, 
        storedCount: offlineUserIds.length,
        offlineUserIds 
      };
    } catch (error) {
      logger.error('Failed to store notifications for offline users:', error);
      return { success: false, error: error.message };
    }
  }

  // Send Firebase Cloud Messaging push notifications to users with device tokens
  async sendPushNotifications(users, notification, data = {}) {
    try {
      // Filter users with valid FCM device tokens
      const usersWithTokens = users.filter(u => 
        u.deviceToken && 
        u.deviceToken.length > 10 && 
        u.deviceToken !== 'null' && 
        u.deviceToken !== 'undefined'
      );

      if (usersWithTokens.length === 0) {
        logger.info('📱 No users with valid FCM tokens found');
        return { 
          success: true, 
          sent: 0, 
          reason: 'No users with valid FCM tokens' 
        };
      }

      const deviceTokens = usersWithTokens.map(u => u.deviceToken);
      
      logger.info(`📱 Sending Firebase push notifications to ${deviceTokens.length} devices`);

      const result = await pushNotificationService.sendToDevices(deviceTokens, {
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general'
      });

      if (result.success) {
        logger.info(`✅ Firebase push sent to ${result.sentTo} devices`);
      } else {
        logger.error(`❌ Firebase push failed: ${result.error}`);
      }

      return { 
        success: result.success, 
        sent: result.sentTo || 0,
        failureCount: result.failureCount || 0,
        deliveryMethod: 'firebase_cloud_messaging'
      };
    } catch (error) {
      logger.error('❌ Error sending Firebase push notifications:', error);
      return { 
        success: false, 
        sent: 0, 
        error: error.message 
      };
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

      const onlineCount = socketResult.emittedCount || socketResult.connectedClients || 0;
      const onlineUserIds = socketResult.onlineUserIds || [];

      // Store notifications for offline users (they'll poll when coming online)
      let offlineStorageResult = { success: true, storedCount: 0 };
      offlineStorageResult = await this.storeNotificationsForOfflineUsers(
        users,
        onlineUserIds,
        notificationId,
        title,
        message,
        type
      );

      const offlineStoredCount = offlineStorageResult.storedCount || 0;

      // Send Firebase push notifications to ALL users with device tokens
      // This ensures notifications appear on device status bar even when app is minimized/closed
      let pushResult = { success: true, sent: 0 };
      if (sendPush) {
        pushResult = await this.sendPushNotifications(users, {
          title,
          message,
          type
        });
      }

      // Mark deliveredAt for online users in DB
      try {
        const onlineIds = socketResult.onlineUserIds || [];
        if (onlineIds.length > 0) {
          await prisma.userNotification.updateMany({
            where: {
              userId: { in: onlineIds },
              notificationId
            },
            data: { deliveredAt: new Date() }
          });
        }
      } catch (dbErr) {
        logger.error('Failed to mark deliveredAt for online users:', dbErr);
      }

      // Emit to admin dashboard with both new and legacy keys for compatibility
      await this.emitToAdmin(io, 'notification-sent', {
        notificationId,
        sentTo: users.length,
        totalUsers: users.length,
        online: onlineCount,
        socketEmissions: onlineCount,
        offline: users.length - onlineCount,
        offlineUsers: offlineStoredCount,
        pushed: pushResult.sent || 0,
        pushNotificationsSent: pushResult.sent || 0,
        offlineStored: offlineStoredCount,
        deliveryMethod: 'firebase_cloud_messaging'
      });

      logger.info(`✅ Notification sent: ${title} to ${users.length} users (${onlineCount} online, ${pushResult.sent || 0} push sent, ${offlineStoredCount} stored for offline)`);

      return {
        success: true,
        notificationId,
        stats: {
          totalUsers: users.length,
          userNotificationsCreated: createResult.count,
          socketEmissions: onlineCount,
          offlineUsers: offlineStoredCount,
          offlineStored: offlineStoredCount,
          pushNotificationsSent: pushResult.sent || 0,
          deliveryMethod: 'firebase_cloud_messaging'
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

      // Send Firebase push notifications for status bar display on device
      const pushResult = await this.sendPushNotifications(users, {
        title,
        message,
        type: 'status_bar'
      });

      await this.emitToAdmin(io, 'status-bar-notification-sent', {
        notificationId,
        sentTo: users.length,
        online: socketResult.emittedCount || 0,
        pushNotificationsSent: pushResult.sent || 0,
        deliveryMethod: 'firebase_cloud_messaging'
      });

      logger.info(`Status bar notification sent: ${title} to ${users.length} users (${pushResult.sent || 0} push sent)`);

      return {
        success: true,
        notificationId,
        stats: {
          totalUsers: users.length,
          onlineUsers: socketResult.emittedCount || 0,
          offlineUsers: socketResult.offlineCount || 0,
          pushNotificationsSent: pushResult.sent || 0,
          deliveryMethod: 'firebase_cloud_messaging'
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
