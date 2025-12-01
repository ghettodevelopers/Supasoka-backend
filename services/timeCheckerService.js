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
      const remainingTime = user.remainingTime || 0;
      const accessExpiresAt = user.accessExpiresAt;

      console.log('⏰ Checking time:', {
        remainingTime,
        accessExpiresAt,
        isActivated: user.isActivated,
        isSubscribed: user.isSubscribed
      });

      // Check if time has expired
      let hasExpired = false;

      if (accessExpiresAt) {
        // Check by expiry date
        const expiryDate = new Date(accessExpiresAt);
        const now = new Date();
        hasExpired = now > expiryDate;
        
        if (hasExpired) {
          console.log('⏰ Access expired by date:', {
            expiryDate: expiryDate.toISOString(),
            now: now.toISOString()
          });
        }
      } else if (remainingTime <= 0 && user.isActivated) {
        // Check by remaining time
        hasExpired = true;
        console.log('⏰ Access expired by remaining time');
      }

      // Lock access if expired
      if (hasExpired && !this.isLocked) {
        await this.lockAccess();
      } else if (!hasExpired && this.isLocked) {
        // Unlock if time was added
        await this.unlockAccess();
      }

      // Decrease remaining time by 1 minute if active
      if (user.isActivated && user.isSubscribed && remainingTime > 0) {
        const newRemainingTime = Math.max(0, remainingTime - 1);
        user.remainingTime = newRemainingTime;
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('remainingTime', newRemainingTime.toString());
        
        // Log every 10 minutes
        if (newRemainingTime % 10 === 0) {
          console.log(`⏰ Time remaining: ${Math.floor(newRemainingTime / 60)} hours ${newRemainingTime % 60} minutes`);
        }

        // Warn when 1 hour left
        if (newRemainingTime === 60) {
          console.log('⚠️ WARNING: Only 1 hour remaining!');
        }

        // Warn when 10 minutes left
        if (newRemainingTime === 10) {
          console.log('⚠️ WARNING: Only 10 minutes remaining!');
        }
      }
    } catch (error) {
      console.error('❌ Error checking remaining time:', error);
    }
  }

  /**
   * Lock access when time expires
   */
  async lockAccess() {
    try {
      console.log('🔒 LOCKING ACCESS - Time expired');
      
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.isActivated = false;
        user.isSubscribed = false;
        user.remainingTime = 0;
        user.accessLevel = 'basic';
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }

      // Update subscription status
      await AsyncStorage.setItem('isSubscribed', 'false');
      await AsyncStorage.setItem('remainingTime', '0');

      // Clear unlocked channels
      await AsyncStorage.setItem('unlockedChannels', JSON.stringify([]));

      this.isLocked = true;
      console.log('🔒 Access locked successfully');
    } catch (error) {
      console.error('❌ Error locking access:', error);
    }
  }

  /**
   * Unlock access when time is granted
   */
  async unlockAccess() {
    try {
      console.log('🔓 UNLOCKING ACCESS - Time granted');
      
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const remainingTime = user.remainingTime || 0;
        
        if (remainingTime > 0) {
          user.isActivated = true;
          user.isSubscribed = true;
          user.accessLevel = user.accessLevel || 'premium';
          await AsyncStorage.setItem('user', JSON.stringify(user));
          await AsyncStorage.setItem('isSubscribed', 'true');
          
          this.isLocked = false;
          console.log('🔓 Access unlocked successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error unlocking access:', error);
    }
  }

  /**
   * Manually refresh time from backend
   */
  async refreshTimeFromBackend() {
    try {
      // This would call your API to get latest user data
      // For now, just check local storage
      await this.checkRemainingTime();
    } catch (error) {
      console.error('❌ Error refreshing time:', error);
    }
  }

  /**
   * Get current lock status
   */
  isAccessLocked() {
    return this.isLocked;
  }
}

// Export singleton instance
const timeCheckerService = new TimeCheckerService();
export default timeCheckerService;
