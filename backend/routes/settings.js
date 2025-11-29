const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get all settings (public - for user app)
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.appSettings.findMany({
      orderBy: { key: 'asc' }
    });

    // Convert to key-value object for easier access
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({ settings: settingsObject, raw: settings });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get single setting by key
router.get('/:key', async (req, res) => {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: req.params.key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    logger.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Admin: Get all settings with metadata
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const settings = await prisma.appSettings.findMany({
      orderBy: { key: 'asc' }
    });

    res.json({ settings });
  } catch (error) {
    logger.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Admin: Update or create setting
router.put('/admin/:key',
  authMiddleware,
  adminOnly,
  [
    body('value').notEmpty().withMessage('Value is required'),
    body('description').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { key } = req.params;
      const { value, description } = req.body;

      // Upsert (update or create)
      const setting = await prisma.appSettings.upsert({
        where: { key },
        update: {
          value,
          description: description || undefined,
          updatedBy: req.admin.email
        },
        create: {
          key,
          value,
          description: description || null,
          updatedBy: req.admin.email
        }
      });

      // Broadcast setting change to all connected clients
      const io = req.app.get('io');
      io.emit('setting-updated', {
        key: setting.key,
        value: setting.value,
        updatedAt: setting.updatedAt
      });

      // Notify admin dashboard
      io.to('admin-room').emit('setting-updated', { setting });

      logger.info(`Setting updated: ${key} by admin ${req.admin.email}`);
      res.json({ setting, message: 'Setting updated successfully' });
    } catch (error) {
      logger.error('Error updating setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
);

// Admin: Update multiple settings at once
router.post('/admin/bulk-update',
  authMiddleware,
  adminOnly,
  [
    body('settings').isArray().withMessage('Settings must be an array'),
    body('settings.*.key').notEmpty().withMessage('Each setting must have a key'),
    body('settings.*.value').notEmpty().withMessage('Each setting must have a value')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { settings } = req.body;

      // Update all settings
      const updatedSettings = await Promise.all(
        settings.map(({ key, value, description }) =>
          prisma.appSettings.upsert({
            where: { key },
            update: {
              value,
              description: description || undefined,
              updatedBy: req.admin.email
            },
            create: {
              key,
              value,
              description: description || null,
              updatedBy: req.admin.email
            }
          })
        )
      );

      // Broadcast all setting changes to connected clients
      const io = req.app.get('io');
      updatedSettings.forEach(setting => {
        io.emit('setting-updated', {
          key: setting.key,
          value: setting.value,
          updatedAt: setting.updatedAt
        });
      });

      // Notify admin dashboard
      io.to('admin-room').emit('settings-bulk-updated', { 
        settings: updatedSettings,
        count: updatedSettings.length
      });

      logger.info(`Bulk settings update: ${updatedSettings.length} settings by admin ${req.admin.email}`);
      res.json({ 
        settings: updatedSettings, 
        message: `${updatedSettings.length} settings updated successfully` 
      });
    } catch (error) {
      logger.error('Error bulk updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// Admin: Delete setting
router.delete('/admin/:key',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { key } = req.params;

      await prisma.appSettings.delete({
        where: { key }
      });

      // Broadcast setting deletion
      const io = req.app.get('io');
      io.emit('setting-deleted', { key });
      io.to('admin-room').emit('setting-deleted', { key });

      logger.info(`Setting deleted: ${key} by admin ${req.admin.email}`);
      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Setting not found' });
      }
      logger.error('Error deleting setting:', error);
      res.status(500).json({ error: 'Failed to delete setting' });
    }
  }
);

// Initialize default settings
router.post('/admin/initialize',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const defaultSettings = [
        { key: 'app_name', value: 'Supasoka TV', description: 'Application name' },
        { key: 'support_phone', value: '+255 XXX XXX XXX', description: 'Support phone number' },
        { key: 'support_whatsapp', value: '+255 XXX XXX XXX', description: 'WhatsApp support number' },
        { key: 'support_email', value: 'support@supasoka.com', description: 'Support email address' },
        { key: 'subscription_price', value: '10000', description: 'Monthly subscription price (TZS)' },
        { key: 'free_trial_days', value: '7', description: 'Free trial period in days' },
        { key: 'maintenance_mode', value: 'false', description: 'Enable/disable maintenance mode' },
        { key: 'min_app_version', value: '1.0.0', description: 'Minimum required app version' },
        { key: 'force_update', value: 'false', description: 'Force users to update app' },
        { key: 'terms_url', value: 'https://supasoka.com/terms', description: 'Terms and conditions URL' },
        { key: 'privacy_url', value: 'https://supasoka.com/privacy', description: 'Privacy policy URL' }
      ];

      const createdSettings = [];
      for (const setting of defaultSettings) {
        const created = await prisma.appSettings.upsert({
          where: { key: setting.key },
          update: {},
          create: {
            ...setting,
            updatedBy: req.admin.email
          }
        });
        createdSettings.push(created);
      }

      logger.info(`Default settings initialized by admin ${req.admin.email}`);
      res.json({ 
        settings: createdSettings, 
        message: 'Default settings initialized successfully' 
      });
    } catch (error) {
      logger.error('Error initializing settings:', error);
      res.status(500).json({ error: 'Failed to initialize settings' });
    }
  }
);

module.exports = router;
