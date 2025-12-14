const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Firebase Cloud Messaging Push Notification Service
 * 
 * Uses Firebase Admin SDK to send push notifications to mobile devices
 * Supports sending to individual devices, multiple devices, and topics
 */

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.initError = null;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        logger.info('✅ Firebase Admin already initialized');
        return;
      }

      // Load credentials from environment variables or JSON file
      let serviceAccount;
      const fs = require('fs');
      const path = require('path');

      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        // Use environment variables (for production/Render.com)
        logger.info('📱 Loading Firebase credentials from environment variables');
        serviceAccount = {
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
        };
      } else {
        // Use JSON file (for local development)
        const jsonPath = path.join(__dirname, '../firebase-service-account.json');
        if (fs.existsSync(jsonPath)) {
          logger.info('📱 Loading Firebase credentials from JSON file');
          serviceAccount = require('../firebase-service-account.json');
        } else {
          throw new Error('Firebase credentials not found. Set environment variables or add firebase-service-account.json');
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      this.initialized = true;
      this.initError = null;
      logger.info('✅ Firebase Admin SDK initialized successfully');
      logger.info(`📱 Project ID: ${serviceAccount.project_id}`);
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
      this.initialized = false;
      this.initError = (error && (error.message || JSON.stringify(error))) || 'Unknown initialization error';
    }
  }

  isInitialized() {
    return this.initialized && admin.apps.length > 0 && !this.initError;
  }

  getInitError() {
    return this.initError;
  }

  /**
   * Send push notification to specific device tokens
   * @param {Array<string>} deviceTokens - Array of FCM device tokens
   * @param {Object} notification - Notification data {title, message, type}
   */
  async sendToDevices(deviceTokens, notification) {
    const { title, message, type = 'general' } = notification || {};

    if (!deviceTokens || deviceTokens.length === 0) {
      logger.warn('⚠️ No device tokens provided');
      return {
        success: false,
        error: 'No device tokens',
        sentTo: 0
      };
    }

    // If Firebase Admin is not initialized, attempt legacy FCM fallback if configured
    if (!this.isInitialized()) {
      logger.warn('⚠️ Firebase Admin not initialized; attempting legacy FCM fallback if configured');
      if (process.env.FCM_LEGACY_SERVER_KEY) {
        const fcmMessage = {
          notification: {
            title: title,
            body: message,
          },
          data: {
            type: type,
            timestamp: new Date().toISOString(),
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'supasoka_notifications',
              priority: 'high',
              sound: 'default',
              defaultVibrateTimings: true,
            }
          },
          apns: {
            headers: {
              'apns-push-type': 'alert',
              'apns-priority': '10'
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              }
            }
          }
        };

        try {
          const fallbackResult = await this._sendViaLegacyFCM(deviceTokens, fcmMessage);
          logger.info(`✅ Legacy FCM fallback sent: ${fallbackResult.successCount}/${deviceTokens.length}`);
          return {
            success: true,
            sentTo: fallbackResult.successCount,
            sentCount: fallbackResult.successCount,
            failureCount: fallbackResult.failureCount,
            message: `Sent to ${fallbackResult.successCount} devices (legacy_fcm)`,
            deliveryMethod: 'legacy_fcm'
          };
        } catch (err) {
          logger.error('❌ Legacy FCM fallback failed:', err);
          return {
            success: false,
            error: err.message || 'Legacy FCM fallback failed',
            sentTo: 0
          };
        }
      }

      logger.error('❌ Firebase not initialized and no legacy FCM key configured');
      return {
        success: false,
        error: 'Firebase not initialized',
        sentTo: 0
      };
    }

    try {
      logger.info(`📱 Sending FCM notification to ${deviceTokens.length} devices`);
      logger.info(`   Title: "${title}"`);
      logger.info(`   Message: "${message}"`);
      logger.info(`   Type: ${type}`);

      // Prepare FCM message
      const fcmMessage = {
        notification: {
          title: title,
          body: message,
        },
        data: {
          type: type,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'supasoka_notifications',
            priority: 'high',
            sound: 'default',
            defaultVibrateTimings: true,
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            }
          }
        }
      };

      // Send to all tokens
      const response = await admin.messaging().sendEachForMulticast({
        tokens: deviceTokens,
        ...fcmMessage
      });

      logger.info(`✅ FCM notification sent successfully`);
      logger.info(`   Success: ${response.successCount}/${deviceTokens.length}`);
      logger.info(`   Failed: ${response.failureCount}`);

      // Log failed tokens for cleanup
      if (response.failureCount > 0) {
        const failedTokens = [];
        const invalidTokens = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = deviceTokens[idx];
            failedTokens.push(token);
            const errMsg = resp.error?.message || resp.error?.code || 'Unknown error';
            logger.warn(`   Failed token: ${token.substring(0, 20)}... - ${errMsg}`);

            // Collect tokens which are invalid or not registered for cleanup
            const msg = (resp.error && (resp.error.message || '')).toLowerCase();
            if (msg.includes('registration-token-not-registered') || msg.includes('invalid-registration-token') || msg.includes('not-registered')) {
              invalidTokens.push(token);
            }
          }
        });

        // Remove invalid tokens from DB (best-effort cleanup)
        if (invalidTokens.length > 0) {
          try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            for (const tok of invalidTokens) {
              await prisma.user.updateMany({
                where: { deviceToken: tok },
                data: { deviceToken: null }
              });
              logger.info(`Removed invalid device token from DB: ${tok.substring(0, 20)}...`);
            }

            await prisma.$disconnect();
          } catch (dbErr) {
            logger.error('Error cleaning up invalid tokens:', dbErr);
          }
        }
      }

      return {
        success: true,
        sentTo: response.successCount,
        sentCount: response.successCount,
        failureCount: response.failureCount,
        message: `Sent to ${response.successCount} devices`,
        deliveryMethod: 'firebase_cloud_messaging'
      };
    } catch (error) {
      logger.error('❌ Error sending FCM notification:', error);

      // If this looks like a credentials problem and we have a legacy key, try fallback
      const errMsg = (error && (error.message || JSON.stringify(error))) || '';
      const credIssue = /invalid_grant|invalid jwt|credential|Token must be a short-lived token/i.test(errMsg);
      if (credIssue) {
        // record credential problem for diagnostics
        this.initError = errMsg;
      }

      if (credIssue && process.env.FCM_LEGACY_SERVER_KEY) {
        logger.warn('⚠️ Firebase credential error detected, attempting legacy FCM fallback');
        try {
          const fallbackResult = await this._sendViaLegacyFCM(deviceTokens, fcmMessage);
          logger.info(`✅ Legacy FCM fallback sent: ${fallbackResult.successCount}/${deviceTokens.length}`);
          return {
            success: true,
            sentTo: fallbackResult.successCount,
            sentCount: fallbackResult.successCount,
            failureCount: fallbackResult.failureCount,
            message: `Sent to ${fallbackResult.successCount} devices (legacy_fcm_after_error)`,
            deliveryMethod: 'legacy_fcm'
          };
        } catch (err) {
          logger.error('❌ Legacy FCM fallback also failed:', err);
          return {
            success: false,
            error: (err && err.message) || 'Legacy FCM fallback failed after firebase error',
            sentTo: 0
          };
        }
      }

      return {
        success: false,
        error: error.message,
        sentTo: 0
      };
    }
  }

  /**
   * Send push notification to all users
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async _sendViaLegacyFCM(deviceTokens, fcmMessage) {
    const axios = require('axios');
    const serverKey = process.env.FCM_LEGACY_SERVER_KEY;
    if (!serverKey) throw new Error('FCM_LEGACY_SERVER_KEY not set');

    const payload = {
      registration_ids: deviceTokens,
      notification: fcmMessage.notification || {},
      data: fcmMessage.data || {},
      android: fcmMessage.android || {},
      apns: fcmMessage.apns || {},
      priority: 'high'
    };

    const res = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
      headers: {
        Authorization: `key=${serverKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const data = res.data || {};
    const successCount = data.success || 0;
    const failureCount = data.failure || 0;

    return { successCount, failureCount, raw: data };
  }

  async sendToAllUsers(notification, prisma) {
    try {
      // Get all active users with device tokens
      const users = await prisma.user.findMany({
        where: {
          isBlocked: false,
          deviceToken: {
            not: null,
            notIn: ['', 'null', 'undefined']
          }
        },
        select: {
          id: true,
          deviceToken: true,
          uniqueUserId: true
        }
      });

      if (users.length === 0) {
        logger.warn('⚠️ No active users with device tokens found');
        return {
          success: false,
          message: 'No active users',
          sentCount: 0,
          totalUsers: 0
        };
      }

      const deviceTokens = users.map(u => u.deviceToken);
      logger.info(`📱 Sending notification to ${users.length} users`);

      const result = await this.sendToDevices(deviceTokens, notification);

      return {
        success: result.success,
        sentCount: result.sentTo,
        sentTo: result.sentTo,
        totalUsers: users.length,
        failureCount: result.failureCount,
        message: `Sent to ${result.sentTo} out of ${users.length} users`,
        deliveryMethod: 'firebase_cloud_messaging'
      };
    } catch (error) {
      logger.error('❌ Error in sendToAllUsers:', error);
      return {
        success: false,
        error: error.message,
        sentCount: 0,
        totalUsers: 0
      };
    }
  }

  /**
   * Send notification to specific user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToUser(userId, notification, prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          uniqueUserId: true,
          deviceToken: true,
          isBlocked: true
        }
      });

      if (!user) {
        logger.warn(`User ${userId} not found`);
        return { success: false, message: 'User not found' };
      }

      if (user.isBlocked) {
        logger.warn(`User ${user.uniqueUserId} is blocked`);
        return { success: false, message: 'User is blocked' };
      }

      if (!user.deviceToken) {
        logger.warn(`User ${user.uniqueUserId} has no device token`);
        return { success: false, message: 'User has no device token' };
      }

      logger.info(`📱 Sending notification to user ${user.uniqueUserId}`);

      const result = await this.sendToDevices([user.deviceToken], notification);

      return {
        success: result.success,
        sentTo: result.sentTo,
        sentCount: result.sentTo,
        message: result.message,
        deliveryMethod: 'firebase_cloud_messaging'
      };
    } catch (error) {
      logger.error(`Error in sendToUser ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to subscribed users only
   * @param {Object} notification - Notification data {title, message, type}
   * @param {Object} prisma - Prisma client instance
   */
  async sendToSubscribedUsers(notification, prisma) {
    try {
      const users = await prisma.user.findMany({
        where: {
          isBlocked: false,
          isSubscribed: true,
          deviceToken: {
            not: null,
            notIn: ['', 'null', 'undefined']
          }
        },
        select: {
          id: true,
          uniqueUserId: true,
          deviceToken: true
        }
      });

      if (users.length === 0) {
        logger.warn('No subscribed users with device tokens found');
        return { success: false, message: 'No subscribed users' };
      }

      const deviceTokens = users.map(u => u.deviceToken);
      logger.info(`📱 Sending notification to ${users.length} subscribed users`);

      const result = await this.sendToDevices(deviceTokens, notification);

      return {
        success: result.success,
        sentCount: result.sentTo,
        sentTo: result.sentTo,
        totalUsers: users.length,
        message: `Sent to ${result.sentTo} subscribed users`,
        deliveryMethod: 'firebase_cloud_messaging'
      };
    } catch (error) {
      logger.error('Error in sendToSubscribedUsers:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PushNotificationService();
