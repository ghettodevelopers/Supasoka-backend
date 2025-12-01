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
    this.adQueue = []; // Queue for preloaded ads
    this.maxQueueSize = 2; // Keep 2 ads preloaded
    this.loadAttempts = 0;
    this.maxLoadAttempts = 3;
    this.lastLoadTime = null;
    this.loadTimeout = null;
    this.adEventListeners = []; // Store event listeners for cleanup
  }

  // Initialize AdMob
  async initialize() {
    if (this.initialized) {
      console.log('✅ AdMob already initialized');
      return true;
    }

    try {
      console.log('🚀 Initializing AdMob...');
      await mobileAds().initialize();
      console.log('✅ AdMob initialized successfully');
      this.initialized = true;
      
      // Aggressively pre-load multiple ads for instant availability
      console.log('📦 Pre-loading ads for instant availability...');
      this.preloadMultipleAds();
      
      return true;
    } catch (error) {
      console.error('❌ AdMob initialization failed:', error);
      return false;
    }
  }

  // Preload multiple ads for instant availability
  async preloadMultipleAds() {
    console.log('🔄 Preloading multiple ads...');
    
    // Load first ad immediately
    await this.loadRewardedAd();
    
    // Load second ad after a short delay
    setTimeout(() => {
      this.loadRewardedAd();
    }, 2000);
  }

  // Load Rewarded Ad with smart retry logic
  async loadRewardedAd() {
    // Prevent loading if already loading
    if (this.isAdLoading) {
      console.log('⚠️ Ad already loading, skipping...');
      return;
    }

    // If ad is already loaded, skip
    if (this.isAdLoaded && this.rewardedAd) {
      console.log('✅ Ad already loaded and ready');
      return;
    }

    try {
      this.isAdLoading = true;
      this.loadAttempts++;
      this.lastLoadTime = Date.now();
      
      console.log(`🔄 Loading ad (attempt ${this.loadAttempts}/${this.maxLoadAttempts})...`);
      
      // Clean up previous ad instance
      if (this.rewardedAd) {
        this.rewardedAd = null;
      }
      
      // Create rewarded ad instance with optimized settings
      this.rewardedAd = RewardedAd.createForAdRequest(
        ADMOB_CONFIG.rewardedAdUnitId,
        {
          requestNonPersonalizedAdsOnly: false,
          keywords: ['gaming', 'entertainment', 'video'], // Help with ad targeting
        }
      );

      // Set timeout for ad loading (10 seconds max)
      this.loadTimeout = setTimeout(() => {
        if (this.isAdLoading && !this.isAdLoaded) {
          console.log('⏱️ Ad load timeout, retrying...');
          this.isAdLoading = false;
          this.isAdLoaded = false;
          
          // Retry if under max attempts
          if (this.loadAttempts < this.maxLoadAttempts) {
            setTimeout(() => this.loadRewardedAd(), 1000);
          } else {
            console.log('❌ Max load attempts reached');
            this.loadAttempts = 0; // Reset for next time
          }
        }
      }, 10000);

      // Set up event listeners using addAdEventListener
      const loadedListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('✅ Rewarded ad loaded successfully!');
          this.isAdLoaded = true;
          this.isAdLoading = false;
          this.loadAttempts = 0; // Reset attempts on success
          
          if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
          }
          
          const loadTime = Date.now() - this.lastLoadTime;
          console.log(`⚡ Ad loaded in ${loadTime}ms`);
        }
      );

      const errorListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.ERROR,
        (error) => {
          console.error('❌ Ad load error:', error);
          this.isAdLoading = false;
          this.isAdLoaded = false;
          
          if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
          }
          
          // Auto-retry on error if under max attempts
          if (this.loadAttempts < this.maxLoadAttempts) {
            console.log(`🔄 Retrying ad load in 2 seconds...`);
            setTimeout(() => this.loadRewardedAd(), 2000);
          } else {
            console.log('❌ Max retry attempts reached');
            this.loadAttempts = 0;
          }
        }
      );

      const earnedRewardListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('🎉 User earned reward:', reward);
          
          // Call the reward callback if it exists
          if (this.rewardCallback) {
            this.rewardCallback(reward);
            this.rewardCallback = null;
          }
        }
      );

      // Store listeners for cleanup
      this.adEventListeners = [
        loadedListener,
        errorListener,
        earnedRewardListener
      ];

      // Load the ad
      this.rewardedAd.load();
      
    } catch (error) {
      console.error('❌ Failed to load rewarded ad:', error);
      this.isAdLoading = false;
      this.isAdLoaded = false;
      
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }
      
      // Retry on exception
      if (this.loadAttempts < this.maxLoadAttempts) {
        setTimeout(() => this.loadRewardedAd(), 2000);
      }
    }
  }

  // Show Rewarded Ad with smart waiting
  async showRewardedAd(onReward, onError) {
    console.log('🎬 Attempting to show rewarded ad...');
    
    // If ad is already loaded, show immediately
    if (this.isAdLoaded && this.rewardedAd) {
      console.log('✅ Ad ready, showing immediately!');
      try {
        this.rewardCallback = onReward;
        this.rewardedAd.show();
        this.isAdLoaded = false;
        return true;
      } catch (error) {
        console.error('❌ Failed to show ad:', error);
        if (onError) onError('Imeshindikana kuonyesha tangazo.');
        return false;
      }
    }

    // If ad is loading, wait for it
    if (this.isAdLoading) {
      console.log('⏳ Ad is loading, waiting...');
      
      // Wait up to 8 seconds for ad to load
      const maxWaitTime = 8000;
      const checkInterval = 200;
      let waited = 0;
      
      while (waited < maxWaitTime) {
        if (this.isAdLoaded && this.rewardedAd) {
          console.log(`✅ Ad loaded after ${waited}ms, showing now!`);
          try {
            this.rewardCallback = onReward;
            this.rewardedAd.show();
            this.isAdLoaded = false;
            return true;
          } catch (error) {
            console.error('❌ Failed to show ad:', error);
            if (onError) onError('Imeshindikana kuonyesha tangazo.');
            return false;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }
      
      console.log('⏱️ Timeout waiting for ad to load');
      if (onError) onError('Tangazo bado linapakia. Tafadhali jaribu tena.');
      return false;
    }

    // Ad not loaded and not loading, try to load it
    console.log('🔄 Ad not loaded, loading now...');
    this.loadRewardedAd();
    
    // Wait for ad to load
    const maxWaitTime = 8000;
    const checkInterval = 200;
    let waited = 0;
    
    while (waited < maxWaitTime) {
      if (this.isAdLoaded && this.rewardedAd) {
        console.log(`✅ Ad loaded after ${waited}ms, showing now!`);
        try {
          this.rewardCallback = onReward;
          this.rewardedAd.show();
          this.isAdLoaded = false;
          return true;
        } catch (error) {
          console.error('❌ Failed to show ad:', error);
          if (onError) onError('Imeshindikana kuonyesha tangazo.');
          return false;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
    
    console.log('❌ Failed to load ad in time');
    if (onError) onError('Tangazo halipatikani kwa sasa. Tafadhali jaribu tena.');
    return false;
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
      loadAttempts: this.loadAttempts,
      lastLoadTime: this.lastLoadTime,
    };
  }

  // Force reload ad (useful for debugging)
  forceReload() {
    console.log('🔄 Force reloading ad...');
    this.isAdLoaded = false;
    this.isAdLoading = false;
    this.loadAttempts = 0;
    this.loadRewardedAd();
  }

  // Cleanup method
  cleanup() {
    // Remove event listeners
    if (this.adEventListeners && this.adEventListeners.length > 0) {
      this.adEventListeners.forEach(listener => {
        if (listener && typeof listener === 'function') {
          listener(); // Call the unsubscribe function
        }
      });
      this.adEventListeners = [];
    }
    
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    
    if (this.rewardedAd) {
      this.rewardedAd = null;
    }
    
    this.isAdLoaded = false;
    this.isAdLoading = false;
    this.rewardCallback = null;
  }
}

// Export singleton instance
const adMobService = new AdMobService();
export default adMobService;
