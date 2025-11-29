const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');
const auditLogService = require('../services/auditLogService');

const router = express.Router();
const prisma = new PrismaClient();

// Helper to get client IP and user agent
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown'
});

// Get all channels (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const activeParam = (req.query.active || 'true').toString().toLowerCase();
    const freeParam = (req.query.free || req.query.isFree || 'any').toString().toLowerCase();

    const whereClause = {
      ...(category && category !== 'all' && { category }),
      ...(activeParam === 'true' && { isActive: true }),
      ...(activeParam === 'false' && { isActive: false }),
      // when activeParam === 'all', no isActive filter is applied
      ...(freeParam === 'true' && { isFree: true }),
      ...(freeParam === 'false' && { isFree: false })
      // when freeParam === 'any', no isFree filter is applied
    };

    const channels = await prisma.channel.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' }, // Higher priority first (for featured channels)
        { createdAt: 'desc' }
      ]
    });
    // Return actual channels (may be empty if none exist yet)
    res.json({ channels });
  } catch (error) {
    logger.error('Error fetching channels (likely database unavailable):', error.message);

    // Fallback: Return mock channels only when database is unavailable
    let mockChannels = [
      {
        id: 1,
        name: "Al Jazeera English",
        streamUrl: "https://live-hls-web-aje.getaj.net/AJE/01.m3u8",
        qualityUrls: {
          "360p": "https://live-hls-web-aje.getaj.net/AJE/01_360p.m3u8",
          "480p": "https://live-hls-web-aje.getaj.net/AJE/01_480p.m3u8",
          "720p": "https://live-hls-web-aje.getaj.net/AJE/01_720p.m3u8",
          "1080p": "https://live-hls-web-aje.getaj.net/AJE/01.m3u8"
        },
        category: "news",
        logo: "https://upload.wikimedia.org/wikipedia/en/f/f2/Aljazeera_eng.png",
        description: "International news channel",
        drmConfig: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: "BBC World News",
        streamUrl: "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/main.m3u8",
        qualityUrls: {
          "360p": "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/360p.m3u8",
          "480p": "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/480p.m3u8",
          "720p": "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/720p.m3u8",
          "1080p": "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/main.m3u8"
        },
        category: "news",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/BBC_World_News_red_logo.svg/1200px-BBC_World_News_red_logo.svg.png",
        description: "BBC international news",
        drmConfig: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: "CNN International",
        streamUrl: "https://cnn-cnninternational-1-eu.rakuten.wurl.tv/playlist.m3u8",
        category: "news",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/CNN_International_logo.svg/1200px-CNN_International_logo.svg.png",
        description: "CNN international coverage",
        drmConfig: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: "ESPN Sports",
        streamUrl: "https://admdn2.cdn.mangomolo.com/nagtv/smil:nagtv.stream.smil/playlist.m3u8",
        qualityUrls: {
          "360p": "https://admdn2.cdn.mangomolo.com/nagtv/smil:nagtv.stream.smil/360p.m3u8",
          "480p": "https://admdn2.cdn.mangomolo.com/nagtv/smil:nagtv.stream.smil/480p.m3u8",
          "720p": "https://admdn2.cdn.mangomolo.com/nagtv/smil:nagtv.stream.smil/720p.m3u8",
          "1080p": "https://admdn2.cdn.mangomolo.com/nagtv/smil:nagtv.stream.smil/playlist.m3u8"
        },
        category: "sports",
        logo: "⚽",
        icon: "⚽",
        description: "Live sports coverage",
        drmConfig: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: "Discovery Channel",
        streamUrl: "https://food-dlvr-ott.akamaized.net/primary/3/def27b3dd6854290bc7f42daa93c65ea/index_15.m3u8",
        category: "documentary",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Discovery_Channel_-_Logo_2019.svg/1200px-Discovery_Channel_-_Logo_2019.svg.png",
        description: "Science and discovery content",
        drmConfig: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        name: "MTV Live",
        streamUrl: "https://unilivemtveu-lh.akamaihd.net/i/mtvno_1@346424/master.m3u8",
        category: "music",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/MTV-2021.svg/1200px-MTV-2021.svg.png",
        description: "Music television",
        drmConfig: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Normalize mock IDs to avoid collisions with real DB IDs
    mockChannels = mockChannels.map((ch, idx) => ({
      ...ch,
      id: `mock-${idx + 1}`
    }));

    // Filter by category if specified
    const { category } = req.query;
    const filteredChannels = category && category !== 'all'
      ? mockChannels.filter(ch => ch.category === category)
      : mockChannels;

    logger.info('Returning mock channels for offline mode:', filteredChannels.length);
    res.json({ channels: filteredChannels, offline: true });
  };
});

// Get carousel images (public endpoint)
router.get('/carousel', async (req, res) => {
  try {
    const carouselImages = await prisma.carouselImage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        subtitle: true,
        image: true,
        order: true
      }
    });

    res.json({ images: carouselImages });
  } catch (error) {
    logger.error('Error fetching carousel images:', error);
    // Return empty array if database is unavailable
    res.json({ images: [] });
  }
});

// Get featured channels (public endpoint) - MUST be before /:id route
router.get('/featured', async (req, res) => {
  try {
    const featuredChannels = await prisma.channel.findMany({
      where: {
        isActive: true,
        priority: { gt: 0 } // Only channels with priority > 0 are featured
      },
      orderBy: { priority: 'desc' },
      take: 5 // Limit to top 5 featured channels
    });

    res.json({ channels: featuredChannels });
  } catch (error) {
    logger.error('Error fetching featured channels:', error.message);
    res.json({ channels: [] });
  }
});

// Get single channel
router.get('/:id', async (req, res) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel });
  } catch (error) {
    logger.error('Error fetching channel:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Create new channel (admin only)
router.post('/',
  authMiddleware,
  adminOnly,
  [
    body('name').notEmpty().trim().withMessage('Channel name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('streamUrl').notEmpty().isURL().withMessage('Valid stream URL is required'),
    body('color').optional().isArray().withMessage('Color must be an array of gradient colors'),
    body('logo').optional().isURL().withMessage('Logo must be a valid URL')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        name,
        logo,
        category,
        color,
        hd = true,
        streamUrl,
        backupUrls,
        drmConfig,
        priority = 0,
        description,
        isFree = false
      } = req.body;

      const numericPriority = Number.isFinite(Number(priority)) ? Number(priority) : 0;
      const sanitizedData = {
        name: name.trim(),
        logo: logo?.trim() || null,
        category,
        color: Array.isArray(color) && color.length > 0 ? color : ['#6366F1', '#8B5CF6'],
        hd: Boolean(hd),
        streamUrl: streamUrl.trim(),
        backupUrls: Array.isArray(backupUrls) ? backupUrls : [],
        drmConfig: drmConfig || null,
        priority: numericPriority,
        description: description?.trim() || null,
        isFree: Boolean(isFree)
      };

      const channel = await prisma.channel.create({
        data: sanitizedData
      });

      // Log audit action
      const clientInfo = getClientInfo(req);
      await auditLogService.logAdminAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        action: 'channel_create',
        entityType: 'channel',
        entityId: channel.id,
        details: {
          name: channel.name,
          category: channel.category,
          isFree: channel.isFree,
          isActive: channel.isActive
        },
        ...clientInfo
      });

      // Notify admin dashboard about new channel
      const io = req.app.get('io');
      io.to('admin-room').emit('channel-created', { channel });

      // Broadcast to all connected clients for real-time update
      io.emit('channel-created', { channel });

      // Send notification about new channel
      await notificationService.sendNewChannelNotification(channel);

      logger.info(`Channel created: "${channel.name}" (${channel.category}) by admin ${req.admin.email}`);
      res.status(201).json({ channel });
    } catch (error) {
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      logger.error('Error creating channel:', error.message || error);
      res.status(500).json({
        error: 'Failed to create channel',
        details: error.message
      });
    }
  }
);

// Bulk activate all channels (admin only)
router.patch('/activate-all',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const result = await prisma.channel.updateMany({
        data: { isActive: true }
      });

      // Notify admin dashboard and clients that channels status might have changed
      const io = req.app.get('io');
      io.to('admin-room').emit('channels-bulk-activated', { count: result.count });
      io.emit('channels-bulk-activated', { count: result.count });

      logger.info(`All channels activated by admin ${req.admin.email}. Updated: ${result.count}`);
      res.json({ message: 'All channels activated', updated: result.count });
    } catch (error) {
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      logger.error('Error activating all channels:', error.message || error);
      res.status(500).json({ error: 'Failed to activate all channels', details: error.message });
    }
  }
);

// Update channel (admin only)
router.put('/:id',
  authMiddleware,
  adminOnly,
  [
    body('name').optional().isString(),
    body('logo').optional().isString(),
    body('category').optional().isString(),
    body('color').optional().isArray().withMessage('color must be an array'),
    body('hd').optional().customSanitizer(v => (v === 'true' ? true : v === 'false' ? false : v)).isBoolean().withMessage('hd must be boolean'),
    body('streamUrl').optional().custom((v) => v === '' || v === null || v === undefined || /^(https?:)?\/\//.test(v)).withMessage('streamUrl must be a valid URL or empty'),
    body('backupUrls').optional().isArray().withMessage('backupUrls must be an array'),
    body('drmConfig').optional(),
    body('priority').optional().customSanitizer(v => (v === '' || v === null || v === undefined) ? undefined : parseInt(v, 10)).isInt().withMessage('priority must be an integer'),
    body('description').optional().isString(),
    body('isActive').optional().customSanitizer(v => (v === 'true' ? true : v === 'false' ? false : v)).isBoolean().withMessage('isActive must be boolean'),
    body('isFree').optional().customSanitizer(v => (v === 'true' ? true : v === 'false' ? false : v)).isBoolean().withMessage('isFree must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const channelId = req.params.id;
      // Only reject mock channel IDs (string starting with "mock-")
      if (typeof channelId === 'string' && channelId.startsWith('mock-')) {
        return res.status(404).json({ error: 'Cannot modify mock channel' });
      }
      // Ensure channel exists
      const existing = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!existing) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      const payload = Object.fromEntries(
        Object.entries(req.body).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
      );

      const updates = {};
      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.logo !== undefined) updates.logo = payload.logo;
      if (payload.category !== undefined) updates.category = payload.category;
      if (payload.color !== undefined) updates.color = Array.isArray(payload.color) ? payload.color : [];
      if (payload.hd !== undefined) updates.hd = Boolean(payload.hd);
      if (payload.streamUrl !== undefined) updates.streamUrl = payload.streamUrl;
      if (payload.backupUrls !== undefined) updates.backupUrls = Array.isArray(payload.backupUrls) ? payload.backupUrls : [];
      if (payload.drmConfig !== undefined) updates.drmConfig = payload.drmConfig || null;
      if (payload.priority !== undefined) {
        const p = Number(payload.priority);
        if (Number.isFinite(p)) updates.priority = p;
      }
      if (payload.description !== undefined) updates.description = payload.description;
      if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);
      if (payload.isFree !== undefined) updates.isFree = Boolean(payload.isFree);

      const channel = await prisma.channel.update({
        where: { id: channelId },
        data: updates
      });

      // Log audit action
      const clientInfo = getClientInfo(req);
      await auditLogService.logAdminAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        action: 'channel_update',
        entityType: 'channel',
        entityId: channelId,
        details: {
          updates,
          channelName: channel.name
        },
        ...clientInfo
      });

      // Notify admin dashboard and users about channel update
      const io = req.app.get('io');
      io.to('admin-room').emit('channel-updated', { channel });
      io.emit('channel-updated', { channelId, channel, updates });

      // Send notification about channel update
      await notificationService.sendChannelUpdate(channel, 'updated');

      logger.info(`Channel updated: ${channel.name} by admin ${req.admin.email}`);
      res.json({ channel });
    } catch (error) {
      if (error?.code === 'P2025') {
        return res.status(404).json({ error: 'Channel not found' });
      }
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      logger.error('Error updating channel:', error.message || error);
      res.status(500).json({ error: 'Failed to update channel', details: error.message });
    }
  }
);

// Toggle channel status (admin only)
router.patch('/:id/toggle',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const channelId = req.params.id;

      // Only reject mock channel IDs (string starting with "mock-")
      if (typeof channelId === 'string' && channelId.startsWith('mock-')) {
        return res.status(404).json({ error: 'Cannot modify mock channel' });
      }

      const channel = await prisma.channel.findUnique({
        where: { id: channelId }
      });

      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const updatedChannel = await prisma.channel.update({
        where: { id: channelId },
        data: { isActive: !channel.isActive }
      });

      // Notify about status change
      const io = req.app.get('io');
      io.to('admin-room').emit('channel-status-changed', {
        channelId,
        isActive: updatedChannel.isActive
      });
      io.emit('channel-status-changed', {
        channelId,
        isActive: updatedChannel.isActive
      });

      // Send notification about status change
      await notificationService.sendChannelStatusNotification(updatedChannel, updatedChannel.isActive);

      logger.info(`Channel ${updatedChannel.isActive ? 'activated' : 'deactivated'}: ${updatedChannel.name}`);
      res.json({ channel: updatedChannel });
    } catch (error) {
      if (error?.code === 'P2025') {
        return res.status(404).json({ error: 'Channel not found' });
      }
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      logger.error('Error toggling channel status:', error.message || error);
      res.status(500).json({ error: 'Failed to toggle channel status', details: error.message });
    }
  }
);

// Delete channel (admin only)
router.delete('/:id',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const channelId = req.params.id;
      // Only reject mock channel IDs (string starting with "mock-")
      if (typeof channelId === 'string' && channelId.startsWith('mock-')) {
        return res.status(404).json({ error: 'Cannot modify mock channel' });
      }

      // Get channel data before deletion for notification
      const channelToDelete = await prisma.channel.findUnique({
        where: { id: channelId }
      });

      if (!channelToDelete) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      await prisma.channel.delete({
        where: { id: channelId }
      });

      // Log audit action
      const clientInfo = getClientInfo(req);
      await auditLogService.logAdminAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        action: 'channel_delete',
        entityType: 'channel',
        entityId: channelId,
        details: {
          channelName: channelToDelete.name,
          category: channelToDelete.category
        },
        ...clientInfo
      });

      // Notify about deletion
      const io = req.app.get('io');
      io.to('admin-room').emit('channel-deleted', { channelId });
      io.emit('channel-deleted', { channelId });

      // Send notification about channel deletion
      await notificationService.sendChannelDeletedNotification(channelToDelete);

      logger.info(`Channel deleted: ${channelToDelete.name} by admin ${req.admin.email}`);
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      if (error?.code === 'P2025') {
        return res.status(404).json({ error: 'Channel not found' });
      }
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      if (error?.name === 'PrismaClientInitializationError') {
        return res.status(503).json({ error: 'Database unavailable. Please ensure PostgreSQL is running.' });
      }
      logger.error('Error deleting channel:', error.message || error);
      res.status(500).json({ error: 'Failed to delete channel', details: error.message });
    }
  }
);

// Get carousel images (public endpoint)
router.get('/carousel', async (req, res) => {
  try {
    const images = await prisma.carouselImage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    res.json({ images });
  } catch (error) {
    logger.error('Error fetching carousel images:', error.message);
    res.json({ images: [] });
  }
});

// Admin: Get all carousel images (including inactive)
router.get('/carousel/admin', authMiddleware, adminOnly, async (req, res) => {
  try {
    const images = await prisma.carouselImage.findMany({
      orderBy: { order: 'asc' }
    });

    logger.info(`Admin fetched ${images.length} carousel images`);
    res.json({ images });
  } catch (error) {
    logger.error('Error fetching admin carousel images:', error.message);
    res.status(500).json({
      error: 'Failed to fetch carousel images',
      details: error.message
    });
  }
});

// Admin: Create carousel image
router.post('/carousel', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { imageUrl, title, description, linkUrl, order = 0, isActive = true } = req.body;

    // Validation
    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Image URL must be a valid HTTP/HTTPS URL' });
    }

    const carouselImage = await prisma.carouselImage.create({
      data: {
        imageUrl: imageUrl.trim(),
        title: title?.trim() || '',
        description: description?.trim() || '',
        linkUrl: linkUrl?.trim() || '',
        order: parseInt(order) || 0,
        isActive: Boolean(isActive)
      }
    });

    // Notify clients about new carousel image
    const io = req.app.get('io');
    io.emit('carousel-updated', { action: 'added', image: carouselImage });

    logger.info(`Carousel image created: "${carouselImage.title}" by admin ${req.admin.email}`);
    res.status(201).json({ image: carouselImage });
  } catch (error) {
    logger.error('Error creating carousel image:', error);
    res.status(500).json({
      error: 'Failed to create carousel image',
      details: error.message
    });
  }
});

// Admin: Update carousel image
router.put('/carousel/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const imageId = req.params.id;
    const { imageUrl, title, description, linkUrl, order, isActive } = req.body;

    // Validate imageUrl if provided
    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Image URL must be a valid HTTP/HTTPS URL' });
    }

    // Check if carousel exists
    const existing = await prisma.carouselImage.findUnique({ where: { id: imageId } });
    if (!existing) {
      return res.status(404).json({ error: 'Carousel image not found' });
    }

    const carouselImage = await prisma.carouselImage.update({
      where: { id: imageId },
      data: {
        ...(imageUrl && { imageUrl: imageUrl.trim() }),
        ...(title !== undefined && { title: title?.trim() || '' }),
        ...(description !== undefined && { description: description?.trim() || '' }),
        ...(linkUrl !== undefined && { linkUrl: linkUrl?.trim() || '' }),
        ...(order !== undefined && { order: parseInt(order) || 0 }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });

    // Notify clients about carousel update
    const io = req.app.get('io');
    io.emit('carousel-updated', { action: 'updated', image: carouselImage });

    logger.info(`Carousel image updated: "${carouselImage.title}" by admin ${req.admin.email}`);
    res.json({ image: carouselImage });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Carousel image not found' });
    }
    logger.error('Error updating carousel image:', error);
    res.status(500).json({
      error: 'Failed to update carousel image',
      details: error.message
    });
  }
});

// Admin: Delete carousel image
router.delete('/carousel/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const imageId = req.params.id;

    // Get carousel before deletion for logging
    const carouselToDelete = await prisma.carouselImage.findUnique({
      where: { id: imageId }
    });

    if (!carouselToDelete) {
      return res.status(404).json({ error: 'Carousel image not found' });
    }

    await prisma.carouselImage.delete({
      where: { id: imageId }
    });

    // Notify clients about carousel deletion
    const io = req.app.get('io');
    io.emit('carousel-updated', { action: 'deleted', imageId });

    logger.info(`Carousel image deleted: "${carouselToDelete.title}" by admin ${req.admin.email}`);
    res.json({ message: 'Carousel image deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Carousel image not found' });
    }
    logger.error('Error deleting carousel image:', error);
    res.status(500).json({
      error: 'Failed to delete carousel image',
      details: error.message
    });
  }
});

// Admin: Reorder carousel images
router.patch('/carousel/reorder', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { imageOrders } = req.body; // Array of { id, order }

    if (!Array.isArray(imageOrders)) {
      return res.status(400).json({ error: 'imageOrders must be an array' });
    }

    // Update order for each image
    const updatePromises = imageOrders.map(({ id, order }) =>
      prisma.carouselImage.update({
        where: { id },
        data: { order: parseInt(order) }
      })
    );

    await Promise.all(updatePromises);

    // Get updated images
    const images = await prisma.carouselImage.findMany({
      orderBy: { order: 'asc' }
    });

    // Notify clients about carousel reorder
    const io = req.app.get('io');
    io.emit('carousel-updated', { action: 'reordered', images });

    logger.info(`Carousel images reordered by admin ${req.admin.email}`);
    res.json({ images });
  } catch (error) {
    logger.error('Error reordering carousel images:', error);
    res.status(500).json({ error: 'Failed to reorder carousel images' });
  }
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    res.json({ categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Record watch history
router.post('/:id/watch',
  authMiddleware,
  async (req, res) => {
    try {
      const { watchTime, sessionTime, quality } = req.body;
      const channelId = req.params.id;
      const userId = req.user.id;

      await prisma.watchHistory.create({
        data: {
          userId,
          channelId,
          watchTime: parseInt(watchTime) || 0,
          sessionTime: parseInt(sessionTime) || 0,
          quality
        }
      });

      // Update user's total watch time
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalWatchTime: {
            increment: Math.floor((parseInt(sessionTime) || 0) / 60)
          },
          lastActive: new Date()
        }
      });

      res.json({ message: 'Watch history recorded' });
    } catch (error) {
      logger.error('Error recording watch history:', error);
      res.status(500).json({ error: 'Failed to record watch history' });
    }
  }
);

module.exports = router;
