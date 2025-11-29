const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Generate UUID v4
const generateUUID = () => {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

const prisma = new PrismaClient();

/**
 * Check if user can access a channel
 */
async function checkChannelAccess(userId, channelId) {
  try {
    // Get user and channel
    const [user, channel] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.channel.findUnique({ where: { id: channelId } })
    ]);

    if (!user || !channel) {
      return { canAccess: false, reason: 'User or channel not found' };
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return { 
        canAccess: false, 
        reason: 'Account blocked',
        blockReason: user.blockReason,
        blockedAt: user.blockedAt
      };
    }

    // Free channels are always accessible
    if (channel.isFree) {
      return { canAccess: true, accessType: 'free' };
    }

    // Check if user has active subscription (money payment)
    if (user.isSubscribed && user.remainingTime > 0) {
      const subscriptionEnd = user.subscriptionEnd;
      if (subscriptionEnd && new Date(subscriptionEnd) > new Date()) {
        return { canAccess: true, accessType: 'subscription' };
      }
    }

    // Check for active points-based session access
    const activeAccess = await prisma.channelAccess.findFirst({
      where: {
        userId,
        channelId,
        isActive: true,
        accessType: 'points',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeAccess) {
      return { 
        canAccess: true, 
        accessType: 'points',
        sessionId: activeAccess.sessionId,
        expiresAt: activeAccess.expiresAt
      };
    }

    // Check if user has money-based permanent access
    const moneyAccess = await prisma.channelAccess.findFirst({
      where: {
        userId,
        channelId,
        accessType: 'money',
        isActive: true
      }
    });

    if (moneyAccess) {
      return { canAccess: true, accessType: 'money' };
    }

    // User needs to pay
    return { 
      canAccess: false, 
      reason: 'Payment required',
      requiresPayment: true,
      requiresPoints: true
    };
  } catch (error) {
    logger.error('Error checking channel access:', error);
    return { canAccess: false, reason: 'Error checking access' };
  }
}

/**
 * Grant channel access with points (single session)
 */
async function grantPointsAccess(userId, channelId, pointsCost = 100) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.points < pointsCost) {
      return { 
        success: false, 
        error: 'Insufficient points',
        required: pointsCost,
        available: user.points
      };
    }

    // Deduct points
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          decrement: pointsCost
        }
      }
    });

    // Create session access (expires when user exits channel)
    const sessionId = generateUUID();
    const channelAccess = await prisma.channelAccess.create({
      data: {
        userId,
        channelId,
        accessType: 'points',
        pointsSpent: pointsCost,
        sessionId,
        isActive: true
        // expiresAt is null - session ends when user exits
      }
    });

    // Log points transaction
    await prisma.pointsHistory.create({
      data: {
        userId,
        points: -pointsCost,
        type: 'channel_access',
        description: `Spent ${pointsCost} points for channel access`
      }
    });

    logger.info(`Points access granted: User ${userId} to channel ${channelId} (${pointsCost} points)`);

    return {
      success: true,
      sessionId,
      remainingPoints: updatedUser.points,
      access: channelAccess
    };
  } catch (error) {
    logger.error('Error granting points access:', error);
    throw error;
  }
}

/**
 * Grant channel access with money (permanent until admin revokes)
 */
async function grantMoneyAccess(userId, channelId, amount, transactionId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Create permanent access
    const channelAccess = await prisma.channelAccess.create({
      data: {
        userId,
        channelId,
        accessType: 'money',
        amountPaid: amount,
        transactionId,
        isActive: true
      }
    });

    logger.info(`Money access granted: User ${userId} to channel ${channelId} (${amount} TZS)`);

    return {
      success: true,
      access: channelAccess
    };
  } catch (error) {
    logger.error('Error granting money access:', error);
    throw error;
  }
}

/**
 * End points-based session access
 */
async function endPointsSession(userId, channelId, sessionId) {
  try {
    await prisma.channelAccess.updateMany({
      where: {
        userId,
        channelId,
        sessionId,
        accessType: 'points',
        isActive: true
      },
      data: {
        isActive: false,
        expiresAt: new Date()
      }
    });

    logger.info(`Points session ended: User ${userId}, Channel ${channelId}, Session ${sessionId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error ending points session:', error);
    throw error;
  }
}

/**
 * Get all channels user can access with points
 */
async function getChannelsAccessibleWithPoints(userId, pointsAvailable) {
  try {
    const paidChannels = await prisma.channel.findMany({
      where: {
        isFree: false,
        isActive: true
      }
    });

    // Return all paid channels (user can choose which to access)
    return paidChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      logo: channel.logo,
      category: channel.category,
      pointsCost: 100, // Default cost, can be made configurable per channel
      canAfford: pointsAvailable >= 100
    }));
  } catch (error) {
    logger.error('Error getting channels accessible with points:', error);
    return [];
  }
}

/**
 * Get user's channel access history
 */
async function getUserChannelAccess(userId) {
  try {
    const accessHistory = await prisma.channelAccess.findMany({
      where: { userId },
      include: {
        user: {
          select: { deviceId: true, uniqueUserId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return accessHistory;
  } catch (error) {
    logger.error('Error getting user channel access:', error);
    return [];
  }
}

module.exports = {
  checkChannelAccess,
  grantPointsAccess,
  grantMoneyAccess,
  endPointsSession,
  getChannelsAccessibleWithPoints,
  getUserChannelAccess
};

