const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const logger = require('../utils/logger');
const auditLogService = require('../services/auditLogService');

const router = express.Router();
const prisma = new PrismaClient();

// Helper to get client IP and user agent
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown'
});

// Get admin profile
router.get('/profile', authMiddleware, adminOnly, async (req, res) => {
  try {
    // If admin is already in req (from auth middleware), use it
    if (req.admin && req.admin.id === 1) {
      // Return hardcoded admin profile
      return res.json({
        admin: {
          id: 1,
          email: 'Ghettodevelopers@gmail.com',
          name: 'Super Admin',
          role: 'super_admin',
          lastLogin: new Date(),
          createdAt: new Date('2024-01-01')
        }
      });
    }

    // For other admins, try database
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLogin: true,
        createdAt: true
      }
    });

    res.json({ admin });
  } catch (error) {
    logger.error('Error fetching admin profile:', error);
    
    // Fallback for hardcoded admin if database fails
    if (req.admin && req.admin.id === 1) {
      return res.json({
        admin: {
          id: 1,
          email: 'Ghettodevelopers@gmail.com',
          name: 'Super Admin',
          role: 'super_admin',
          lastLogin: new Date(),
          createdAt: new Date('2024-01-01')
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update admin profile
router.put('/profile',
  authMiddleware,
  adminOnly,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email } = req.body;
      
      const admin = await prisma.admin.update({
        where: { id: req.admin.id },
        data: {
          ...(name && { name }),
          ...(email && { email })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lastLogin: true,
          createdAt: true
        }
      });

      res.json({ admin });
    } catch (error) {
      logger.error('Error updating admin profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Send real-time notification to specific users or all users
router.post('/notifications/send-realtime',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, message, type = 'general', userId } = req.body;
      const io = req.app.get('io');

      const notificationData = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        from: 'admin'
      };

      if (userId) {
        // Send to specific user
        io.to(`user-${userId}`).emit('immediate-notification', notificationData);
        io.to(`user-${userId}`).emit('admin-message', notificationData);
        logger.info(`Real-time notification sent to user ${userId} by ${req.admin.email}`);
      } else {
        // Broadcast to all users
        io.emit('immediate-notification', notificationData);
        io.emit('admin-message', notificationData);
        logger.info(`Real-time notification broadcast by ${req.admin.email}`);
      }

      res.json({ 
        success: true, 
        message: 'Notification sent successfully',
        notification: notificationData
      });
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

// Grant user access
router.post('/users/grant-access',
  authMiddleware,
  adminOnly,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('accessType').notEmpty().withMessage('Access type is required'),
    body('message').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userId, accessType, message, duration } = req.body;
      const io = req.app.get('io');

      // Here you would update user access in database
      // For now, just send the notification

      const accessData = {
        id: Date.now().toString(),
        title: 'Ufikiaji Umeidhinishwa',
        message: message || `Umepewa ufikiaji wa ${accessType}`,
        type: 'access_granted',
        accessType,
        duration,
        timestamp: new Date().toISOString(),
        from: 'admin'
      };

      // Send to specific user
      io.to(`user-${userId}`).emit('access-granted', accessData);
      
      logger.info(`Access granted to user ${userId} by ${req.admin.email}`);

      res.json({ 
        success: true, 
        message: 'Access granted successfully',
        accessData
      });
    } catch (error) {
      logger.error('Error granting user access:', error);
      res.status(500).json({ error: 'Failed to grant access' });
    }
  }
);

// Trigger carousel update notification
router.post('/carousel/notify-update',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const io = req.app.get('io');
      
      const updateData = {
        id: Date.now().toString(),
        message: 'Picha za carousel zimebadilishwa',
        timestamp: new Date().toISOString(),
        from: 'admin'
      };

      // Broadcast carousel update
      io.emit('carousel-updated', updateData);
      
      logger.info(`Carousel update notification sent by ${req.admin.email}`);

      res.json({ 
        success: true, 
        message: 'Carousel update notification sent'
      });
    } catch (error) {
      logger.error('Error sending carousel update notification:', error);
      res.status(500).json({ error: 'Failed to send carousel update notification' });
    }
  }
);

// Change admin password
router.put('/change-password',
  authMiddleware,
  adminOnly,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      
      const admin = await prisma.admin.findUnique({
        where: { id: req.admin.id }
      });

      if (!await bcrypt.compare(currentPassword, admin.password)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await prisma.admin.update({
        where: { id: req.admin.id },
        data: { password: hashedPassword }
      });

      logger.info(`Admin password changed: ${admin.email}`);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Error changing admin password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Get all admins (super admin only)
router.get('/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ admins });
  } catch (error) {
    logger.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Create new admin (super admin only)
router.post('/create',
  authMiddleware,
  adminOnly,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['admin', 'super_admin']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role = 'admin' } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);

      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      logger.info(`New admin created: ${admin.email} by ${req.admin.email}`);
      res.status(201).json({ admin });
    } catch (error) {
      logger.error('Error creating admin:', error);
      res.status(500).json({ error: 'Failed to create admin' });
    }
  }
);

// Get free trial settings (Enhanced with seconds) - MOVED BEFORE :id route
router.get('/free-trial', authMiddleware, adminOnly, async (req, res) => {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: 'free_trial_seconds' }
    });

    const freeTrialSeconds = setting ? parseInt(setting.value) : 15; // Default 15 seconds
    
    res.json({
      freeTrialSeconds,
      freeTrialDays: Math.floor(freeTrialSeconds / (24 * 60 * 60)),
      freeTrialHours: Math.floor((freeTrialSeconds % (24 * 60 * 60)) / (60 * 60)),
      freeTrialMinutes: Math.floor((freeTrialSeconds % (60 * 60)) / 60),
      freeTrialSecs: freeTrialSeconds % 60
    });
  } catch (error) {
    logger.error('Error fetching free trial settings:', error);
    res.status(500).json({ error: 'Failed to fetch free trial settings' });
  }
});

// Update free trial settings (Enhanced with seconds) - MOVED BEFORE :id route
router.put('/free-trial', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { days = 0, hours = 0, minutes = 0, seconds = 0, totalSeconds } = req.body;
    console.log('✅ Free trial update received:', { days, hours, minutes, seconds, totalSeconds });
    
    let freeTrialSeconds;
    if (totalSeconds) {
      freeTrialSeconds = totalSeconds;
    } else {
      freeTrialSeconds = (parseInt(days) * 24 * 60 * 60) + 
                        (parseInt(hours) * 60 * 60) + 
                        (parseInt(minutes) * 60) + 
                        parseInt(seconds);
    }

    if (freeTrialSeconds <= 0) {
      return res.status(400).json({ error: 'Free trial time must be greater than 0' });
    }

    const setting = await prisma.appSettings.upsert({
      where: { key: 'free_trial_seconds' },
      update: {
        value: freeTrialSeconds.toString(),
        description: `Free trial duration: ${Math.floor(freeTrialSeconds / (24 * 60 * 60))}d ${Math.floor((freeTrialSeconds % (24 * 60 * 60)) / (60 * 60))}h ${Math.floor((freeTrialSeconds % (60 * 60)) / 60)}m ${freeTrialSeconds % 60}s`,
        updatedBy: req.admin.email
      },
      create: {
        key: 'free_trial_seconds',
        value: freeTrialSeconds.toString(),
        description: `Free trial duration: ${Math.floor(freeTrialSeconds / (24 * 60 * 60))}d ${Math.floor((freeTrialSeconds % (24 * 60 * 60)) / (60 * 60))}h ${Math.floor((freeTrialSeconds % (60 * 60)) / 60)}m ${freeTrialSeconds % 60}s`,
        updatedBy: req.admin.email
      }
    });

    // Emit setting change to admin dashboard
    const io = req.app.get('io');
    io.to('admin-room').emit('free-trial-updated', { 
      freeTrialSeconds,
      updatedBy: req.admin.email
    });

    logger.info(`✅ Free trial updated: ${freeTrialSeconds} seconds by ${req.admin.email}`);
    res.json({ 
      setting,
      freeTrialSeconds,
      freeTrialDays: Math.floor(freeTrialSeconds / (24 * 60 * 60)),
      freeTrialHours: Math.floor((freeTrialSeconds % (24 * 60 * 60)) / (60 * 60)),
      freeTrialMinutes: Math.floor((freeTrialSeconds % (60 * 60)) / 60),
      freeTrialSecs: freeTrialSeconds % 60,
      message: `Free trial updated to ${Math.floor(freeTrialSeconds / (24 * 60 * 60))}d ${Math.floor((freeTrialSeconds % (24 * 60 * 60)) / (60 * 60))}h ${Math.floor((freeTrialSeconds % (60 * 60)) / 60)}m ${freeTrialSeconds % 60}s`
    });
  } catch (error) {
    logger.error('Error updating free trial settings:', error);
    console.error('Detailed error:', error);
    res.status(500).json({ error: 'Failed to update free trial settings', details: error.message });
  }
});

// Update admin (super admin only)
router.put('/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }

      const adminId = req.params.id;
      const { name, email, role, isActive } = req.body;

      const admin = await prisma.admin.update({
        where: { id: adminId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      logger.info(`Admin updated: ${admin.email} by ${req.admin.email}`);
      res.json({ admin });
    } catch (error) {
      logger.error('Error updating admin:', error);
      res.status(500).json({ error: 'Failed to update admin' });
    }
  }
);

// Delete admin (super admin only)
router.delete('/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }

      const adminId = req.params.id;
      
      if (adminId === req.admin.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await prisma.admin.delete({
        where: { id: adminId }
      });

      logger.info(`Admin deleted: ${adminId} by ${req.admin.email}`);
      res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
      logger.error('Error deleting admin:', error);
      res.status(500).json({ error: 'Failed to delete admin' });
    }
  }
);

// Get app settings
router.get('/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const settings = await prisma.appSettings.findMany({
      orderBy: { key: 'asc' }
    });

    res.json({ settings });
  } catch (error) {
    logger.error('Error fetching app settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update app setting
router.put('/settings/:key',
  authMiddleware,
  adminOnly,
  [
    body('value').notEmpty().withMessage('Value is required'),
    body('description').optional().isString()
  ],
  async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      const setting = await prisma.appSettings.upsert({
        where: { key },
        update: {
          value,
          description,
          updatedBy: req.admin.email
        },
        create: {
          key,
          value,
          description,
          updatedBy: req.admin.email
        }
      });

      // Emit setting change to admin dashboard
      const io = req.app.get('io');
      io.to('admin-room').emit('setting-updated', { setting });

      logger.info(`App setting updated: ${key} by ${req.admin.email}`);
      res.json({ setting });
    } catch (error) {
      logger.error('Error updating app setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
);

// Get carousel images with time-based filtering
router.get('/carousel-images', async (req, res) => {
  try {
    const now = new Date();
    const carouselImages = await prisma.carouselImage.findMany({
      where: {
        isActive: true,
        OR: [
          { startTime: null, endTime: null }, // Always active
          { startTime: { lte: now }, endTime: null }, // Started, no end
          { startTime: null, endTime: { gte: now } }, // No start, not ended
          { startTime: { lte: now }, endTime: { gte: now } } // Within time range
        ]
      },
      include: {
        channel: {
          select: { id: true, name: true, logo: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ images: carouselImages });
  } catch (error) {
    logger.error('Error fetching carousel images:', error);
    res.status(500).json({ error: 'Failed to fetch carousel images' });
  }
});

// Create carousel image with enhanced features
router.post('/carousel-images',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('subtitle').notEmpty().withMessage('Subtitle is required'),
    body('image').isURL().withMessage('Valid image URL is required'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a positive integer'),
    body('startTime').optional().isISO8601().withMessage('Start time must be a valid date'),
    body('endTime').optional().isISO8601().withMessage('End time must be a valid date'),
    body('channelId').optional().isString(),
    body('actionType').optional().isIn(['channel', 'external', 'none']).withMessage('Invalid action type'),
    body('actionUrl').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, subtitle, image, order = 0, startTime, endTime, channelId, actionType, actionUrl } = req.body;

      const carouselImage = await prisma.carouselImage.create({
        data: {
          title,
          subtitle,
          image,
          order,
          isActive: true,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          channelId,
          actionType,
          actionUrl
        }
      });

      // Emit real-time update to user apps
      const io = req.app.get('io');
      io.emit('carousel-updated', { type: 'created', image: carouselImage });

      logger.info(`Carousel image created: ${title} by ${req.admin.email}`);
      res.status(201).json({ image: carouselImage });
    } catch (error) {
      logger.error('Error creating carousel image:', error);
      res.status(500).json({ error: 'Failed to create carousel image' });
    }
  }
);

// Update carousel image with enhanced features
router.put('/carousel-images/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const imageId = req.params.id;
      const { title, subtitle, image, order, isActive, startTime, endTime, channelId, actionType, actionUrl } = req.body;

      const carouselImage = await prisma.carouselImage.update({
        where: { id: imageId },
        data: {
          ...(title && { title }),
          ...(subtitle && { subtitle }),
          ...(image && { image }),
          ...(order !== undefined && { order }),
          ...(isActive !== undefined && { isActive }),
          ...(startTime !== undefined && { startTime: startTime ? new Date(startTime) : null }),
          ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
          ...(channelId !== undefined && { channelId }),
          ...(actionType !== undefined && { actionType }),
          ...(actionUrl !== undefined && { actionUrl })
        }
      });

      // Emit real-time update to user apps
      const io = req.app.get('io');
      io.emit('carousel-updated', { type: 'updated', image: carouselImage });

      logger.info(`Carousel image updated: ${imageId} by ${req.admin.email}`);
      res.json({ image: carouselImage });
    } catch (error) {
      logger.error('Error updating carousel image:', error);
      res.status(500).json({ error: 'Failed to update carousel image' });
    }
  }
);

// Delete carousel image
router.delete('/carousel-images/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const imageId = req.params.id;

      await prisma.carouselImage.delete({
        where: { id: imageId }
      });

      // Emit real-time update to user apps
      const io = req.app.get('io');
      io.emit('carousel-updated', { type: 'deleted', imageId });

      logger.info(`Carousel image deleted: ${imageId} by ${req.admin.email}`);
      res.json({ message: 'Carousel image deleted successfully' });
    } catch (error) {
      logger.error('Error deleting carousel image:', error);
      res.status(500).json({ error: 'Failed to delete carousel image' });
    }
  }
);

// Get contact settings (public endpoint for user app)
router.get('/contact-settings/public', async (req, res) => {
  try {
    const contactSettings = await prisma.contactSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        whatsappNumber: true,
        callNumber: true,
        supportEmail: true
      }
    });

    res.json({ 
      contactSettings: contactSettings || {
        whatsappNumber: null,
        callNumber: null,
        supportEmail: null
      }
    });
  } catch (error) {
    logger.error('Error fetching public contact settings:', error);
    res.status(500).json({ error: 'Failed to fetch contact settings' });
  }
});

// Get contact settings (admin only)
router.get('/contact-settings', async (req, res) => {
  try {
    const contactSettings = await prisma.contactSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ 
      contactSettings: contactSettings || {
        whatsappNumber: null,
        callNumber: null,
        supportEmail: null
      }
    });
  } catch (error) {
    logger.error('Error fetching contact settings:', error);
    res.status(500).json({ error: 'Failed to fetch contact settings' });
  }
});

// Update contact settings
router.put('/contact-settings',
  authMiddleware,
  adminOnly,
  [
    body('whatsappNumber').optional().isString(),
    body('callNumber').optional().isString(),
    body('supportEmail').optional().isEmail()
  ],
  async (req, res) => {
    try {
      const { whatsappNumber, callNumber, supportEmail } = req.body;

      // Find existing settings or create new
      let contactSettings = await prisma.contactSettings.findFirst({
        where: { isActive: true }
      });

      if (contactSettings) {
        contactSettings = await prisma.contactSettings.update({
          where: { id: contactSettings.id },
          data: {
            whatsappNumber,
            callNumber,
            supportEmail,
            updatedBy: req.admin.email
          }
        });
      } else {
        contactSettings = await prisma.contactSettings.create({
          data: {
            whatsappNumber,
            callNumber,
            supportEmail,
            updatedBy: req.admin.email,
            isActive: true
          }
        });
      }

      // Emit setting change to admin dashboard
      const io = req.app.get('io');
      io.to('admin-room').emit('contact-settings-updated', { contactSettings });

      logger.info(`Contact settings updated by ${req.admin.email}`);
      res.json({ contactSettings });
    } catch (error) {
      logger.error('Error updating contact settings:', error);
      res.status(500).json({ error: 'Failed to update contact settings' });
    }
  }
);

// Duplicate free trial routes removed - now properly positioned before :id route

// Get all users with enhanced details
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { uniqueUserId: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { deviceId: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status === 'active' && { isActivated: true }),
      ...(status === 'inactive' && { isActivated: false }),
      ...(status === 'blocked' && { isBlocked: true })
    };

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          deviceId: true,
          email: true,
          phoneNumber: true,
          uniqueUserId: true,
          isActivated: true,
          isBlocked: true,
          accessLevel: true,
          remainingTime: true,
          points: true,
          lastActive: true,
          createdAt: true,
          activatedAt: true,
          activatedBy: true,
          blockedAt: true,
          blockedBy: true,
          blockReason: true,
          totalWatchTime: true,
          _count: {
            select: {
              watchHistory: true,
              notifications: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user access and status
router.put('/users/:userId',
  authMiddleware,
  adminOnly,
  [
    body('accessLevel').optional().isIn(['basic', 'premium', 'vip']).withMessage('Invalid access level'),
    body('remainingTime').optional().isInt({ min: 0 }).withMessage('Remaining time must be positive'),
    body('isBlocked').optional().isBoolean(),
    body('blockReason').optional().isString()
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { accessLevel, remainingTime, isBlocked, blockReason, points } = req.body;

      // Get user before update for comparison
      const userBefore = await prisma.user.findUnique({
        where: { id: userId },
        select: { isBlocked: true, accessLevel: true, points: true }
      });

      const updateData = {
        ...(accessLevel && { accessLevel }),
        ...(remainingTime !== undefined && { remainingTime: parseInt(remainingTime) }),
        ...(points !== undefined && { points: parseInt(points) }),
        ...(isBlocked !== undefined && {
          isBlocked,
          ...(isBlocked && { blockedAt: new Date(), blockedBy: req.admin.email, blockReason }),
          ...(!isBlocked && { blockedAt: null, blockedBy: null, blockReason: null })
        })
      };

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Log audit action
      const clientInfo = getClientInfo(req);
      if (isBlocked !== undefined) {
        await auditLogService.logAdminAction({
          adminId: req.admin.id,
          adminEmail: req.admin.email,
          action: isBlocked ? 'user_block' : 'user_unblock',
          entityType: 'user',
          entityId: userId,
          details: {
            blockReason: isBlocked ? blockReason : null,
            previousStatus: userBefore?.isBlocked,
            newStatus: isBlocked
          },
          ...clientInfo
        });
      } else {
        await auditLogService.logAdminAction({
          adminId: req.admin.id,
          adminEmail: req.admin.email,
          action: 'user_update',
          entityType: 'user',
          entityId: userId,
          details: {
            changes: {
              accessLevel: accessLevel || userBefore?.accessLevel,
              points: points !== undefined ? points : userBefore?.points,
              remainingTime: remainingTime !== undefined ? remainingTime : undefined
            }
          },
          ...clientInfo
        });
      }

      // Emit real-time update to user
      const io = req.app.get('io');
      const updatePayload = {
        accessLevel: user.accessLevel,
        remainingTime: user.remainingTime,
        isBlocked: user.isBlocked,
        points: user.points,
        blockedAt: user.blockedAt,
        blockReason: user.blockReason,
        timestamp: new Date().toISOString()
      };
      
      io.to(`user-${userId}`).emit('account-updated', updatePayload);
      
      // Also broadcast to all admin clients
      io.to('admin-room').emit('user-updated', {
        userId,
        user: updatePayload,
        updatedBy: req.admin.email
      });

      // If user was blocked, send immediate notification
      if (isBlocked === true) {
        io.to(`user-${userId}`).emit('user-blocked', {
          reason: blockReason || 'Account has been blocked by administrator',
          blockedAt: user.blockedAt,
          blockedBy: req.admin.email
        });
      } else if (isBlocked === false && userBefore?.isBlocked) {
        // User was unblocked
        io.to(`user-${userId}`).emit('user-unblocked', {
          message: 'Your account has been unblocked',
          unblockedAt: new Date().toISOString()
        });
      }

      logger.info(`User ${userId} updated by ${req.admin.email}`);
      res.json({ user });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Get featured channels
router.get('/featured-channels', async (req, res) => {
  try {
    const featuredChannels = await prisma.channel.findMany({
      where: {
        isFeatured: true,
        isActive: true
      },
      orderBy: { featuredOrder: 'asc' }
    });

    res.json({ channels: featuredChannels });
  } catch (error) {
    logger.error('Error fetching featured channels:', error);
    res.status(500).json({ error: 'Failed to fetch featured channels' });
  }
});

// Update channel featured status
router.put('/channels/:channelId/featured',
  authMiddleware,
  adminOnly,
  [
    body('isFeatured').isBoolean().withMessage('Featured status is required'),
    body('featuredOrder').optional().isInt({ min: 0 }).withMessage('Featured order must be positive'),
    body('featuredImage').optional().isURL().withMessage('Featured image must be a valid URL'),
    body('featuredTitle').optional().isString(),
    body('featuredDesc').optional().isString()
  ],
  async (req, res) => {
    try {
      const { channelId } = req.params;
      const { isFeatured, featuredOrder, featuredImage, featuredTitle, featuredDesc } = req.body;

      const channel = await prisma.channel.update({
        where: { id: channelId },
        data: {
          isFeatured,
          ...(featuredOrder !== undefined && { featuredOrder }),
          ...(featuredImage !== undefined && { featuredImage }),
          ...(featuredTitle !== undefined && { featuredTitle }),
          ...(featuredDesc !== undefined && { featuredDesc })
        }
      });

      // Emit real-time update to user apps
      const io = req.app.get('io');
      io.emit('featured-channels-updated', { type: 'updated', channel });

      // Emit channel update to all connected clients
      const updatedChannel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          name: true,
          isFeatured: true,
          featuredOrder: true,
          featuredImage: true,
          featuredTitle: true,
          featuredDesc: true
        }
      });
      io.emit('channel-updated', { channel: updatedChannel });
      io.emit('channels-updated', { 
        message: `Kituo "${updatedChannel.name}" kimebadilishwa`,
        action: 'updated',
        channel: updatedChannel 
      });

      logger.info(`Channel ${channelId} featured status updated by ${req.admin.email}`);
      res.json({ channel });
    } catch (error) {
      logger.error('Error updating channel featured status:', error);
      res.status(500).json({ error: 'Failed to update channel featured status' });
    }
  }
);

// Send real-time notification to specific users or all users
router.post('/notifications/send-realtime',
  authMiddleware,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isIn(['general', 'promotion', 'update', 'warning']).withMessage('Invalid notification type'),
    body('targetUsers').optional().isArray().withMessage('Target users must be an array'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
  ],
  async (req, res) => {
    try {
      const { title, message, type = 'general', targetUsers, priority = 'normal' } = req.body;

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          targetUsers: targetUsers || null,
          isActive: true,
          sentAt: new Date()
        }
      });

      // Create user notifications for tracking
      let userNotifications = [];
      if (targetUsers && targetUsers.length > 0) {
        // Send to specific users
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { id: { in: targetUsers } },
              { uniqueUserId: { in: targetUsers } }
            ]
          }
        });

        userNotifications = await Promise.all(
          users.map(user => 
            prisma.userNotification.create({
              data: {
                userId: user.id,
                notificationId: notification.id
              }
            })
          )
        );

        // Emit to specific users
        const io = req.app.get('io');
        users.forEach(user => {
          io.to(`user-${user.id}`).emit('notification', {
            id: notification.id,
            title,
            message,
            type,
            priority,
            createdAt: notification.createdAt
          });
        });
      } else {
        // Send to all users
        const allUsers = await prisma.user.findMany({
          where: { isActivated: true },
          select: { id: true }
        });

        userNotifications = await Promise.all(
          allUsers.map(user => 
            prisma.userNotification.create({
              data: {
                userId: user.id,
                notificationId: notification.id
              }
            })
          )
        );

        // Emit to all connected users
        const io = req.app.get('io');
        io.emit('notification', {
          id: notification.id,
          title,
          message,
          type,
          priority,
          createdAt: notification.createdAt
        });
      }

      logger.info(`Real-time notification sent by ${req.admin.email}: ${title}`);
      res.json({ 
        notification, 
        sentTo: userNotifications.length,
        message: `Notification sent to ${userNotifications.length} users` 
      });
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

// Get system stats with analytics
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      subscribedUsers,
      totalChannels,
      activeChannels,
      featuredChannels,
      totalNotifications,
      totalViews,
      todayViews,
      todayNewUsers,
      liveChannels,
      recentActivity,
      topChannels,
      freeTrialSetting
    ] = await Promise.all([
      // User stats
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.user.count({ where: { isSubscribed: true } }),
      
      // Channel stats
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.channel.count({ where: { isFeatured: true, isActive: true } }),
      
      // Notification stats
      prisma.notification.count(),
      
      // View stats (total watch history count)
      prisma.watchHistory.count(),
      
      // Today's views
      prisma.watchHistory.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Today's new users
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Live channels (active channels with recent views)
      prisma.channel.findMany({
        where: {
          isActive: true,
          watchHistory: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
              }
            }
          }
        },
        include: {
          _count: {
            select: {
              watchHistory: {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 60 * 1000)
                  }
                }
              }
            }
          }
        },
        take: 10,
        orderBy: {
          watchHistory: {
            _count: 'desc'
          }
        }
      }),
      
      // Recent activity
      prisma.watchHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { deviceId: true, uniqueUserId: true }
          },
          channel: {
            select: { name: true, logo: true }
          }
        }
      }),
      
      // Top channels by views
      prisma.channel.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { watchHistory: true }
          }
        },
        orderBy: {
          watchHistory: {
            _count: 'desc'
          }
        },
        take: 5
      }),
      
      // Free trial setting
      prisma.appSettings.findUnique({
        where: { key: 'free_trial_seconds' }
      })
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        subscribedUsers,
        totalChannels,
        activeChannels,
        featuredChannels,
        totalNotifications,
        totalViews,
        todayViews,
        todayNewUsers,
        liveChannelsCount: liveChannels.length,
        subscriptionRate: totalUsers > 0 ? ((subscribedUsers / totalUsers) * 100).toFixed(1) : 0,
        freeTrialSeconds: freeTrialSetting ? parseInt(freeTrialSetting.value) : 15,
        freeTrialMinutes: freeTrialSetting ? Math.floor(parseInt(freeTrialSetting.value) / 60) : 0
      },
      liveChannels: liveChannels.map(channel => ({
        id: channel.id,
        name: channel.name,
        logo: channel.logo,
        category: channel.category,
        viewers: channel._count.watchHistory,
        isActive: channel.isActive
      })),
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        userId: activity.user?.uniqueUserId || activity.user?.deviceId,
        channelName: activity.channel?.name,
        channelLogo: activity.channel?.logo,
        timestamp: activity.createdAt
      })),
      topChannels: topChannels.map(channel => ({
        id: channel.id,
        name: channel.name,
        logo: channel.logo,
        category: channel.category,
        totalViews: channel._count.watchHistory
      }))
    });
  } catch (error) {
    logger.error('Error fetching system stats:', error);
    
    // If database is not available, return mock data for development
    logger.info('Database unavailable - returning mock stats for development');
    res.json({
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        subscribedUsers: 0,
        totalChannels: 0,
        activeChannels: 0,
        featuredChannels: 0,
        totalNotifications: 0,
        totalViews: 0,
        todayViews: 0,
        todayNewUsers: 0,
        liveChannelsCount: 0,
        subscriptionRate: 0,
        freeTrialSeconds: 15,
        freeTrialMinutes: 0
      },
      liveChannels: [],
      recentActivity: [],
      topChannels: []
    });
  }
});

// DRM preprocessing endpoint for faster client-side processing
router.post('/channels/drm/preprocess', async (req, res) => {
  try {
    const { channelId, drmConfig } = req.body;

    if (!drmConfig || !drmConfig.clearKey) {
      return res.status(400).json({ error: 'Invalid DRM configuration' });
    }

    console.log(`🔐 Processing DRM config for channel: ${channelId}`);

    // Extract and validate keys
    let keyId = drmConfig.keyId || drmConfig.clearKey;
    let key = drmConfig.key || drmConfig.clearKey;

    // Handle comma-separated format
    if (drmConfig.clearKey.includes(',')) {
      const parts = drmConfig.clearKey.split(',');
      keyId = parts[0].trim();
      key = parts[1].trim();
    }

    // Validate hex format
    const validateAndFormatHex = (value) => {
      if (!value) return null;
      
      // Remove any non-hex characters
      let cleaned = value.replace(/[^0-9a-fA-F]/g, '');
      
      // Ensure proper length (32 characters for 128-bit key)
      if (cleaned.length < 32) {
        cleaned = cleaned.padEnd(32, '0');
      } else if (cleaned.length > 32) {
        cleaned = cleaned.substring(0, 32);
      }
      
      return cleaned.toLowerCase();
    };

    const formattedKeyId = validateAndFormatHex(keyId);
    const formattedKey = validateAndFormatHex(key);

    if (!formattedKeyId || !formattedKey) {
      return res.status(400).json({ error: 'Invalid DRM keys format' });
    }

    // Create optimized DRM configuration
    const processedConfig = {
      type: 'clearkey',
      clearkey: {
        keyId: formattedKeyId,
        key: formattedKey,
        contentId: drmConfig.contentId || channelId || 'default',
        licenseUrl: drmConfig.licenseUrl,
        headers: drmConfig.headers || {}
      }
    };

    console.log(`✅ DRM config processed successfully for channel: ${channelId}`);

    res.json({
      success: true,
      processedConfig,
      channelId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('DRM preprocessing error:', error);
    res.status(500).json({ 
      error: 'Failed to process DRM configuration',
      details: error.message 
    });
  }
});

// Get payment requests (multi-network payments)
router.get('/payment-requests', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, networkId } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (networkId) where.networkId = networkId;

    const [paymentRequests, totalCount] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        include: {
          user: {
            select: {
              deviceId: true,
              uniqueUserId: true,
              phoneNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.paymentRequest.count({ where })
    ]);

    res.json({
      paymentRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: skip + limit < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

// Get payment statistics
router.get('/payment-stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get payment statistics
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalRevenue,
      networkStats
    ] = await Promise.all([
      prisma.paymentRequest.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.paymentRequest.count({
        where: { 
          createdAt: { gte: startDate },
          status: 'completed'
        }
      }),
      prisma.paymentRequest.count({
        where: { 
          createdAt: { gte: startDate },
          status: 'failed'
        }
      }),
      prisma.paymentRequest.count({
        where: { 
          createdAt: { gte: startDate },
          status: 'pending'
        }
      }),
      prisma.paymentRequest.aggregate({
        where: { 
          createdAt: { gte: startDate },
          status: 'completed'
        },
        _sum: { amount: true }
      }),
      prisma.paymentRequest.groupBy({
        by: ['networkId', 'networkName'],
        where: { createdAt: { gte: startDate } },
        _count: { _all: true },
        _sum: { amount: true }
      })
    ]);

    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments * 100) : 0;

    res.json({
      period,
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      successRate: Math.round(successRate * 100) / 100,
      totalRevenue: totalRevenue._sum.amount || 0,
      networkStats: networkStats.map(stat => ({
        networkId: stat.networkId,
        networkName: stat.networkName,
        count: stat._count._all,
        revenue: stat._sum.amount || 0
      }))
    });

  } catch (error) {
    logger.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

// Update payment status (manual override)
router.patch('/payment-requests/:transactionId/status', 
  authMiddleware, 
  adminOnly,
  [
    body('status').isIn(['pending', 'processing', 'completed', 'failed', 'cancelled'])
      .withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transactionId } = req.params;
      const { status, reason } = req.body;

      const paymentRequest = await prisma.paymentRequest.findUnique({
        where: { transactionId },
        include: { user: true }
      });

      if (!paymentRequest) {
        return res.status(404).json({ error: 'Payment request not found' });
      }

      // Update payment status
      const updatedPayment = await prisma.paymentRequest.update({
        where: { transactionId },
        data: {
          status,
          completedAt: status === 'completed' ? new Date() : null
        }
      });

      // If manually marking as completed, activate subscription
      if (status === 'completed' && paymentRequest.status !== 'completed') {
        await processSuccessfulPaymentAdmin(paymentRequest, req.app.get('io'));
      }

      // Log admin action
      logger.info(`Admin ${req.admin.email} updated payment ${transactionId} status to ${status}`, {
        reason,
        adminId: req.admin.id,
        transactionId,
        oldStatus: paymentRequest.status,
        newStatus: status
      });

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        payment: updatedPayment
      });

    } catch (error) {
      logger.error('Error updating payment status:', error);
      res.status(500).json({ error: 'Failed to update payment status' });
    }
  }
);

// Process successful payment (admin helper)
async function processSuccessfulPaymentAdmin(paymentRequest, io) {
  try {
    const { user, amount, subscriptionPlan } = paymentRequest;

    // Calculate subscription time
    const subscriptionPlans = {
      'week': 7 * 24 * 60,
      'month': 30 * 24 * 60,
      'year': 365 * 24 * 60
    };

    const timeInMinutes = subscriptionPlans[subscriptionPlan] || subscriptionPlans.month;
    const subscriptionEnd = new Date(Date.now() + timeInMinutes * 60 * 1000);

    // Update user subscription
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isSubscribed: true,
        isActivated: true,
        remainingTime: timeInMinutes,
        subscriptionEnd,
        subscriptionType: subscriptionPlan
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        title: 'Malipo Yamekamilika (Admin)! 🎉',
        message: `Malipo yako ya ${amount.toLocaleString()} TZS yamekamilishwa na msimamizi. Muda wako: ${Math.floor(timeInMinutes / (24 * 60))} siku.`,
        type: 'payment_success',
        targetUsers: [user.id],
        sentAt: new Date()
      }
    });

    // Send real-time notification
    if (io) {
      io.to(`user-${user.id}`).emit('payment-success', {
        message: `Malipo yamekamilika! Muda wako: ${Math.floor(timeInMinutes / (24 * 60))} siku`,
        amount,
        transactionId: paymentRequest.transactionId
      });
    }

    logger.info(`Admin processed payment successfully: ${user.deviceId} - ${paymentRequest.transactionId}`);

  } catch (error) {
    logger.error('Error processing admin payment:', error);
  }
}

// Get supported payment networks
router.get('/payment-networks', authMiddleware, adminOnly, async (req, res) => {
  try {
    const networks = [
      {
        id: 'vodacom_mpesa',
        name: 'Vodacom M-Pesa',
        displayName: 'M-Pesa',
        shortCode: '*150*00#',
        prefixes: ['074', '075', '076', '077'],
        businessNumber: '400200',
        primary: true
      },
      {
        id: 'tigopesa',
        name: 'TigoPesa',
        displayName: 'TigoPesa',
        shortCode: '*150*01#',
        prefixes: ['071', '065', '067'],
        businessNumber: '400200',
        primary: false
      },
      {
        id: 'airtel_money',
        name: 'Airtel Money',
        displayName: 'Airtel Money',
        shortCode: '*150*60#',
        prefixes: ['068', '069', '078'],
        businessNumber: '400200',
        primary: false
      },
      {
        id: 'halopesa',
        name: 'HaloPesa',
        displayName: 'HaloPesa',
        shortCode: '*150*88#',
        prefixes: ['062'],
        businessNumber: '400200',
        primary: false
      }
    ];

    res.json({ networks });

  } catch (error) {
    logger.error('Error fetching payment networks:', error);
    res.status(500).json({ error: 'Failed to fetch payment networks' });
  }
});

// Get audit logs
router.get('/audit-logs',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { 
        adminId, 
        action, 
        entityType, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query;

      const result = await auditLogService.getAuditLogs({
        adminId,
        action,
        entityType,
        startDate,
        endDate,
        page,
        limit
      });

      res.json(result);
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

// Export the router
module.exports = router;
