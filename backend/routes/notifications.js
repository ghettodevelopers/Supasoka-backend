const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Send real-time notification helper using Socket.IO
const sendRealTimeNotification = async (io, users, title, message, data = {}) => {
  return await notificationService.sendRealTimeNotification(io, users, title, message, data);
};

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

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const userNotification = await prisma.userNotification.update({
      where: {
        userId_notificationId: {
          userId: req.user.id,
          notificationId
        }
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ userNotification });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
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

// Track notification click
router.post('/:id/click', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const userNotification = await prisma.userNotification.update({
      where: {
        userId_notificationId: {
          userId: req.user.id,
          notificationId
        }
      },
      data: {
        clicked: true,
        clickedAt: new Date(),
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ userNotification });
  } catch (error) {
    logger.error('Error tracking notification click:', error);
    res.status(500).json({ error: 'Failed to track notification click' });
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

// Get unread notification count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const unreadCount = await prisma.userNotification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Admin: Get all notifications with analytics
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(type && { type })
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        userNotifications: {
          select: {
            isRead: true,
            clicked: true,
            deliveredAt: true,
            clickedAt: true
          }
        }
      }
    });

    // Calculate analytics for each notification
    const notificationsWithAnalytics = notifications.map(notif => {
      const totalSent = notif.userNotifications.length;
      const delivered = notif.userNotifications.filter(un => un.deliveredAt).length;
      const read = notif.userNotifications.filter(un => un.isRead).length;
      const clicked = notif.userNotifications.filter(un => un.clicked).length;
      
      return {
        ...notif,
        _count: {
          userNotifications: totalSent
        },
        analytics: {
          totalSent,
          delivered,
          read,
          clicked,
          deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : 0,
          readRate: totalSent > 0 ? ((read / totalSent) * 100).toFixed(1) : 0,
          clickRate: totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(1) : 0
        }
      };
    });

    const total = await prisma.notification.count({ where });

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
    logger.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Admin: Create notification
router.post('/admin/create',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isIn(['general', 'subscription', 'update', 'maintenance']),
    body('targetUsers').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      if (Array.isArray(value)) return true;
      throw new Error('targetUsers must be an array or null');
    }),
    body('scheduledAt').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
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

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          targetUsers,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null
        }
      });

      // Determine target users
      let users;
      if (targetUsers && targetUsers.length > 0) {
        users = await prisma.user.findMany({
          where: {
            id: {
              in: targetUsers
            }
          },
          select: {
            id: true
          }
        });
      } else {
        users = await prisma.user.findMany({
          select: {
            id: true
          }
        });
      }

      // Create user notifications
      const userNotifications = users.map(user => ({
        userId: user.id,
        notificationId: notification.id
      }));

      await prisma.userNotification.createMany({
        data: userNotifications
      });

      // Send real-time notifications if not scheduled and sendPush is true
      if (!scheduledAt && sendPush) {
        const io = req.app.get('io');
        try {
          await sendRealTimeNotification(io, users, title, message, {
            type,
            notificationId: notification.id
          });
          
          // Skip push notifications for now (deviceToken field needs migration)
          // await pushyService.sendToMultipleDevices(
          //   users.map(u => u.deviceToken).filter(Boolean),
          //   { title, message, type },
          //   { notificationId: notification.id }
          // );
        } catch (notificationError) {
          logger.error('Error sending real-time notifications:', notificationError);
        }
      }

      // Emit real-time notification
      const io = req.app.get('io');
      io.to('admin-room').emit('notification-created', { notification });
      
      // Emit to targeted users
      users.forEach(user => {
        io.to(`user-${user.id}`).emit('new-notification', {
          id: notification.id,
          title,
          message,
          type,
          createdAt: notification.createdAt
        });
      });

      logger.info(`Notification created: ${title} by admin ${req.admin.email}`);
      res.status(201).json({ notification });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }
);

// Admin: Send immediate notification
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
      'match_started',  // Sports notifications
      'goal',           // Goal scored notifications
      'movie',          // New movie/content notifications
      'channel_update', // Channel updates
      'admin_message',  // Admin messages
      'access_granted', // Access granted
      'carousel_update',// Carousel updates
      'settings_update' // Settings updates
    ]),
    body('targetUsers').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      if (Array.isArray(value)) return true;
      throw new Error('targetUsers must be an array or null');
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        message,
        type = 'general',
        targetUsers
      } = req.body;

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          targetUsers,
          scheduledAt: null,
          sentAt: new Date() // Mark as sent immediately
        }
      });

      // Determine target users
      let users;
      if (targetUsers && targetUsers.length > 0) {
        users = await prisma.user.findMany({
          where: {
            id: {
              in: targetUsers
            }
          },
          select: {
            id: true
          }
        });
      } else {
        users = await prisma.user.findMany({
          select: {
            id: true
          }
        });
      }

      // Create user notifications
      if (users.length > 0) {
        const userNotifications = users.map(user => ({
          userId: user.id,
          notificationId: notification.id
        }));

        await prisma.userNotification.createMany({
          data: userNotifications
        });
      }

      // Send real-time notifications
      const io = req.app.get('io');
      try {
        await sendRealTimeNotification(io, users, title, message, {
          type,
          notificationId: notification.id
        });
      } catch (notificationError) {
        logger.error('Error sending real-time notifications:', notificationError);
      }

      // Emit to admin dashboard
      io.to('admin-room').emit('notification-created', { notification });
      
      // Emit to targeted users (or all users if no specific targets)
      if (targetUsers && targetUsers.length > 0) {
        // Send to specific users
        users.forEach(user => {
          io.to(`user-${user.id}`).emit('new-notification', {
            id: notification.id,
            title,
            message,
            type,
            createdAt: notification.createdAt
          });
        });
      } else {
        // Broadcast to all users
        io.emit('new-notification', {
          id: notification.id,
          title,
          message,
          type,
          createdAt: notification.createdAt
        });
        
        // Also emit as immediate-notification for backward compatibility
        io.emit('immediate-notification', {
          id: notification.id,
          title,
          message,
          type,
          timestamp: notification.createdAt
        });
      }

      logger.info(`Immediate notification sent: ${title} by admin ${req.admin.email}`);
      res.status(201).json({ notification, sentTo: users.length });
    } catch (error) {
      logger.error('Error sending immediate notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
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
    body('deviceId').notEmpty().withMessage('Device ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId } = req.body;
      const userId = req.user.id;

      // Validate device with our notification service
      const validation = await notificationService.validateDevice(deviceId);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      // Subscribe to general notifications
      await notificationService.subscribeToTopic(deviceId, 'all_users');

      logger.info(`Device registered for notifications: ${userId}`);
      res.json({ message: 'Device registered for notifications successfully' });
    } catch (error) {
      logger.error('Error registering device:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
  }
);

// Test notification
router.post('/test-notification',
  authMiddleware,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await notificationService.sendToDevice(
        user.deviceId,
        {
          title: 'Test Notification',
          message: 'This is a test notification from Supasoka!',
          type: 'test'
        }
      );

      if (result.success) {
        logger.info(`Test notification sent to user: ${req.user.id}`);
        res.json({ message: 'Test notification sent successfully', result });
      } else {
        res.status(500).json({ error: 'Failed to send test notification', details: result.error });
      }
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  }
);

// Test push notification
router.post('/test-push',
  authMiddleware,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user.deviceToken) {
        return res.status(400).json({ error: 'No device token registered' });
      }

      const result = await pushyService.sendToDevice(
        user.deviceToken,
        {
          title: 'Test Notification',
          message: 'This is a test push notification from Supasoka!',
          type: 'test'
        }
      );

      res.json({ message: 'Test notification sent', result });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  }
);


// Admin: Send status bar notification (popup on mobile)
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
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, message, targetUsers, priority = 'high', type = 'status_bar' } = req.body;

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          targetUsers,
          sentAt: new Date()
        }
      });

      // Determine target users
      let users;
      if (targetUsers && targetUsers.length > 0) {
        users = await prisma.user.findMany({
          where: {
            id: {
              in: targetUsers
            }
          },
          select: {
            id: true,
            deviceId: true
          }
        });
      } else {
        users = await prisma.user.findMany({
          select: {
            id: true,
            deviceId: true
          }
        });
      }

      // Create user notifications for tracking
      const userNotifications = users.map(user => ({
        userId: user.id,
        notificationId: notification.id
      }));

      await prisma.userNotification.createMany({
        data: userNotifications
      });

      // Send real-time status bar notifications via WebSocket
      const io = req.app.get('io');
      
      users.forEach(user => {
        io.to(`user-${user.id}`).emit('status-bar-notification', {
          id: notification.id,
          title,
          message,
          priority,
          type: 'status_bar',
          timestamp: notification.createdAt,
          autoHide: priority === 'low' ? 5000 : priority === 'normal' ? 8000 : 0 // High priority stays until dismissed
        });
      });

      // Emit to admin dashboard
      io.to('admin-room').emit('status-bar-notification-sent', { 
        notification,
        sentTo: users.length
      });

      logger.info(`Status bar notification sent: ${title} to ${users.length} users by admin ${req.admin.email}`);
      res.json({ 
        message: 'Status bar notification sent successfully',
        sentTo: users.length,
        notification
      });
    } catch (error) {
      logger.error('Error sending status bar notification:', error);
      res.status(500).json({ error: 'Failed to send status bar notification' });
    }
  }
);

module.exports = router;
