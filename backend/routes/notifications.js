const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const notificationHelper = require('../services/notificationHelper');
const pushyService = require('../services/pushyService');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications with unread count
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // For admin requests, return all notifications
    if (req.userType === 'admin') {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      });

      const total = await prisma.notification.count();

      return res.json({
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    // For user requests, get user-specific notifications
    const where = {
      userId: req.user.id,
      ...(unread === 'true' && { isRead: false })
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        include: {
          notification: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({ 
        where: { 
          userId: req.user.id, 
          isRead: false 
        } 
      })
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read (with transaction to prevent race conditions)
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    const result = await notificationHelper.markAsReadWithTransaction(userId, notificationId);

    if (!result.success) {
      logger.error(`Failed to mark notification as read - User: ${userId}, Notification: ${notificationId}`, result.error);
      return res.status(400).json({ 
        error: result.error,
        context: { userId, notificationId }
      });
    }

    logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    res.json({ 
      userNotification: result.userNotification,
      alreadyRead: result.alreadyRead
    });
  } catch (error) {
    logger.error(`Error marking notification as read - User: ${req.user.id}, Notification: ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      context: { userId: req.user.id, notificationId: req.params.id }
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await prisma.userNotification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Track notification click (with transaction to prevent race conditions)
router.post('/:id/click', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    const result = await notificationHelper.markAsClickedWithTransaction(userId, notificationId);

    if (!result.success) {
      logger.error(`Failed to track notification click - User: ${userId}, Notification: ${notificationId}:`, result.error);
      return res.status(400).json({ 
        error: result.error,
        context: { userId, notificationId }
      });
    }

    logger.info(`Notification ${notificationId} clicked by user ${userId}`);
    res.json({ 
      userNotification: result.userNotification,
      alreadyClicked: result.alreadyClicked
    });
  } catch (error) {
    logger.error(`Error tracking notification click - User: ${req.user.id}, Notification: ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Failed to track notification click',
      context: { userId: req.user.id, notificationId: req.params.id }
    });
  }
});

// Delete notification for user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    await prisma.userNotification.delete({
      where: {
        userId_notificationId: {
          userId: req.user.id,
          notificationId
        }
      }
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications for user
router.delete('/delete-all', authMiddleware, async (req, res) => {
  try {
    await prisma.userNotification.deleteMany({
      where: {
        userId: req.user.id
      }
    });

    res.json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    logger.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
});

// Get unread notification count (optimized)
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationHelper.getUnreadCount(userId);

    if (!result.success) {
      logger.error(`Failed to fetch unread count - User: ${userId}:`, result.error);
      return res.status(500).json({ 
        error: result.error,
        context: { userId }
      });
    }

    res.json({ unreadCount: result.count });
  } catch (error) {
    logger.error(`Error fetching unread count - User: ${req.user.id}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch unread count',
      context: { userId: req.user.id }
    });
  }
});

// Admin: Get all notifications with analytics (optimized with DB aggregation)
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(type && { type })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          targetUsers: true,
          isActive: true,
          scheduledAt: true,
          sentAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.notification.count({ where })
    ]);

    const notificationIds = notifications.map(n => n.id);

    const analytics = await prisma.userNotification.groupBy({
      by: ['notificationId'],
      where: {
        notificationId: { in: notificationIds }
      },
      _count: {
        id: true
      },
      _sum: {
        isRead: true,
        clicked: true
      }
    });

    const deliveredCounts = await prisma.userNotification.groupBy({
      by: ['notificationId'],
      where: {
        notificationId: { in: notificationIds },
        deliveredAt: { not: null }
      },
      _count: {
        id: true
      }
    });

    const analyticsMap = new Map();
    analytics.forEach(a => {
      analyticsMap.set(a.notificationId, {
        totalSent: a._count.id,
        read: a._sum.isRead || 0,
        clicked: a._sum.clicked || 0
      });
    });

    const deliveredMap = new Map();
    deliveredCounts.forEach(d => {
      deliveredMap.set(d.notificationId, d._count.id);
    });

    const notificationsWithAnalytics = notifications.map(notif => {
      const stats = analyticsMap.get(notif.id) || { totalSent: 0, read: 0, clicked: 0 };
      const delivered = deliveredMap.get(notif.id) || 0;
      
      return {
        ...notif,
        analytics: {
          totalSent: stats.totalSent,
          delivered,
          read: stats.read,
          clicked: stats.clicked,
          deliveryRate: stats.totalSent > 0 ? ((delivered / stats.totalSent) * 100).toFixed(1) : '0.0',
          readRate: stats.totalSent > 0 ? ((stats.read / stats.totalSent) * 100).toFixed(1) : '0.0',
          clickRate: stats.totalSent > 0 ? ((stats.clicked / stats.totalSent) * 100).toFixed(1) : '0.0'
        }
      };
    });

    logger.info(`Admin fetched ${notifications.length} notifications with analytics`);

    res.json({
      notifications: notificationsWithAnalytics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Error fetching admin notifications - Admin: ${req.admin?.email}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      context: { adminEmail: req.admin?.email }
    });
  }
});

// Admin: Create notification (with optional scheduling)
router.post('/admin/create',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isIn(['general', 'subscription', 'update', 'maintenance', 'match_started', 'goal', 'movie', 'channel_update', 'admin_message', 'access_granted', 'carousel_update', 'settings_update']),
    body('targetUsers').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      if (Array.isArray(value)) return true;
      throw new Error('targetUsers must be an array or null');
    }),
    body('scheduledAt').optional().isISO8601(),
    body('sendPush').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error(`Validation errors in notification creation - Admin: ${req.admin.email}`, errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        message,
        type = 'general',
        targetUsers,
        scheduledAt,
        sendPush = true
      } = req.body;

      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          targetUsers,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null
        }
      });

      const io = req.app.get('io');

      if (!scheduledAt) {
        const result = await notificationHelper.sendCompleteNotification(
          io,
          notification.id,
          title,
          message,
          type,
          targetUsers,
          sendPush
        );

        if (!result.success) {
          logger.error(`Failed to send notification ${notification.id} - Admin: ${req.admin.email}:`, result.error);
          return res.status(500).json({ 
            error: result.error,
            notification,
            context: { adminEmail: req.admin.email, notificationId: notification.id }
          });
        }

        await prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() }
        });

        await notificationHelper.emitToAdmin(io, 'notification-created', { 
          notification,
          stats: result.stats
        });

        logger.info(`Notification created and sent: ${title} by admin ${req.admin.email}`);
        res.status(201).json({ 
          notification,
          stats: result.stats,
          scheduled: false
        });
      } else {
        await notificationHelper.emitToAdmin(io, 'notification-created', { 
          notification,
          scheduled: true
        });

        logger.info(`Notification scheduled: ${title} for ${scheduledAt} by admin ${req.admin.email}`);
        res.status(201).json({ 
          notification,
          scheduled: true,
          scheduledAt
        });
      }
    } catch (error) {
      logger.error(`Error creating notification - Admin: ${req.admin?.email}:`, error);
      res.status(500).json({ 
        error: 'Failed to create notification',
        context: { adminEmail: req.admin?.email }
      });
    }
  }
);

// Admin: Send immediate notification (optimized with helper)
router.post('/admin/send-immediate',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isIn([
      'general', 
      'subscription', 
      'update', 
      'maintenance',
      'match_started',
      'goal',
      'movie',
      'channel_update',
      'admin_message',
      'access_granted',
      'carousel_update',
      'settings_update'
    ]),
    body('targetUsers').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      if (Array.isArray(value)) return true;
      throw new Error('targetUsers must be an array or null');
    }),
    body('sendPush').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error(`Validation errors in immediate notification - Admin: ${req.admin.email}`, errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        message,
        type = 'general',
        targetUsers,
        sendPush = true
      } = req.body;

      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          targetUsers,
          scheduledAt: null,
          sentAt: new Date()
        }
      });

      const io = req.app.get('io');

      const result = await notificationHelper.sendCompleteNotification(
        io,
        notification.id,
        title,
        message,
        type,
        targetUsers,
        sendPush
      );

      if (!result.success) {
        logger.error(`Failed to send immediate notification ${notification.id} - Admin: ${req.admin.email}:`, result.error);
        return res.status(500).json({ 
          error: result.error,
          notification,
          context: { adminEmail: req.admin.email, notificationId: notification.id }
        });
      }

      logger.info(`Immediate notification sent: ${title} to ${result.stats.totalUsers} users by admin ${req.admin.email}`);
      res.status(201).json({ 
        notification,
        stats: result.stats
      });
    } catch (error) {
      logger.error(`Error sending immediate notification - Admin: ${req.admin?.email}:`, error);
      res.status(500).json({ 
        error: 'Failed to send notification',
        context: { adminEmail: req.admin?.email }
      });
    }
  }
);

// Admin: Update notification
router.put('/admin/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const updateData = req.body;

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: updateData
      });

      const io = req.app.get('io');
      io.to('admin-room').emit('notification-updated', { notification });

      logger.info(`Notification updated: ${notification.title} by admin ${req.admin.email}`);
      res.json({ notification });
    } catch (error) {
      logger.error('Error updating notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  }
);

// Admin: Delete notification
router.delete('/admin/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      
      await prisma.notification.delete({
        where: { id: notificationId }
      });

      const io = req.app.get('io');
      io.to('admin-room').emit('notification-deleted', { notificationId });

      logger.info(`Notification deleted: ${notificationId} by admin ${req.admin.email}`);
      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
);

// Register device for notifications
router.post('/register-device',
  authMiddleware,
  [
    body('deviceToken').notEmpty().withMessage('Device token is required'),
    body('deviceId').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error(`Validation errors in device registration - User: ${req.user.id}`, errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceToken, deviceId } = req.body;
      const userId = req.user.id;

      const validation = await pushyService.validateDeviceToken(deviceToken);
      
      if (!validation.success) {
        logger.error(`Invalid device token for user ${userId}:`, validation.error);
        return res.status(400).json({ 
          error: validation.error,
          context: { userId }
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          deviceToken,
          ...(deviceId && { deviceId })
        }
      });

      await notificationService.subscribeToTopic(deviceToken, 'all_users');

      logger.info(`Device token registered for user ${userId}`);
      res.json({ 
        message: 'Device registered for notifications successfully',
        deviceToken: deviceToken.substring(0, 10) + '...'
      });
    } catch (error) {
      logger.error(`Error registering device - User: ${req.user?.id}:`, error);
      res.status(500).json({ 
        error: 'Failed to register device',
        context: { userId: req.user?.id }
      });
    }
  }
);

// Test notification (Socket.IO real-time)
router.post('/test-notification',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          deviceId: true,
          deviceToken: true
        }
      });

      if (!user) {
        logger.error(`Test notification failed - User not found: ${userId}`);
        return res.status(404).json({ 
          error: 'User not found',
          context: { userId }
        });
      }

      const io = req.app.get('io');
      const testNotification = {
        id: `test-${Date.now()}`,
        title: 'Test Notification',
        message: 'This is a test notification from Supasoka!',
        type: 'test',
        timestamp: new Date().toISOString()
      };

      io.to(`user-${userId}`).emit('new-notification', testNotification);

      const socketsInRoom = await io.in(`user-${userId}`).fetchSockets();
      const isOnline = socketsInRoom.length > 0;

      logger.info(`Test notification sent to user ${userId} - Online: ${isOnline}`);
      
      res.json({ 
        message: 'Test notification sent successfully',
        notification: testNotification,
        userStatus: {
          online: isOnline,
          connectedSockets: socketsInRoom.length
        }
      });
    } catch (error) {
      logger.error(`Error sending test notification - User: ${req.user?.id}:`, error);
      res.status(500).json({ 
        error: 'Failed to send test notification',
        context: { userId: req.user?.id }
      });
    }
  }
);

// Test push notification (Pushy)
router.post('/test-push',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          deviceToken: true
        }
      });

      if (!user) {
        logger.error(`Test push failed - User not found: ${userId}`);
        return res.status(404).json({ 
          error: 'User not found',
          context: { userId }
        });
      }

      if (!user.deviceToken) {
        logger.warn(`Test push failed - No device token for user: ${userId}`);
        return res.status(400).json({ 
          error: 'No device token registered',
          message: 'Please register your device token first',
          context: { userId }
        });
      }

      const result = await pushyService.sendToDevice(
        user.deviceToken,
        {
          title: 'Test Push Notification',
          message: 'This is a test push notification from Supasoka!',
          type: 'test'
        },
        { userId }
      );

      if (result.success) {
        logger.info(`Test push notification sent to user ${userId}`);
        res.json({ 
          message: 'Test push notification sent successfully',
          result,
          deviceToken: user.deviceToken.substring(0, 10) + '...'
        });
      } else {
        logger.error(`Test push notification failed for user ${userId}:`, result.error);
        res.status(500).json({ 
          error: 'Failed to send push notification',
          details: result.error,
          context: { userId }
        });
      }
    } catch (error) {
      logger.error(`Error sending test push notification - User: ${req.user?.id}:`, error);
      res.status(500).json({ 
        error: 'Failed to send test push notification',
        context: { userId: req.user?.id }
      });
    }
  }
);


// Admin: Send status bar notification (popup on mobile with autoHide)
router.post('/admin/send-status-bar',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('targetUsers').optional().isArray(),
    body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid priority')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error(`Validation errors in status bar notification - Admin: ${req.admin.email}`, errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, message, targetUsers, priority = 'high' } = req.body;

      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type: 'status_bar',
          targetUsers,
          sentAt: new Date()
        }
      });

      const io = req.app.get('io');

      const result = await notificationHelper.sendStatusBarNotification(
        io,
        notification.id,
        title,
        message,
        priority,
        targetUsers
      );

      if (!result.success) {
        logger.error(`Failed to send status bar notification ${notification.id} - Admin: ${req.admin.email}:`, result.error);
        return res.status(500).json({ 
          error: result.error,
          notification,
          context: { adminEmail: req.admin.email, notificationId: notification.id }
        });
      }

      logger.info(`Status bar notification sent: ${title} to ${result.stats.totalUsers} users (${result.stats.onlineUsers} online) by admin ${req.admin.email}`);
      res.json({ 
        message: 'Status bar notification sent successfully',
        notification,
        stats: result.stats
      });
    } catch (error) {
      logger.error(`Error sending status bar notification - Admin: ${req.admin?.email}:`, error);
      res.status(500).json({ 
        error: 'Failed to send status bar notification',
        context: { adminEmail: req.admin?.email }
      });
    }
  }
);

module.exports = router;
