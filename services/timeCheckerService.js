import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

/**
 * Time Checker Service
 * Monitors user's remaining time and locks access when expired
 */

class TimeCheckerService {
  constructor() {
    this.checkInterval = null;
    this.appStateSubscription = null;
    this.isLocked = false;
  }

  /**
   * Start monitoring user's time
   */
  async startMonitoring() {
    try {
      console.log('⏰ Starting time monitoring...');

      // Check time immediately
      await this.checkRemainingTime();

      // Check every minute
      this.checkInterval = setInterval(() => {
        this.checkRemainingTime();
      }, 60000); // 60 seconds

      // Monitor app state changes
      this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          console.log('📱 App became active, checking time...');
          this.checkRemainingTime();
        }
      });

      console.log('✅ Time monitoring started');
    } catch (error) {
      console.error('❌ Error starting time monitoring:', error);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    console.log('⏹️ Time monitoring stopped');
  }

  /**
   * Check remaining time and lock if expired
   */
  async checkRemainingTime() {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      const accessExpiresAt = user.accessExpiresAt;
      const subscriptionEndTimeStr = await AsyncStorage.getItem('subscriptionEndTime');

      // Calculate remaining time from timestamp (more accurate and dynamic)
      let remainingMinutes = 0;
      let hasExpired = false;

      if (accessExpiresAt) {
        const expiryDate = new Date(accessExpiresAt);
        const now = new Date();
        const remainingMs = expiryDate - now;
        
        if (remainingMs > 0) {
          remainingMinutes = Math.floor(remainingMs / 60000); // Convert ms to minutes
        } else {
          hasExpired = true;
        }
      } else if (subscriptionEndTimeStr) {
        const subscriptionEndTime = parseInt(subscriptionEndTimeStr);
        const now = Date.now();
        const remainingMs = subscriptionEndTime - now;
        
        if (remainingMs > 0) {
          remainingMinutes = Math.floor(remainingMs / 60000);
        } else {
          hasExpired = true;
        }
      } else {
        // Fallback to old remainingTime field
        remainingMinutes = user.remainingTime || 0;
        hasExpired = remainingMinutes <= 0 && user.isActivated;
      }

      console.log('? Checking time:', {
        remainingMinutes,
        hasExpired,
        isActivated: user.isActivated,
        isSubscribed: user.isSubscribed,
        expiresAt: accessExpiresAt ? new Date(accessExpiresAt).toLocaleString() : 'N/A'
      });

      // Update remaining time in storage (calculated from timestamp)
      if (remainingMinutes !== user.remainingTime) {
        user.remainingTime = remainingMinutes;
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('remainingTime', remainingMinutes.toString());
        
        // Log every 10 minutes
        if (remainingMinutes % 10 === 0 && remainingMinutes > 0) {
          const hours = Math.floor(remainingMinutes / 60);
          const mins = remainingMinutes % 60;
          console.log(`? Time remaining: ${hours}h ${mins}m`);
        }
      }

      // Lock access if expired
      if (hasExpired && !this.isLocked) {
        await this.lockAccess();
      } else if (!hasExpired && this.isLocked && remainingMinutes > 0) {
        // Unlock if time was added
        await this.unlockAccess();
      }
    } catch (error) {
      console.error('? Error checking remaining time:', error);
    }
  }

