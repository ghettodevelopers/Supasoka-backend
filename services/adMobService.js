import { Platform } from 'react-native';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

/**
 * AdMob Service - FIXED for Unlimited Ad Watching
 * Handles rewarded video ads for earning points
 * 
 * KEY FIXES:
 * 1. Proper cleanup between ad loads
 * 2. Preloading next ad immediately after current ad completes
 * 3. Better error recovery with exponential backoff
 * 4. State management to prevent race conditions
 */

const ADMOB_CONFIG = {
  appId: 'ca-app-pub-5619803043988422~5036677593',
  rewardedAdUnitId: __DEV__
    ? TestIds.REWARDED
    : 'ca-app-pub-5619803043988422/5529507312',
};

class AdMobService {
  constructor() {
    this.rewardedAd = null;
    this.secondAd = null; // NEW: Second ad for sequential watching
    this.isAdLoaded = false;
    this.isSecondAdLoaded = false; // NEW: Track second ad
    this.isAdLoading = false;
    this.isAdShowing = false; // Track if ad is currently showing
    this.initialized = false;
    this.loadAttempts = 0;
    this.rewardCallback = null;
    this.errorCallback = null;
    this.unsubscribeLoaded = null;
    this.unsubscribeEarned = null;
    this.unsubscribeClosed = null;
    this.unsubscribeError = null;
    // Second ad listeners
    this.unsubscribeLoaded2 = null;
    this.unsubscribeEarned2 = null;
    this.unsubscribeClosed2 = null;
    this.unsubscribeError2 = null;
    this.totalAdsShown = 0;
    this.consecutiveErrors = 0;
    this.lastLoadTime = 0; // Track when last load was attempted
    this.preloadTimer = null; // Timer for preloading
    // Sequential ad tracking
    this.isSequentialMode = true; // NEW: Enable 2 ads per session
    this.currentAdInSequence = 0; // NEW: Track which ad is showing (0 or 1)
    this.sequenceReward = null; // NEW: Store reward until both ads complete
  }

  async initialize() {
    if (this.initialized) {
      console.log('✅ AdMob already initialized');
      // Still try to load an ad if none is ready
      if (!this.isAdLoaded && !this.isAdLoading) {
        this.loadRewardedAd();
      }
      return true;
    }

    try {
      console.log('🚀 Initializing AdMob...');
      console.log('📱 Mode:', __DEV__ ? 'TEST ADS' : 'PRODUCTION');
      console.log('🎯 Ad Unit ID:', ADMOB_CONFIG.rewardedAdUnitId);

      await mobileAds().initialize();

      this.initialized = true;
      console.log('✅ AdMob SDK initialized successfully');

      // Start preloading first ad immediately - ULTRA FAST
      console.log('⚡ Preloading first ad...');
      setTimeout(() => this.loadRewardedAd(), 100); // ✅ FASTER: 100ms instead of 500ms

      return true;
    } catch (error) {
      console.error('❌ AdMob init failed:', error.message);
      this.initialized = true; // Mark as initialized to prevent retry loops
      // Try loading anyway - sometimes init fails but ads still work
      setTimeout(() => this.loadRewardedAd(), 1000);
      return false;
    }
  }

  async loadRewardedAd() {
    // Prevent multiple simultaneous load attempts
    if (this.isAdLoading) {
      console.log('⚠️ Ad already loading, skipping duplicate request');
      return;
    }

    // Prevent loading while ad is showing
    if (this.isAdShowing) {
      console.log('⚠️ Ad currently showing, will load after close');
      return;
    }

    // Prevent rapid-fire load attempts (minimum 200ms between attempts) - FASTER
    const now = Date.now();
    if (now - this.lastLoadTime < 200) {
      console.log('⚠️ Too soon since last load attempt, delaying...');
      setTimeout(() => this.loadRewardedAd(), 200);
      return;
    }

    this.lastLoadTime = now;
    this.isAdLoading = true;
    this.loadAttempts++;
    console.log(`📡 Loading ad (Attempt ${this.loadAttempts})...`);

    try {
      // CRITICAL: Clean up old ad instance completely before creating new one
      await this.cleanupAsync();

      // Create new ad instance
      console.log('🎯 Creating new RewardedAd instance...');
      this.rewardedAd = RewardedAd.createForAdRequest(ADMOB_CONFIG.rewardedAdUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      if (!this.rewardedAd) {
        throw new Error('Failed to create RewardedAd instance');
      }

      // Set up event listeners BEFORE loading
      this.setupEventListeners();

      // Load the ad
      console.log('📡 Requesting ad from AdMob network...');
      this.rewardedAd.load();
      console.log('✅ Ad load request sent to AdMob');

    } catch (error) {
      console.error('❌ Load setup failed:', error.message);
      this.isAdLoading = false;
      this.isAdLoaded = false;
      this.consecutiveErrors++;

      // Smart retry with exponential backoff - FASTER
      const retryDelay = Math.min(500 * Math.pow(1.3, Math.min(this.consecutiveErrors, 4)), 5000);
      console.log(`⏳ Retrying in ${Math.round(retryDelay)}ms... (Error #${this.consecutiveErrors})`);
      setTimeout(() => this.loadRewardedAd(), retryDelay);
    }
  }

  setupEventListeners() {
    if (!this.rewardedAd) return;

    // LOADED Event - ad is ready to show
    this.unsubscribeLoaded = this.rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log('✅ Ad loaded successfully - READY TO SHOW');
        this.isAdLoaded = true;
        this.isAdLoading = false;
        this.loadAttempts = 0;
        this.consecutiveErrors = 0;
        console.log(`📊 Stats: Total shown: ${this.totalAdsShown}, Ready: true`);
      }
    );

    // EARNED_REWARD Event - user watched and earned reward
    this.unsubscribeEarned = this.rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        this.totalAdsShown++;
        console.log(`🎉 REWARD EARNED! (Total ads watched: ${this.totalAdsShown})`);
        console.log(`🏆 Reward: ${reward.amount} ${reward.type}`);

        if (this.rewardCallback) {
          this.rewardCallback(reward);
          this.rewardCallback = null;
        }
      }
    );

    // CLOSED Event - ad was closed
    this.unsubscribeClosed = this.rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('🚪 Ad closed');
        this.isAdShowing = false;
        this.isAdLoaded = false;

        // CRITICAL: Preload next ad IMMEDIATELY for seamless unlimited watching
        console.log('⚡ Preloading next ad IMMEDIATELY for instant availability...');
        // Minimal delay to ensure cleanup - ULTRA FAST
        if (this.preloadTimer) clearTimeout(this.preloadTimer);
        this.preloadTimer = setTimeout(() => {
          this.loadRewardedAd();
        }, 50); // ✅ ULTRA FAST: 50ms for instant next ad
      }
    );

    // ERROR Event - ad failed to load
    this.unsubscribeError = this.rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.error('❌ Ad error:', error.message || error);
        this.isAdLoading = false;
        this.isAdLoaded = false;
        this.isAdShowing = false;
        this.consecutiveErrors++;

        // Call error callback if set
        if (this.errorCallback) {
          this.errorCallback(error.message || 'Tangazo halionekani');
          this.errorCallback = null;
        }

        // Smart retry with exponential backoff (max 5 seconds) - FASTER
        const retryDelay = Math.min(500 * Math.pow(1.3, Math.min(this.consecutiveErrors, 4)), 5000);
        console.log(`⏳ Will retry in ${Math.round(retryDelay / 1000)}s (Error #${this.consecutiveErrors})`);

        if (this.preloadTimer) clearTimeout(this.preloadTimer);
        this.preloadTimer = setTimeout(() => {
          this.loadRewardedAd();
        }, retryDelay);
      }
    );

    console.log('✅ All ad event listeners configured');
  }

  async showRewardedAd(onReward, onError) {
    try {
      // Check if ad is ready
      if (!this.isAdLoaded || !this.rewardedAd) {
        console.log('⚠️ Ad not ready');
        if (onError) onError('Tangazo halijaandaliwa. Tafadhali subiri kidogo...');

        // Start loading if not already
        if (!this.isAdLoading) {
          this.loadRewardedAd();
        }
        return false;
      }

      // Prevent showing if already showing
      if (this.isAdShowing) {
        console.log('⚠️ Ad already showing');
        return false;
      }

      console.log('🎬 Showing rewarded ad to user...');

      // Store callbacks
      this.rewardCallback = onReward;
      this.errorCallback = onError;

      // Mark as showing
      this.isAdShowing = true;
      this.isAdLoaded = false;

      // Show the ad
      await this.rewardedAd.show();

      console.log('✅ Ad show initiated successfully');
      return true;

    } catch (error) {
      console.error('❌ Show failed:', error.message);
      this.isAdShowing = false;
      this.isAdLoaded = false;

      if (onError) onError('Tangazo halionekani. Tafadhali jaribu tena.');

      // Try to reload for next attempt
      setTimeout(() => this.loadRewardedAd(), 1000);
      return false;
    }
  }

  isRewardedAdReady() {
    return this.isAdLoaded && this.rewardedAd !== null && !this.isAdShowing;
  }

  getAdStatus() {
    return {
      isLoaded: this.isAdLoaded,
      isLoading: this.isAdLoading,
      isShowing: this.isAdShowing,
      isReady: this.isRewardedAdReady(),
      loadAttempts: this.loadAttempts,
      consecutiveErrors: this.consecutiveErrors,
    };
  }

  forceReload() {
    console.log('🔄 Force reloading ad...');
    // Clear any pending preload
    if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
      this.preloadTimer = null;
    }

    // Reset state
    this.isAdLoaded = false;
    this.isAdLoading = false;
    this.isAdShowing = false;
    this.loadAttempts = 0;
    this.consecutiveErrors = 0;

    // Cleanup and reload
    this.cleanupAsync().then(() => {
      this.loadRewardedAd();
    });
  }

  getDiagnostics() {
    return {
      initialized: this.initialized,
      isAdLoaded: this.isAdLoaded,
      isAdLoading: this.isAdLoading,
      isAdShowing: this.isAdShowing,
      loadAttempts: this.loadAttempts,
      hasAd: this.rewardedAd !== null,
      totalAdsShown: this.totalAdsShown,
      consecutiveErrors: this.consecutiveErrors,
      unlimited: true,
      adUnitId: ADMOB_CONFIG.rewardedAdUnitId,
      isTestMode: __DEV__,
    };
  }

  printDiagnostics() {
    const diag = this.getDiagnostics();
    console.log('🔍 AdMob Status:');
    console.log(`   Initialized: ${diag.initialized}`);
    console.log(`   Ad Loaded: ${diag.isAdLoaded}`);
    console.log(`   Ad Loading: ${diag.isAdLoading}`);
    console.log(`   Ad Showing: ${diag.isAdShowing}`);
    console.log(`   Total Shown: ${diag.totalAdsShown}`);
    console.log(`   Errors: ${diag.consecutiveErrors}`);
    console.log(`   Test Mode: ${diag.isTestMode}`);
  }

  // Synchronous cleanup for immediate use
  cleanup() {
    this.cleanupListeners();
    this.rewardedAd = null;
  }

  // Async cleanup with proper waiting
  async cleanupAsync() {
    return new Promise((resolve) => {
      this.cleanupListeners();
      this.rewardedAd = null;
      // Small delay to ensure cleanup is complete
      setTimeout(resolve, 100);
    });
  }

  cleanupListeners() {
    try {
      if (this.unsubscribeLoaded && typeof this.unsubscribeLoaded === 'function') {
        this.unsubscribeLoaded();
      }
      if (this.unsubscribeEarned && typeof this.unsubscribeEarned === 'function') {
        this.unsubscribeEarned();
      }
      if (this.unsubscribeClosed && typeof this.unsubscribeClosed === 'function') {
        this.unsubscribeClosed();
      }
      if (this.unsubscribeError && typeof this.unsubscribeError === 'function') {
        this.unsubscribeError();
      }
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }

    this.unsubscribeLoaded = null;
    this.unsubscribeEarned = null;
    this.unsubscribeClosed = null;
    this.unsubscribeError = null;
    this.rewardCallback = null;
    this.errorCallback = null;
  }

  // Preload ad for faster availability
  preloadAd() {
    if (!this.isAdLoaded && !this.isAdLoading && !this.isAdShowing) {
      console.log('⚡ Preloading ad for faster availability...');
      this.loadRewardedAd();
    }
  }
}

// Export singleton instance
const adMobService = new AdMobService();
export default adMobService;
