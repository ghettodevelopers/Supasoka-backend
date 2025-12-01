const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const logger = require('../utils/logger');
const channelAccessService = require('../services/channelAccessService');

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        watchHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { channel: true }
        }
      }
    });

    res.json({ user });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile',
  authMiddleware,
  [
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, phoneNumber } = req.body;
      
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(email && { email }),
          ...(phoneNumber && { phoneNumber })
        }
      });

      res.json({ user });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Subscribe user
router.post('/subscribe',
  [
    body('subscriptionType').notEmpty().withMessage('Subscription type is required'),
    body('timeInMinutes').optional().isInt({ min: 1 }).withMessage('Valid time in minutes required'),
    body('transactionId').optional().notEmpty().withMessage('Transaction ID required for paid subscriptions'),
    body('phoneNumber').optional().notEmpty().withMessage('Phone number required for paid subscriptions')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subscriptionType, timeInMinutes, transactionId, phoneNumber } = req.body;
      
      let subscriptionEnd = null;
      let remainingTime = 0;

      // Handle time-based subscriptions
      if (timeInMinutes) {
        remainingTime = timeInMinutes;
        subscriptionEnd = new Date(Date.now() + timeInMinutes * 60 * 1000);
      } else {
        // Legacy subscription types
        if (subscriptionType === 'monthly') {
          remainingTime = 30 * 24 * 60; // 30 days in minutes
          subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else if (subscriptionType === 'yearly') {
          remainingTime = 365 * 24 * 60; // 365 days in minutes
          subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          isSubscribed: true,
          isActivated: true,
          subscriptionType,
          subscriptionStart: new Date(),
          subscriptionEnd,
          remainingTime,
          ...(phoneNumber && { phoneNumber })
        }
      });

      logger.info(`User subscribed: ${user.deviceId} - ${subscriptionType} - ${remainingTime} minutes`);
      
      // Send notification about successful subscription
      if (transactionId) {
        // Create a notification for successful payment
        await prisma.notification.create({
          data: {
            title: 'Malipo Yamekamilika!',
            message: `Umefanikiwa kulipa kwa huduma za Supasoka. Muda wako: ${Math.floor(remainingTime / (24 * 60))} siku.`,
            type: 'subscription',
            targetUsers: JSON.stringify([req.user.id]),
            sentAt: new Date()
          }
        });

        await prisma.userNotification.create({
          data: {
            userId: req.user.id,
            notificationId: (await prisma.notification.findFirst({
              where: { targetUsers: { array_contains: [req.user.id] } },
              orderBy: { createdAt: 'desc' }
            })).id
          }
        });
      }

      res.json({ 
        user, 
        message: 'Subscription activated successfully',
        remainingTime,
        subscriptionEnd
      });
    } catch (error) {
      logger.error('Error subscribing user:', error);
      res.status(500).json({ error: 'Failed to activate subscription' });
    }
  }
);

// Get user watch history (aggregated by channel)
router.get('/watch-history', async (req, res) => {
  try {
    // Get watch history grouped by channel with count
    const watchHistory = await prisma.watchHistory.groupBy({
      by: ['channelId'],
      where: { userId: req.user?.id },
      _count: {
        channelId: true
      },
      orderBy: {
        _count: {
          channelId: 'desc'
        }
      },
      take: 10
    });

    // Get channel details for each entry
    const historyWithChannels = await Promise.all(
      watchHistory.map(async (item) => {
        const channel = await prisma.channel.findUnique({
          where: { id: item.channelId },
          select: { name: true, logo: true }
        });
        return {
          channelName: channel?.name || 'Unknown',
          watchCount: item._count.channelId,
          logo: channel?.logo
        };
      })
    );

    res.json({
      success: true,
      history: historyWithChannels
    });
  } catch (error) {
    logger.error('Error fetching watch history:', error);
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

// Get user points history
router.get('/points-history', async (req, res) => {
  try {
    const pointsHistory = await prisma.pointsHistory.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        points: true,
        type: true,
        description: true,
        createdAt: true
      }
    });

    // Format dates
    const formattedHistory = pointsHistory.map(item => {
      const date = new Date(item.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateLabel;
      if (date.toDateString() === today.toDateString()) {
        dateLabel = 'Leo';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Jana';
      } else {
        dateLabel = date.toLocaleDateString('sw-TZ', { month: 'short', day: 'numeric' });
      }

      return {
        date: dateLabel,
        points: item.points,
        type: item.type,
        description: item.description
      };
    });

    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    logger.error('Error fetching points history:', error);
    res.status(500).json({ error: 'Failed to fetch points history' });
  }
});

// Admin: Get users stats
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const [total, active, subscribed] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.user.count({ where: { isSubscribed: true } })
    ]);

    res.json({
      total,
      active,
      subscribed,
      inactive: total - active
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Admin: Get all users
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, subscribed } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
          { deviceId: { contains: search } }
        ]
      }),
      ...(subscribed !== undefined && { isSubscribed: subscribed === 'true' })
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        _count: {
          select: {
            watchHistory: true,
            downloads: true
          }
        }
      }
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Get user details
router.get('/admin/:id', adminOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        watchHistory: {
          include: { channel: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        downloads: {
          include: { channel: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Admin: Update user subscription
router.patch('/admin/:id/subscription', adminOnly, async (req, res) => {
  try {
    const { isSubscribed, subscriptionType } = req.body;
    const userId = req.params.id;

    let updateData = { isSubscribed };
    
    if (isSubscribed && subscriptionType) {
      let subscriptionEnd = null;
      if (subscriptionType === 'monthly') {
        subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else if (subscriptionType === 'yearly') {
        subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      updateData = {
        ...updateData,
        subscriptionType,
        subscriptionStart: new Date(),
        subscriptionEnd
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    logger.info(`User subscription updated by admin: ${user.deviceId}`);
    res.json({ user });
  } catch (error) {
    logger.error('Error updating user subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Admin: Activate user account with time (Enhanced with real-time updates)
router.patch('/admin/:uniqueUserId/activate', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { uniqueUserId } = req.params;
    const { timeInMinutes, timeUnit = 'minutes', accessLevel = 'premium', days = 0, hours = 0, minutes = 0, seconds = 0 } = req.body;

    let finalTimeInMinutes = 0;
    let accessExpiresAt = null;

    // Enhanced time calculation - support days, hours, minutes, seconds input
    if (days || hours || minutes || seconds) {
      const totalSeconds = (parseInt(days) || 0) * 24 * 60 * 60 + 
                          (parseInt(hours) || 0) * 60 * 60 + 
                          (parseInt(minutes) || 0) * 60 +
                          (parseInt(seconds) || 0);
      finalTimeInMinutes = Math.ceil(totalSeconds / 60); // Convert to minutes
    } else if (timeInMinutes) {
      // Convert time based on unit (legacy support)
      if (timeUnit === 'hours') {
        finalTimeInMinutes = timeInMinutes * 60;
      } else if (timeUnit === 'days') {
        finalTimeInMinutes = timeInMinutes * 24 * 60;
      } else if (timeUnit === 'permanent') {
        finalTimeInMinutes = 999999999; // Very large number for permanent access
        accessExpiresAt = null; // Permanent access
      } else {
        finalTimeInMinutes = timeInMinutes;
      }
    }

    if (finalTimeInMinutes <= 0) {
      return res.status(400).json({ error: 'Valid time required (days, hours, or minutes)' });
    }

    // Calculate expiry date for non-permanent access
    if (timeUnit !== 'permanent') {
      accessExpiresAt = new Date(Date.now() + finalTimeInMinutes * 60 * 1000);
    }

    const user = await prisma.user.update({
      where: { uniqueUserId },
      data: {
        isActivated: true,
        isSubscribed: true,
        isBlocked: false,
        subscriptionType: 'admin_activated',
        subscriptionStart: new Date(),
        remainingTime: finalTimeInMinutes,
        accessLevel,
        accessExpiresAt,
        activatedBy: req.admin.email,
        activatedAt: new Date()
      }
    });

    // Real-time notification to user
    const io = req.app.get('io');
    const timeDisplay = (days || hours || minutes || seconds) ? 
      `${days || 0}d ${hours || 0}h ${minutes || 0}m ${seconds || 0}s` : 
      `${timeInMinutes} ${timeUnit}`;
    
    console.log('✅ User activation successful:', {
      uniqueUserId,
      finalTimeInMinutes,
      timeDisplay,
      accessLevel
    });
    
    // Send real-time notification to user
    io.to(`user-${user.id}`).emit('account-activated', {
      message: `Akaunti yako imewashwa na msimamizi! Muda: ${timeDisplay}`,
      remainingTime: finalTimeInMinutes,
      accessLevel,
      expiresAt: accessExpiresAt
    });

    // Send notification to admin dashboard
    io.to('admin-room').emit('user-activated', {
      user,
      activatedBy: req.admin.email,
      timeAllocated: timeDisplay
    });

    // Create system notification
    try {
      const notification = await prisma.notification.create({
        data: {
          title: 'Akaunti Imewashwa! 🎉',
          message: `Akaunti yako imewashwa na msimamizi. Muda wako: ${timeDisplay}. Furahia kutazama!`,
          type: 'admin_activation',
          targetUsers: JSON.stringify([user.id]), // Convert array to JSON string
          sentAt: new Date()
        }
      });
      
      // Create UserNotification record for the user
      await prisma.userNotification.create({
        data: {
          userId: user.id,
          notificationId: notification.id,
          deliveredAt: new Date()
        }
      });
      
      logger.info(`✅ Notification created for user activation: ${user.uniqueUserId}`);
    } catch (notifError) {
      logger.error('Error creating notification:', notifError);
      // Don't fail the whole activation if notification fails
    }

    logger.info(`✅ User activated by admin: ${user.uniqueUserId} - ${finalTimeInMinutes} minutes (${timeDisplay}) by ${req.admin.email}`);
    res.json({ 
      user, 
      message: `User activated with ${timeDisplay}`,
      accessLevel,
      expiresAt: accessExpiresAt,
      timeAllocated: {
        days: parseInt(days) || Math.floor(finalTimeInMinutes / (24 * 60)),
        hours: parseInt(hours) || Math.floor((finalTimeInMinutes % (24 * 60)) / 60),
        minutes: parseInt(minutes) || finalTimeInMinutes % 60,
        seconds: parseInt(seconds) || 0,
        totalMinutes: finalTimeInMinutes,
        timeDisplay
      }
    });
  } catch (error) {
    logger.error('Error activating user:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Admin: Block/Unblock user
router.patch('/admin/:uniqueUserId/block', adminOnly, async (req, res) => {
  try {
    const { uniqueUserId } = req.params;
    const { isBlocked, blockReason } = req.body;

    const user = await prisma.user.update({
      where: { uniqueUserId },
      data: {
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
        blockedBy: isBlocked ? req.user.id : null,
        blockReason: isBlocked ? blockReason : null
      }
    });

    logger.info(`User ${isBlocked ? 'blocked' : 'unblocked'} by admin: ${user.uniqueUserId}`);
    res.json({ 
      user, 
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`
    });
  } catch (error) {
    logger.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to update user block status' });
  }
});

// Admin: Update user access level
router.patch('/admin/:uniqueUserId/access-level', adminOnly, async (req, res) => {
  try {
    const { uniqueUserId } = req.params;
    const { accessLevel, timeInMinutes, timeUnit = 'minutes' } = req.body;

    let finalTimeInMinutes = timeInMinutes || 0;
    let accessExpiresAt = null;

    if (timeInMinutes) {
      // Convert time based on unit
      if (timeUnit === 'hours') {
        finalTimeInMinutes = timeInMinutes * 60;
      } else if (timeUnit === 'days') {
        finalTimeInMinutes = timeInMinutes * 24 * 60;
      } else if (timeUnit === 'permanent') {
        finalTimeInMinutes = 999999999;
        accessExpiresAt = null;
      } else {
        accessExpiresAt = new Date(Date.now() + finalTimeInMinutes * 60 * 1000);
      }
    }

    const user = await prisma.user.update({
      where: { uniqueUserId },
      data: {
        accessLevel,
        ...(finalTimeInMinutes > 0 && { remainingTime: finalTimeInMinutes }),
        ...(accessExpiresAt !== undefined && { accessExpiresAt })
      }
    });

    logger.info(`User access level updated by admin: ${user.uniqueUserId} - ${accessLevel}`);
    res.json({ 
      user, 
      message: `User access level updated to ${accessLevel}`
    });
  } catch (error) {
    logger.error('Error updating user access level:', error);
    res.status(500).json({ error: 'Failed to update user access level' });
  }
});

// Admin: Find user by unique ID
router.get('/admin/find/:uniqueUserId', adminOnly, async (req, res) => {
  try {
    const { uniqueUserId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { uniqueUserId },
      include: {
        pointsHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        adViews: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error finding user:', error);
    res.status(500).json({ error: 'Failed to find user' });
  }
});

// Update remaining time (called during video playback)
router.patch('/time/update', async (req, res) => {
  try {
    const { minutesUsed } = req.body;
    
    if (!minutesUsed || minutesUsed <= 0) {
      return res.status(400).json({ error: 'Valid minutes used required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newRemainingTime = Math.max(0, user.remainingTime - minutesUsed);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        remainingTime: newRemainingTime,
        totalWatchTime: user.totalWatchTime + minutesUsed,
        lastActive: new Date()
      }
    });

    res.json({ 
      user: updatedUser,
      timeExpired: newRemainingTime === 0
    });
  } catch (error) {
    logger.error('Error updating time:', error);
    res.status(500).json({ error: 'Failed to update time' });
  }
});

// Get user points and history
router.get('/points', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        pointsHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    res.json({ 
      points: user.points,
      history: user.pointsHistory
    });
  } catch (error) {
    logger.error('Error fetching points:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// Spend points for channel access
router.post('/points/spend', async (req, res) => {
  try {
    const { pointsToSpend, channelId } = req.body;
    const requiredPoints = 150; // Points needed for one view

    if (pointsToSpend !== requiredPoints) {
      return res.status(400).json({ error: `${requiredPoints} points required` });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (user.points < requiredPoints) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        required: requiredPoints,
        current: user.points
      });
    }

    // Update user points and create history record
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { points: user.points - requiredPoints }
      }),
      prisma.pointsHistory.create({
        data: {
          userId: req.user.id,
          points: -requiredPoints,
          type: 'spent',
          description: `Spent ${requiredPoints} points for channel access`
        }
      })
    ]);

    logger.info(`User spent ${requiredPoints} points: ${user.deviceId}`);
    res.json({ 
      user: updatedUser,
      message: `${requiredPoints} points spent successfully`
    });
  } catch (error) {
    logger.error('Error spending points:', error);
    res.status(500).json({ error: 'Failed to spend points' });
  }
});

// Record ad view and award points
router.post('/ads/view', async (req, res) => {
  try {
    const { adId, adType, duration, completed = true } = req.body;
    const pointsEarned = completed ? 10 : 0; // 10 points for completed ad

    if (!completed) {
      return res.status(400).json({ error: 'Ad must be completed to earn points' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Update user points and create records
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { points: user.points + pointsEarned }
      }),
      prisma.adView.create({
        data: {
          userId: req.user.id,
          adId: adId || `ad_${Date.now()}`,
          adType,
          pointsEarned,
          duration,
          completed
        }
      }),
      prisma.pointsHistory.create({
        data: {
          userId: req.user.id,
          points: pointsEarned,
          type: 'ad_view',
          description: `Earned ${pointsEarned} points from ${adType} ad`,
          adId: adId || `ad_${Date.now()}`
        }
      })
    ]);

    logger.info(`User earned ${pointsEarned} points from ad: ${user.deviceId}`);
    res.json({ 
      user: updatedUser,
      pointsEarned,
      message: `Earned ${pointsEarned} points!`
    });
  } catch (error) {
    logger.error('Error recording ad view:', error);
    res.status(500).json({ error: 'Failed to record ad view' });
  }
});

// Get available ads
router.get('/ads/available', async (req, res) => {
  try {
    const ads = await prisma.advertisement.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    res.json({ ads });
  } catch (error) {
    logger.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Multi-network payment initiation endpoint
router.post('/payment/initiate', authMiddleware, async (req, res) => {
  try {
    const {
      networkId,
      phoneNumber,
      amount,
      subscriptionPlan,
      userId
    } = req.body;

    // Validate required fields
    if (!networkId || !phoneNumber || !amount || !subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Taarifa zinazohitajika hazikutolewa: networkId, phoneNumber, amount, subscriptionPlan'
      });
    }

    // Validate network
    const supportedNetworks = ['vodacom_mpesa', 'tigopesa', 'airtel_money', 'halopesa'];
    if (!supportedNetworks.includes(networkId)) {
      return res.status(400).json({
        success: false,
        message: 'Mtandao haupatikani. Tumia: ' + supportedNetworks.join(', ')
      });
    }

    // Validate phone number format
    const phoneRegex = /^(255|0)?[678][0-9]{8}$/;
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Namba ya simu si sahihi. Tumia mfano: 0712345678'
      });
    }

    // Validate amount
    if (amount < 500 || amount > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Kiasi cha malipo kinapaswa kuwa kati ya TZS 500 na TZS 1,000,000'
      });
    }

    // Generate unique transaction ID
    const transactionId = `SUP${Date.now()}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

    // Get network details
    const networkDetails = {
      vodacom_mpesa: { name: 'Vodacom M-Pesa', displayName: 'M-Pesa', businessNumber: '400200' },
      tigopesa: { name: 'TigoPesa', displayName: 'TigoPesa', businessNumber: '400200' },
      airtel_money: { name: 'Airtel Money', displayName: 'Airtel Money', businessNumber: '400200' },
      halopesa: { name: 'HaloPesa', displayName: 'HaloPesa', businessNumber: '400200' }
    };

    const network = networkDetails[networkId];

    // Store payment request in database
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        transactionId,
        userId: req.user.id,
        networkId,
        networkName: network.name,
        phoneNumber: cleanPhone,
        amount: parseFloat(amount),
        subscriptionPlan,
        status: 'pending',
        createdAt: new Date()
      }
    });

    // Log payment initiation
    logger.info(`Payment initiated: ${transactionId} - ${network.displayName} - ${amount} TZS`);

    // Send real-time notification to admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('payment-initiated', {
        transactionId,
        user: {
          deviceId: req.user.deviceId,
          uniqueUserId: req.user.uniqueUserId
        },
        network: network.displayName,
        amount,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      transactionId,
      message: `Ombi la malipo limetumwa kwa ${network.displayName}. Fuata maagizo kwenye simu yako.`,
      network: network.displayName,
      amount,
      instructions: getPaymentInstructions(networkId, amount)
    });

  } catch (error) {
    logger.error('Error initiating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Tatizo la kimtandao. Tafadhali jaribu tena.',
      error: error.message
    });
  }
});

// Get payment instructions helper function
function getPaymentInstructions(networkId, amount) {
  const instructions = {
    vodacom_mpesa: {
      title: 'Maagizo ya M-Pesa',
      steps: [
        '1. Bonyeza *150*00# kwenye simu yako',
        '2. Chagua "Lipa kwa M-Pesa"',
        '3. Chagua "Buy Goods and Services"',
        '4. Ingiza namba ya biashara: 400200',
        `5. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
        '6. Ingiza PIN yako ya M-Pesa',
        '7. Thibitisha malipo'
      ],
      alternative: `Au tumia: *150*00*400200*${amount}#`
    },
    tigopesa: {
      title: 'Maagizo ya TigoPesa',
      steps: [
        '1. Bonyeza *150*01# kwenye simu yako',
        '2. Chagua "Lipa Bili"',
        '3. Chagua "Lipa kwa Namba ya Biashara"',
        '4. Ingiza namba ya biashara: 400200',
        `5. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
        '6. Ingiza PIN yako ya TigoPesa',
        '7. Thibitisha malipo'
      ],
      alternative: `Au tumia: *150*01*1*400200*${amount}#`
    },
    airtel_money: {
      title: 'Maagizo ya Airtel Money',
      steps: [
        '1. Bonyeza *150*60# kwenye simu yako',
        '2. Chagua "Lipa Bili"',
        '3. Chagua "Malipo ya Biashara"',
        '4. Ingiza namba ya biashara: 400200',
        `5. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
        '6. Ingiza PIN yako ya Airtel Money',
        '7. Thibitisha malipo'
      ],
      alternative: `Au tumia: *150*60*1*400200*${amount}#`
    },
    halopesa: {
      title: 'Maagizo ya HaloPesa',
      steps: [
        '1. Bonyeza *150*88# kwenye simu yako',
        '2. Chagua "Lipa Bili"',
        '3. Chagua "Lipa kwa Namba ya Biashara"',
        '4. Ingiza namba ya biashara: 400200',
        `5. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
        '6. Ingiza PIN yako ya HaloPesa',
        '7. Thibitisha malipo'
      ],
      alternative: `Au tumia: *150*88*1*400200*${amount}#`
    }
  };

  return instructions[networkId] || instructions.vodacom_mpesa;
}

// Check payment status for multi-network payments
router.get('/payment/status/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find payment request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { transactionId },
      include: {
        user: {
          select: {
            id: true,
            deviceId: true,
            uniqueUserId: true,
            isSubscribed: true,
            remainingTime: true
          }
        }
      }
    });

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Ombi la malipo halijapatikana'
      });
    }

    // Check if payment belongs to requesting user
    if (paymentRequest.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Hauruhusiwi kuangalia hali ya malipo haya'
      });
    }

    res.json({
      success: true,
      transactionId,
      status: paymentRequest.status,
      networkName: paymentRequest.networkName,
      amount: paymentRequest.amount,
      createdAt: paymentRequest.createdAt,
      completedAt: paymentRequest.completedAt,
      message: getStatusMessage(paymentRequest.status)
    });

  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Tatizo la kuangalia hali ya malipo'
    });
  }
});

// Get status message helper
function getStatusMessage(status) {
  const messages = {
    pending: 'Malipo yanasubiri uthibitisho',
    processing: 'Malipo yanachakatwa',
    completed: 'Malipo yamekamilika',
    failed: 'Malipo yameshindikana',
    cancelled: 'Malipo yameghairiwa'
  };
  return messages[status] || 'Hali isiyojulikana';
}

// Payment callback endpoint for mobile money providers
router.post('/payment/callback', async (req, res) => {
  try {
    const {
      transactionId,
      status,
      amount,
      phoneNumber,
      reference,
      networkId
    } = req.body;

    logger.info('Payment callback received:', req.body);

    // Find payment request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { transactionId },
      include: { user: true }
    });

    if (!paymentRequest) {
      logger.error('Payment request not found:', transactionId);
      return res.status(404).json({ error: 'Payment request not found' });
    }

    // Update payment status
    const updatedPayment = await prisma.paymentRequest.update({
      where: { transactionId },
      data: {
        status: status.toLowerCase(),
        reference,
        completedAt: status.toLowerCase() === 'completed' ? new Date() : null
      }
    });

    // If payment successful, activate subscription
    if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'success') {
      await processSuccessfulPayment(paymentRequest, req.app.get('io'));
    }

    res.json({ success: true, message: 'Callback processed' });

  } catch (error) {
    logger.error('Error processing payment callback:', error);
    res.status(500).json({ error: 'Failed to process callback' });
  }
});

// Process successful payment helper
async function processSuccessfulPayment(paymentRequest, io) {
  try {
    const { user, amount, subscriptionPlan } = paymentRequest;

    // Calculate subscription time based on plan
    const subscriptionPlans = {
      'week': 7 * 24 * 60, // 7 days in minutes
      'month': 30 * 24 * 60, // 30 days in minutes
      'year': 365 * 24 * 60 // 365 days in minutes
    };

    const timeInMinutes = subscriptionPlans[subscriptionPlan] || subscriptionPlans.month;
    const subscriptionEnd = new Date(Date.now() + timeInMinutes * 60 * 1000);

    // Update user subscription
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isSubscribed: true,
        isActivated: true,
        remainingTime: timeInMinutes,
        subscriptionEnd,
        subscriptionType: subscriptionPlan
      }
    });

    // Create success notification
    await prisma.notification.create({
      data: {
        title: 'Malipo Yamekamilika! ',
        message: `Umefanikiwa kulipa ${amount.toLocaleString()} TZS. Muda wako: ${Math.floor(timeInMinutes / (24 * 60))} siku. Furahia kutazama!`,
        type: 'payment_success',
        targetUsers: JSON.stringify([user.id]),
        sentAt: new Date()
      }
    });

    // Send real-time notifications
    if (io) {
      io.to(`user-${user.id}`).emit('payment-success', {
        message: `Malipo yamekamilika! Muda wako: ${Math.floor(timeInMinutes / (24 * 60))} siku`,
        amount,
        transactionId: paymentRequest.transactionId
      });

      io.to('admin-room').emit('payment-completed', {
        user: {
          deviceId: user.deviceId,
          uniqueUserId: user.uniqueUserId
        },
        payment: {
          transactionId: paymentRequest.transactionId,
          amount,
          networkName: paymentRequest.networkName
        },
        timestamp: new Date()
      });
    }

    logger.info(`Payment completed successfully: ${user.deviceId} - ${paymentRequest.transactionId}`);

  } catch (error) {
    logger.error('Error processing successful payment:', error);
  }
}

// Process payment success and activate subscription
router.post('/payment/success', async (req, res) => {
  try {
    const { 
      transactionId, 
      phoneNumber, 
      amount, 
      bundleType, 
      bundleDays,
      paymentMethod,
      reference 
    } = req.body;

    if (!transactionId || !phoneNumber || !amount || !bundleType) {
      return res.status(400).json({ 
        error: 'Missing required payment data',
        required: ['transactionId', 'phoneNumber', 'amount', 'bundleType']
      });
    }

    // Calculate time based on bundle
    let timeInMinutes = 0;
    let subscriptionType = bundleType;
    
    switch (bundleType) {
      case 'week':
        timeInMinutes = 7 * 24 * 60; // 7 days in minutes
        break;
      case 'month':
        timeInMinutes = 30 * 24 * 60; // 30 days in minutes
        break;
      case 'year':
        timeInMinutes = 365 * 24 * 60; // 365 days in minutes
        break;
      default:
        if (bundleDays) {
          timeInMinutes = bundleDays * 24 * 60;
        } else {
          return res.status(400).json({ error: 'Invalid bundle type' });
        }
    }

    const subscriptionEnd = new Date(Date.now() + timeInMinutes * 60 * 1000);

    // Update user with subscription
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isSubscribed: true,
        isActivated: true,
        subscriptionType,
        subscriptionStart: new Date(),
        subscriptionEnd,
        remainingTime: timeInMinutes,
        phoneNumber,
        lastActive: new Date()
      }
    });

    // Create payment success notification
    const notification = await prisma.notification.create({
      data: {
        title: 'Malipo Yamekamilika! ',
        message: `Umefanikiwa kulipa ${amount.toLocaleString()} TZS kwa huduma za Supasoka. Muda wako: ${Math.floor(timeInMinutes / (24 * 60))} siku. Furahia kutazama!`,
        type: 'payment_success',
        targetUsers: JSON.stringify([req.user.id]),
        sentAt: new Date()
      }
    });

    await prisma.userNotification.create({
      data: {
        userId: req.user.id,
        notificationId: notification.id
      }
    });

    // Send real-time notification to user
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('payment-success', {
      message: `Malipo yamekamilika! Muda wako: ${Math.floor(timeInMinutes / (24 * 60))} siku`,
      amount,
      transactionId,
      subscriptionEnd,
      remainingTime: timeInMinutes
    });

    // Send notification to admin dashboard
    io.to('admin-room').emit('payment-received', {
      user: {
        deviceId: user.deviceId,
        uniqueUserId: user.uniqueUserId
      },
      payment: {
        transactionId,
        amount,
        bundleType,
        paymentMethod
      },
      timestamp: new Date()
    });

    console.log(' Payment success notification sent:', {
      userId: req.user.id,
      transactionId,
      amount,
      timeInMinutes
    });

    logger.info(`Payment processed successfully: ${user.deviceId} - ${transactionId} - ${timeInMinutes} minutes`);
    
    res.json({ 
      success: true,
      user, 
      message: 'Payment processed successfully',
      subscription: {
        type: subscriptionType,
        remainingTime: timeInMinutes,
        expiresAt: subscriptionEnd,
        daysRemaining: Math.floor(timeInMinutes / (24 * 60))
      },
      payment: {
        transactionId,
        amount,
        method: paymentMethod,
        reference
      }
    });
  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process payment',
      details: error.message 
    });
  }
});

// Process payment failure
router.post('/payment/failed', authMiddleware, async (req, res) => {
  try {
    const { 
      transactionId, 
      phoneNumber, 
      amount, 
      bundleType,
      errorMessage,
      errorCode,
      paymentMethod 
    } = req.body;

    console.log(' Payment failed:', {
      userId: req.user.id,
      transactionId,
      errorMessage,
      errorCode
    });

    // Create payment failure notification
    const notification = await prisma.notification.create({
      data: {
        title: 'Malipo Yameshindikana ',
        message: `Malipo ya ${amount ? amount.toLocaleString() : 'huduma'} TZS yameshindikana. ${errorMessage || 'Jaribu tena au wasiliana na huduma kwa wateja.'}`,
        type: 'payment_failed',
        targetUsers: JSON.stringify([req.user.id]),
        sentAt: new Date()
      }
    });

    await prisma.userNotification.create({
      data: {
        userId: req.user.id,
        notificationId: notification.id
      }
    });

    // Send real-time notification to user
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('payment-failed', {
      message: `Malipo yameshindikana. ${errorMessage || 'Jaribu tena.'}`,
      transactionId,
      errorCode,
      errorMessage
    });

    // Send notification to admin dashboard
    io.to('admin-room').emit('payment-failed', {
      user: {
        deviceId: req.user?.deviceId,
        uniqueUserId: req.user?.uniqueUserId
      },
      payment: {
        transactionId,
        amount,
        bundleType,
        paymentMethod,
        errorMessage,
        errorCode
      },
      timestamp: new Date()
    });

    logger.warn(`Payment failed: ${req.user?.deviceId} - ${transactionId} - ${errorMessage}`);
    
    res.json({ 
      success: false,
      message: 'Payment failure recorded',
      notification: {
        title: notification.title,
        message: notification.message
      }
    });
  } catch (error) {
    logger.error('Error recording payment failure:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to record payment failure',
      details: error.message 
    });
  }
});

// Check channel access
router.get('/channels/:channelId/access', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const accessCheck = await channelAccessService.checkChannelAccess(userId, channelId);
    
    res.json(accessCheck);
  } catch (error) {
    logger.error('Error checking channel access:', error);
    res.status(500).json({ error: 'Failed to check channel access' });
  }
});

// Grant channel access with points
router.post('/channels/:channelId/access/points', 
  authMiddleware,
  [
    body('pointsCost').optional().isInt({ min: 1 }).withMessage('Points cost must be positive')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { channelId } = req.params;
      const userId = req.user.id;
      const pointsCost = req.body.pointsCost || 100;

      const result = await channelAccessService.grantPointsAccess(userId, channelId, pointsCost);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`user-${userId}`).emit('points-access-granted', {
        channelId,
        sessionId: result.sessionId,
        pointsSpent: pointsCost,
        remainingPoints: result.remainingPoints
      });

      res.json(result);
    } catch (error) {
      logger.error('Error granting points access:', error);
      res.status(500).json({ error: 'Failed to grant points access' });
    }
  }
);

// Grant channel access with money (permanent)
router.post('/channels/:channelId/access/money',
  authMiddleware,
  [
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('transactionId').notEmpty().withMessage('Transaction ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { channelId } = req.params;
      const userId = req.user.id;
      const { amount, transactionId } = req.body;

      const result = await channelAccessService.grantMoneyAccess(userId, channelId, amount, transactionId);

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`user-${userId}`).emit('money-access-granted', {
        channelId,
        amount,
        transactionId
      });

      res.json(result);
    } catch (error) {
      logger.error('Error granting money access:', error);
      res.status(500).json({ error: 'Failed to grant money access' });
    }
  }
);

// End points-based session
router.post('/channels/:channelId/access/end-session',
  authMiddleware,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { channelId } = req.params;
      const userId = req.user.id;
      const { sessionId } = req.body;

      const result = await channelAccessService.endPointsSession(userId, channelId, sessionId);

      res.json(result);
    } catch (error) {
      logger.error('Error ending points session:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  }
);

// Get channels accessible with points
router.get('/channels/points-accessible', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const channels = await channelAccessService.getChannelsAccessibleWithPoints(userId, user.points);

    res.json({ channels, availablePoints: user.points });
  } catch (error) {
    logger.error('Error getting points-accessible channels:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// Get user's channel access history
router.get('/channel-access-history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const accessHistory = await channelAccessService.getUserChannelAccess(userId);

    res.json({ accessHistory });
  } catch (error) {
    logger.error('Error getting channel access history:', error);
    res.status(500).json({ error: 'Failed to get access history' });
  }
});

module.exports = router;
