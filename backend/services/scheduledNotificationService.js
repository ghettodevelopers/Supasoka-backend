const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const notificationHelper = require('./notificationHelper');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class ScheduledNotificationService {
  constructor() {
    this.io = null;
    this.cronJob = null;
    this.isRunning = false;
  }

  initialize(io) {
    if (!io) {
      logger.error('Socket.IO instance required for scheduled notifications');
      return;
    }

    this.io = io;
    this.startCronJob();
    logger.info('✅ Scheduled notification service initialized');
  }

  startCronJob() {
    if (this.cronJob) {
      logger.warn('Cron job already running');
      return;
    }

    this.cronJob = cron.schedule('*/30 * * * * *', async () => {
      await this.processScheduledNotifications();
    });

    logger.info('📅 Scheduled notification cron job started (runs every 30 seconds)');
  }

  stopCronJob() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Scheduled notification cron job stopped');
    }
  }

  async processScheduledNotifications() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      
      const dueNotifications = await prisma.notification.findMany({
        where: {
          isActive: true,
          sentAt: null,
          scheduledAt: {
            lte: now
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      if (dueNotifications.length === 0) {
        this.isRunning = false;
        return;
      }

      logger.info(`Processing ${dueNotifications.length} scheduled notifications`);

      for (const notification of dueNotifications) {
        try {
          await this.sendScheduledNotification(notification);
        } catch (error) {
          logger.error(`Failed to send scheduled notification ${notification.id}:`, error);
        }
      }

      logger.info(`Completed processing ${dueNotifications.length} scheduled notifications`);
    } catch (error) {
      logger.error('Error in processScheduledNotifications:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async sendScheduledNotification(notification) {
    try {
      const targetUserIds = Array.isArray(notification.targetUsers) && notification.targetUsers.length > 0
        ? notification.targetUsers
        : null;

      const result = await notificationHelper.sendCompleteNotification(
        this.io,
        notification.id,
        notification.title,
        notification.message,
        notification.type,
        targetUserIds,
        true
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() }
      });

      await notificationHelper.emitToAdmin(this.io, 'scheduled-notification-sent', {
        notificationId: notification.id,
        title: notification.title,
        scheduledAt: notification.scheduledAt,
        sentAt: new Date(),
        stats: result.stats
      });

      logger.info(`Scheduled notification sent: ${notification.title} (ID: ${notification.id})`);

      return { success: true, notification, stats: result.stats };
    } catch (error) {
      logger.error(`Failed to send scheduled notification ${notification.id}:`, error);
      
      await prisma.notification.update({
        where: { id: notification.id },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      }).catch(err => logger.error('Failed to deactivate failed notification:', err));

      return { success: false, error: error.message, notificationId: notification.id };
    }
  }

  async scheduleNotification(notificationId, scheduledAt) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      if (notification.sentAt) {
        return { success: false, error: 'Notification already sent' };
      }

      const scheduleDate = new Date(scheduledAt);
      const now = new Date();

      if (scheduleDate <= now) {
        return { success: false, error: 'Scheduled time must be in the future' };
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { scheduledAt: scheduleDate }
      });

      logger.info(`Notification ${notificationId} scheduled for ${scheduleDate.toISOString()}`);

      return { success: true, notificationId, scheduledAt: scheduleDate };
    } catch (error) {
      logger.error(`Failed to schedule notification ${notificationId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async cancelScheduledNotification(notificationId) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      if (notification.sentAt) {
        return { success: false, error: 'Notification already sent' };
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { 
          scheduledAt: null,
          isActive: false
        }
      });

      logger.info(`Scheduled notification ${notificationId} cancelled`);

      return { success: true, notificationId };
    } catch (error) {
      logger.error(`Failed to cancel scheduled notification ${notificationId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getScheduledNotifications() {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          isActive: true,
          sentAt: null,
          scheduledAt: {
            not: null
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      return { success: true, notifications };
    } catch (error) {
      logger.error('Failed to get scheduled notifications:', error);
      return { success: false, error: error.message, notifications: [] };
    }
  }
}

module.exports = new ScheduledNotificationService();
