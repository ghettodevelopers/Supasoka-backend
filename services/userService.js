import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from './api';

/**
 * User Service
 * Handles user registration, authentication, and data persistence
 */

class UserService {
  constructor() {
    this.user = null;
    this.token = null;
    this.deviceId = null;
  }

  /**
   * Initialize user on app first launch
   * Registers user with backend and stores data locally
   */
  async initializeUser() {
    try {
      console.log('🔐 Initializing user...');

      // Get or create device ID
      this.deviceId = await this.getDeviceId();
      console.log('📱 Device ID:', this.deviceId);

      // Check if user already exists locally
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('authToken');

      if (storedUser && storedToken) {
        this.user = JSON.parse(storedUser);
        this.token = storedToken;
        console.log('✅ User loaded from storage:', this.user.uniqueUserId);

        // Update last active on backend
        await this.updateLastActive();

        return {
          user: this.user,
          token: this.token,
          isNewUser: false
        };
      }

      // Register new user with backend
      const deviceInfo = await this.getDeviceInfo();
      const response = await apiService.post('/auth/initialize', {
        deviceId: this.deviceId,
        deviceName: deviceInfo.deviceName,
        platform: deviceInfo.platform,
        appVersion: deviceInfo.appVersion
      });

      if (response.user && response.token) {
        this.user = response.user;
        this.token = response.token;

        // Store user data locally
        await AsyncStorage.setItem('user', JSON.stringify(this.user));
        await AsyncStorage.setItem('authToken', this.token);
        await AsyncStorage.setItem('deviceId', this.deviceId);

        console.log('✅ New user registered:', this.user.uniqueUserId);

        return {
          user: this.user,
          token: this.token,
          isNewUser: true
        };
      }

      throw new Error('Failed to initialize user');
    } catch (error) {
      console.error('❌ User initialization error:', error);

      // Fallback: Create offline user
      return await this.createOfflineUser();
    }
  }

  /**
   * Get or generate device ID
   */
  async getDeviceId() {
    try {
      // Check if device ID exists
      let deviceId = await AsyncStorage.getItem('deviceId');

      if (!deviceId) {
        // Generate unique device ID based on timestamp and random string
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        deviceId = `${Platform.OS}_${timestamp}_${random}`;

        await AsyncStorage.setItem('deviceId', deviceId);
        console.log('🆕 New device ID generated:', deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Generate fallback ID
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo() {
    try {
      return {
        deviceName: `${Platform.OS} Device`,
        platform: Platform.OS,
        appVersion: '1.0.0',
        systemVersion: Platform.Version.toString()
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        deviceName: 'Unknown Device',
        platform: 'Android',
        appVersion: '1.0.0',
        systemVersion: 'Unknown'
      };
    }
  }

  /**
   * Create offline user when backend is unavailable
   */
  async createOfflineUser() {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const uniqueUserId = `User_${Math.random().toString(36).substr(2, 6)}`;

      const offlineUser = {
        id: this.deviceId,
        deviceId: this.deviceId,
        uniqueUserId,
        deviceName: deviceInfo.deviceName,
        platform: deviceInfo.platform,
        remainingTime: 0,
        points: 0,
        isActivated: false,
        isSubscribed: false,
        subscriptionType: null,
        trialUsed: false,
        accessLevel: 'basic',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isOffline: true
      };

      // Store offline user
      await AsyncStorage.setItem('user', JSON.stringify(offlineUser));
      await AsyncStorage.setItem('deviceId', this.deviceId);

      this.user = offlineUser;

      console.log('✅ Offline user created:', uniqueUserId);

      return {
        user: offlineUser,
        token: null,
        isNewUser: true,
        isOffline: true
      };
    } catch (error) {
      console.error('Error creating offline user:', error);
      throw error;
    }
  }

  /**
   * Update user's last active timestamp (non-blocking)
   */
  async updateLastActive() {
    try {
      if (!this.user || !this.token) {
        console.log('⚠️ Skipping last active update - no user or token');
        return;
      }

      // Make this non-blocking - don't await
      apiService.patch('/users/last-active', {
        deviceId: this.deviceId
      }).then(() => {
        console.log('✅ Last active updated');
      }).catch((error) => {
        // Silently fail - not critical
        console.log('⚠️ Last active update failed (non-critical):', error.message);
      });

    } catch (error) {
      // Silently fail - not critical
      console.log('⚠️ Last active update error (non-critical):', error.message);
    }
  }

  /**
   * Sync user data with backend
   */
  async syncUserData() {
    try {
      if (!this.user || !this.token) return null;

      const response = await apiService.get('/users/profile');

      if (response.user) {
        this.user = response.user;
        await AsyncStorage.setItem('user', JSON.stringify(this.user));
        console.log('✅ User data synced');
        return this.user;
      }

      return null;
    } catch (error) {
      console.error('Error syncing user data:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      const response = await apiService.patch('/users/profile', updates);

      if (response.user) {
        this.user = response.user;
        await AsyncStorage.setItem('user', JSON.stringify(this.user));
        console.log('✅ Profile updated');
        return this.user;
      }

      return null;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get auth token
   */
  getToken() {
    return this.token;
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await AsyncStorage.multiRemove(['user', 'authToken']);
      this.user = null;
      this.token = null;
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}

// Export singleton instance
const userService = new UserService();
export default userService;
