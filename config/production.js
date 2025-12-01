export const PRODUCTION_CONFIG = {
  API: {
    BASE_URL: 'https://supasoka-backend.onrender.com/api',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
  },
  
  SOCKET: {
    URL: 'https://supasoka-backend.onrender.com',
    RECONNECTION: true,
    RECONNECTION_ATTEMPTS: 5,
    RECONNECTION_DELAY: 1000,
  },

  APP: {
    NAME: 'Supasoka',
    VERSION: '1.0.0',
    ENVIRONMENT: 'production',
  },

  FEATURES: {
    REAL_TIME_NOTIFICATIONS: true,
    DRM_SUPPORT: true,
    OFFLINE_MODE: true,
    ANALYTICS: true,
    POINTS_SYSTEM: true,
    FREE_TRIAL: true,
  },

  PAYMENT: {
    SUPPORTED_NETWORKS: ['vodacom_mpesa', 'tigopesa', 'airtel_money', 'halopesa'],
    DEFAULT_NETWORK: 'vodacom_mpesa',
    MIN_AMOUNT: 500,
    MAX_AMOUNT: 1000000,
  },

  SUBSCRIPTION: {
    BUNDLES: [
      { id: 'week', name: 'Wiki 1', price: 2000, days: 7 },
      { id: 'month', name: 'Mwezi 1', price: 5000, days: 30 },
      { id: 'year', name: 'Mwaka 1', price: 50000, days: 365 },
    ],
  },

  POINTS: {
    AD_REWARD: 10,
    CHANNEL_UNLOCK_COST: 50,
    MAX_HISTORY: 10,
  },

  FREE_TRIAL: {
    DURATION_MINUTES: 30,
    ENABLED: true,
  },

  VIDEO: {
    BUFFER_CONFIG: {
      DRM: {
        minBufferMs: 20000,
        maxBufferMs: 60000,
        bufferForPlaybackMs: 3000,
        bufferForPlaybackAfterRebufferMs: 6000,
      },
      HLS: {
        minBufferMs: 15000,
        maxBufferMs: 50000,
        bufferForPlaybackMs: 2500,
        bufferForPlaybackAfterRebufferMs: 5000,
      },
      DEFAULT: {
        minBufferMs: 10000,
        maxBufferMs: 30000,
        bufferForPlaybackMs: 2000,
        bufferForPlaybackAfterRebufferMs: 4000,
      },
    },
  },
};

export default PRODUCTION_CONFIG;
