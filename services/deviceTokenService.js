import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import apiService from './api';

/**
 * Device Token Service with Firebase Cloud Messaging
 * Manages FCM tokens for push notifications
 */

class DeviceTokenService {
  constructor() {
    this.fcmToken = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Firebase Messaging and get FCM token
   */
  async initialize() {
    try {
      console.log('🔔 Initializing Firebase Messaging...');

      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('⚠️ Notification permission not granted');
        return null;
      }

      console.log('✅ Notification permission granted');

      // Get FCM token
      const token = await messaging().getToken();

      if (token) {
        console.log('🔑 FCM Token obtained');
        this.fcmToken = token;

        // Save locally
        await AsyncStorage.setItem('fcmToken', token);

        // Register with backend
        await this.registerTokenWithBackend(token);

        // Listen for token refresh
        this.setupTokenRefreshListener();

        this.isInitialized = true;
        return token;
      } else {
        console.warn('⚠️ Failed to get FCM token');
        return null;
      }
    } catch (error) {
      console.error('❌ Firebase Messaging initialization error:', error);
      return null;
    }
  }

  /**
   * Setup listener for token refresh
   */
  setupTokenRefreshListener() {
    messaging().onTokenRefresh(async (token) => {
      console.log('🔄 FCM token refreshed');
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      await this.registerTokenWithBackend(token);
    });
  }

  /**
   * Register FCM token with backend
   */
  async registerTokenWithBackend(token) {
    try {
      console.log('📤 Registering FCM token with backend...');

      // Get user info
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        console.warn('⚠️ No user found, will register token after user initialization');
        return;
      }

      // Send token to backend
      const response = await apiService.post('/users/device-token', {
        deviceToken: token,
        platform: Platform.OS,
        deviceInfo: {
          os: Platform.OS,
          osVersion: Platform.Version,
        }
      });

      if (response.success) {
        console.log('✅ FCM token registered with backend');

        // Update local user data
        const user = JSON.parse(storedUser);
        user.deviceToken = token;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      } else {
        console.warn('⚠️ Failed to register FCM token:', response.message);
      }
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
    }
  }

  /**
   * Get current FCM token
   */
  getDeviceToken() {
    return this.fcmToken;
  }

  /**
   * Check if service is initialized
   */
  isReady() {
    return this.isInitialized && this.fcmToken !== null;
  }

  /**
   * Force refresh token registration
   */
  async refreshTokenRegistration() {
    if (this.fcmToken) {
      await this.registerTokenWithBackend(this.fcmToken);
    } else {
      // Try to get token again
      await this.initialize();
    }
  }

  /**
   * Clear token (for logout)
   */
  async clearToken() {
    try {
      await messaging().deleteToken();
      await AsyncStorage.removeItem('fcmToken');
      this.fcmToken = null;
      console.log('🗑️ FCM token cleared');
    } catch (error) {
      console.error('Error clearing FCM token:', error);
    }
  }
}

export default new DeviceTokenService();
