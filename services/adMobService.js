import { Platform } from 'react-native';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

/**
 * AdMob Service for Supasoka
 * 
 * IMPORTANT: This service ONLY handles REWARDED VIDEO ADS
 * - Users watch video ads to earn points
 * - Each completed ad rewards 10 points
 * - Points can be used to unlock channels
 */

// AdMob Configuration
const ADMOB_CONFIG = {
  appId: 'ca-app-pub-5619803043988422~5036677593',
  // REWARDED VIDEO AD UNIT ID (not banner or interstitial)
  rewardedAdUnitId: __DEV__
    ? TestIds.REWARDED // Use test ads in development
    : 'ca-app-pub-5619803043988422/4588410442', // Real rewarded video ad unit ID
};

class AdMobService {
  constructor() {
    this.rewardedAd = null;
    this.isAdLoaded = false;
    this.isAdLoading = false;
    this.initialized = false;
    this.rewardCallback = null;
  }

  // Initialize AdMob
  async initialize() {
    if (this.initialized) {
      console.log('AdMob already initialized');
      return true;
    }

    try {
      await mobileAds().initialize();
      console.log('✅ AdMob initialized successfully');
      this.initialized = true;
      
      // Pre-load the first ad
      await this.loadRewardedAd();
      
      return true;
    } catch (error) {
      console.error('❌ AdMob initialization failed:', error);
      return false;
    }
  }

  // Load Rewarded Ad
  async loadRewardedAd() {
    // Prevent loading if already loading or loaded
    if (this.isAdLoading || this.isAdLoaded) {
      console.log('⚠️ Ad already loading or loaded');
      return;
    }

    try {
      this.isAdLoading = true;
      
      // Clean up previous ad instance
      if (this.rewardedAd) {
        this.rewardedAd = null;
      }
      
      // Create rewarded ad instance
      this.rewardedAd = RewardedAd.createForAdRequest(
        ADMOB_CONFIG.rewardedAdUnitId,
        {
          requestNonPersonalizedAdsOnly: false,
        }
      );

      // Set up event listeners - use onAdEvent instead of addAdEventListener
      this.rewardedAd.onAdEvent((type, error, data) => {
        console.log('📺 Ad event:', type);
        
        if (type === 'loaded') {
          console.log('✅ Rewarded ad loaded successfully');
          this.isAdLoaded = true;
          this.isAdLoading = false;
        } else if (type === 'error') {
          console.error('❌ Ad error:', error);
          this.isAdLoading = false;
          this.isAdLoaded = false;
        } else if (type === 'closed') {
          console.log('Ad closed');
          this.isAdLoaded = false;
          // Pre-load next ad
          setTimeout(() => {
            this.loadRewardedAd();
          }, 1000);
        } else if (type === 'earned_reward') {
          console.log('🎉 User earned reward:', data);
          // Call the reward callback if it exists
          if (this.rewardCallback) {
            this.rewardCallback(data);
            this.rewardCallback = null;
          }
        }
      });

      // Load the ad
      this.rewardedAd.load();
      
    } catch (error) {
      console.error('❌ Failed to load rewarded ad:', error);
      this.isAdLoading = false;
      this.isAdLoaded = false;
    }
  }

  // Show Rewarded Ad
  async showRewardedAd(onReward, onError) {
    if (!this.isAdLoaded || !this.rewardedAd) {
      console.log('⚠️ Ad not ready, loading...');
      
      // Try to load ad if not loaded
      await this.loadRewardedAd();
      
      // Wait a bit for ad to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!this.isAdLoaded) {
        if (onError) {
          onError('Tangazo halijapatikana. Tafadhali jaribu tena baadaye.');
        }
        return false;
      }
    }

    try {
      // Store the reward callback
      this.rewardCallback = onReward;

      // Show the ad
      this.rewardedAd.show();
      this.isAdLoaded = false;
      
      return true;
    } catch (error) {
      console.error('❌ Failed to show rewarded ad:', error);
      if (onError) {
        onError('Imeshindikana kuonyesha tangazo. Tafadhali jaribu tena.');
      }
      return false;
    }
  }

  // Check if ad is ready
  isRewardedAdReady() {
    return this.isAdLoaded && this.rewardedAd !== null;
  }

  // Get ad loading status
  getAdStatus() {
    return {
      isLoaded: this.isAdLoaded,
      isLoading: this.isAdLoading,
      isReady: this.isRewardedAdReady(),
    };
  }
}

// Export singleton instance
const adMobService = new AdMobService();
export default adMobService;
