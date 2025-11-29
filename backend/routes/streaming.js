const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Quality presets for video transcoding
const QUALITY_PRESETS = {
  '240p': {
    resolution: '426x240',
    videoBitrate: '400k',
    audioBitrate: '64k',
    fps: 25
  },
  '360p': {
    resolution: '640x360',
    videoBitrate: '800k',
    audioBitrate: '96k',
    fps: 25
  },
  '480p': {
    resolution: '854x480',
    videoBitrate: '1200k',
    audioBitrate: '128k',
    fps: 30
  },
  '720p': {
    resolution: '1280x720',
    videoBitrate: '2500k',
    audioBitrate: '192k',
    fps: 30
  },
  '1080p': {
    resolution: '1920x1080',
    videoBitrate: '4500k',
    audioBitrate: '256k',
    fps: 30
  }
};

// Get available qualities for a stream
router.get('/qualities/:channelId', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // For DASH streams, we can extract available qualities from the manifest
    // For now, return standard quality options
    const availableQualities = [
      { id: 'auto', label: 'Auto', resolution: 'Auto' },
      { id: '1080p', label: '1080p HD', resolution: '1920x1080' },
      { id: '720p', label: '720p HD', resolution: '1280x720' },
      { id: '480p', label: '480p', resolution: '854x480' },
      { id: '360p', label: '360p', resolution: '640x360' },
      { id: '240p', label: '240p', resolution: '426x240' }
    ];

    res.json({ 
      channelId,
      qualities: availableQualities,
      originalUrl: channel.streamUrl
    });
  } catch (error) {
    logger.error('Error fetching stream qualities:', error);
    res.status(500).json({ error: 'Failed to fetch stream qualities' });
  }
});

// Get transcoded stream URL for specific quality
router.get('/transcode/:channelId/:quality', authMiddleware, async (req, res) => {
  try {
    const { channelId, quality } = req.params;
    
    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // If quality is 'auto' or 'original', return original stream
    if (quality === 'auto' || quality === 'original') {
      return res.json({
        streamUrl: channel.streamUrl,
        quality: 'original',
        drmConfig: channel.drmConfig
      });
    }

    // Check if quality preset exists
    if (!QUALITY_PRESETS[quality]) {
      return res.status(400).json({ error: 'Invalid quality preset' });
    }

    // For live streams, we'll return the original URL with quality preference
    // In a production environment, you would implement actual transcoding
    // or use a CDN service like AWS CloudFront or Cloudflare Stream
    
    const transcodedUrl = await generateTranscodedUrl(channel.streamUrl, quality);
    
    res.json({
      streamUrl: transcodedUrl,
      quality: quality,
      drmConfig: channel.drmConfig,
      preset: QUALITY_PRESETS[quality]
    });

  } catch (error) {
    logger.error('Error generating transcoded stream:', error);
    res.status(500).json({ error: 'Failed to generate transcoded stream' });
  }
});

// Generate transcoded URL (placeholder implementation)
async function generateTranscodedUrl(originalUrl, quality) {
  // In a real implementation, this would:
  // 1. Check if transcoded version exists in cache/CDN
  // 2. If not, trigger transcoding process
  // 3. Return transcoded stream URL
  
  // For now, we'll return the original URL with quality parameters
  // This is a placeholder - in production you'd use FFmpeg or a cloud service
  
  const url = new URL(originalUrl);
  url.searchParams.set('quality', quality);
  url.searchParams.set('preset', JSON.stringify(QUALITY_PRESETS[quality]));
  
  return url.toString();
}

// Start transcoding job (for pre-processing)
router.post('/transcode/start', 
  authMiddleware,
  [
    body('channelId').notEmpty().withMessage('Channel ID is required'),
    body('qualities').isArray().withMessage('Qualities must be an array')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { channelId, qualities } = req.body;
      
      const channel = await prisma.channel.findUnique({
        where: { id: channelId }
      });

      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Create transcoding job record
      const job = await prisma.transcodingJob.create({
        data: {
          channelId,
          sourceUrl: channel.streamUrl,
          targetQualities: qualities,
          status: 'pending',
          userId: req.user.id
        }
      });

      // In production, trigger actual transcoding process here
      // For now, we'll just mark it as completed
      setTimeout(async () => {
        await prisma.transcodingJob.update({
          where: { id: job.id },
          data: { 
            status: 'completed',
            completedAt: new Date()
          }
        });
      }, 5000);

      res.json({ 
        message: 'Transcoding job started',
        jobId: job.id,
        estimatedTime: '5 minutes'
      });

    } catch (error) {
      logger.error('Error starting transcoding job:', error);
      res.status(500).json({ error: 'Failed to start transcoding job' });
    }
  }
);

// Get transcoding job status
router.get('/transcode/status/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await prisma.transcodingJob.findUnique({
      where: { id: jobId },
      include: {
        channel: {
          select: { name: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Transcoding job not found' });
    }

    res.json({ job });
  } catch (error) {
    logger.error('Error fetching transcoding job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// Record quality change analytics
router.post('/analytics/quality-change',
  authMiddleware,
  [
    body('channelId').notEmpty().withMessage('Channel ID is required'),
    body('fromQuality').notEmpty().withMessage('From quality is required'),
    body('toQuality').notEmpty().withMessage('To quality is required'),
    body('timestamp').optional().isISO8601().withMessage('Valid timestamp required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { channelId, fromQuality, toQuality, timestamp } = req.body;
      
      // Record quality change event
      await prisma.qualityChangeEvent.create({
        data: {
          userId: req.user.id,
          channelId,
          fromQuality,
          toQuality,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      });

      logger.info(`Quality change recorded: ${req.user.id} changed from ${fromQuality} to ${toQuality} for channel ${channelId}`);
      res.json({ success: true, message: 'Quality change recorded' });
    } catch (error) {
      logger.error('Error recording quality change:', error);
      res.status(500).json({ error: 'Failed to record quality change' });
    }
  }
);

// Record watch time and session data
router.post('/watch-time',
  authMiddleware,
  [
    body('channelId').notEmpty().withMessage('Channel ID is required'),
    body('watchTime').isNumeric().withMessage('Watch time must be a number'),
    body('sessionTime').isNumeric().withMessage('Session time must be a number'),
    body('quality').optional().isString().withMessage('Quality must be a string')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { channelId, watchTime, sessionTime, quality = 'auto' } = req.body;
      
      // Record watch session
      await prisma.watchHistory.create({
        data: {
          userId: req.user.id,
          channelId,
          watchTime: parseFloat(watchTime),
          sessionTime: parseFloat(sessionTime),
          quality,
          timestamp: new Date()
        }
      });

      // Update user's total watch time
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          totalWatchTime: {
            increment: parseFloat(sessionTime)
          }
        }
      });

      logger.info(`Watch time recorded: User ${req.user.id} watched channel ${channelId} for ${sessionTime} seconds`);
      res.json({ 
        success: true, 
        message: 'Watch time recorded successfully',
        watchTime: parseFloat(watchTime),
        sessionTime: parseFloat(sessionTime)
      });
    } catch (error) {
      logger.error('Error recording watch time:', error);
      res.status(500).json({ error: 'Failed to record watch time' });
    }
  }
);

module.exports = router;
