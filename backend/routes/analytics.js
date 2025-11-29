const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { adminOnly } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard analytics (admin only)
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
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

    // Total users
    const totalUsers = await prisma.user.count();
    
    // Active users (users who watched something in the period)
    const activeUsers = await prisma.user.count({
      where: {
        lastActive: {
          gte: startDate
        }
      }
    });

    // New users in period
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });

    // Subscribed users
    const subscribedUsers = await prisma.user.count({
      where: { isSubscribed: true }
    });

    // Total watch time in period
    const watchTimeResult = await prisma.watchHistory.aggregate({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        sessionTime: true
      }
    });

    // Total downloads
    const totalDownloads = await prisma.download.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });

    // Popular channels
    const popularChannels = await prisma.watchHistory.groupBy({
      by: ['channelId'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        channelId: true
      },
      _sum: {
        sessionTime: true
      },
      orderBy: {
        _count: {
          channelId: 'desc'
        }
      },
      take: 10
    });

    // Get channel details for popular channels
    const channelIds = popularChannels.map(pc => pc.channelId);
    const channels = await prisma.channel.findMany({
      where: {
        id: {
          in: channelIds
        }
      }
    });

    const popularChannelsWithDetails = popularChannels.map(pc => {
      const channel = channels.find(c => c.id === pc.channelId);
      return {
        ...pc,
        channel
      };
    });

    // User growth over time
    const userGrowth = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Watch time by day
    const watchTimeByDay = await prisma.watchHistory.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        sessionTime: true
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({
      summary: {
        totalUsers,
        activeUsers,
        newUsers,
        subscribedUsers,
        totalWatchTime: Math.floor((watchTimeResult._sum.sessionTime || 0) / 60), // in minutes
        totalDownloads,
        subscriptionRate: totalUsers > 0 ? ((subscribedUsers / totalUsers) * 100).toFixed(1) : 0
      },
      popularChannels: popularChannelsWithDetails,
      userGrowth,
      watchTimeByDay,
      period
    });
  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get channel analytics (admin only)
router.get('/channels', adminOnly, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
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

    const channelStats = await prisma.channel.findMany({
      include: {
        _count: {
          select: {
            watchHistory: {
              where: {
                createdAt: {
                  gte: startDate
                }
              }
            }
          }
        },
        watchHistory: {
          where: {
            createdAt: {
              gte: startDate
            }
          },
          select: {
            sessionTime: true,
            createdAt: true
          }
        }
      }
    });

    const analytics = channelStats.map(channel => {
      const totalWatchTime = channel.watchHistory.reduce((sum, wh) => sum + wh.sessionTime, 0);
      const uniqueViewers = new Set(channel.watchHistory.map(wh => wh.userId)).size;
      
      return {
        id: channel.id,
        name: channel.name,
        category: channel.category,
        isActive: channel.isActive,
        viewCount: channel._count.watchHistory,
        totalWatchTime: Math.floor(totalWatchTime / 60), // in minutes
        uniqueViewers,
        averageWatchTime: channel._count.watchHistory > 0 ? 
          Math.floor(totalWatchTime / channel._count.watchHistory / 60) : 0
      };
    });

    res.json({ channels: analytics, period });
  } catch (error) {
    logger.error('Error fetching channel analytics:', error);
    res.status(500).json({ error: 'Failed to fetch channel analytics' });
  }
});

// Get user analytics (admin only)
router.get('/users', adminOnly, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // User registration trends
    const registrationTrends = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Subscription trends
    const subscriptionTrends = await prisma.user.groupBy({
      by: ['subscriptionStart'],
      where: {
        subscriptionStart: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        subscriptionStart: 'asc'
      }
    });

    // User activity levels
    const activityLevels = await prisma.user.findMany({
      select: {
        id: true,
        totalWatchTime: true,
        isSubscribed: true,
        createdAt: true,
        lastActive: true
      }
    });

    const activityStats = {
      heavy: activityLevels.filter(u => u.totalWatchTime > 300).length, // >5 hours
      moderate: activityLevels.filter(u => u.totalWatchTime > 60 && u.totalWatchTime <= 300).length, // 1-5 hours
      light: activityLevels.filter(u => u.totalWatchTime > 0 && u.totalWatchTime <= 60).length, // <1 hour
      inactive: activityLevels.filter(u => u.totalWatchTime === 0).length
    };

    res.json({
      registrationTrends,
      subscriptionTrends,
      activityStats,
      period
    });
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Record daily analytics (cron job endpoint)
router.post('/record-daily', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if analytics for today already exist
    const existingAnalytics = await prisma.analytics.findUnique({
      where: { date: today }
    });

    if (existingAnalytics) {
      return res.json({ message: 'Analytics already recorded for today' });
    }

    // Calculate daily stats
    const totalUsers = await prisma.user.count();
    
    const activeUsers = await prisma.user.count({
      where: {
        lastActive: {
          gte: today
        }
      }
    });

    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    const watchTimeResult = await prisma.watchHistory.aggregate({
      where: {
        createdAt: {
          gte: today
        }
      },
      _sum: {
        sessionTime: true
      }
    });

    const totalDownloads = await prisma.download.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Popular channels for the day
    const popularChannels = await prisma.watchHistory.groupBy({
      by: ['channelId'],
      where: {
        createdAt: {
          gte: today
        }
      },
      _count: {
        channelId: true
      },
      _sum: {
        sessionTime: true
      },
      orderBy: {
        _count: {
          channelId: 'desc'
        }
      },
      take: 10
    });

    // Record analytics
    await prisma.analytics.create({
      data: {
        date: today,
        totalUsers,
        activeUsers,
        newUsers,
        totalWatchTime: Math.floor((watchTimeResult._sum.sessionTime || 0) / 60),
        totalDownloads,
        popularChannels
      }
    });

    logger.info(`Daily analytics recorded for ${today.toISOString().split('T')[0]}`);
    res.json({ message: 'Daily analytics recorded successfully' });
  } catch (error) {
    logger.error('Error recording daily analytics:', error);
    res.status(500).json({ error: 'Failed to record analytics' });
  }
});

module.exports = router;
