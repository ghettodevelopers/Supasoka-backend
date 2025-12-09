import apiService from './api';

class DRMService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes (increased from 5 for better performance)
  }

  async preprocessDRM(channel) {
    if (!channel.drmEnabled || !channel.drmConfig) {
      return null;
    }

    // Check cache first for instant loading
    const cacheKey = `drm_${channel.id}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`⚡ Using cached DRM config for channel ${channel.id} (instant)`);
      return cached.config;
    }

    try {
      // Use client-side preprocessing for instant loading (no network delay)
      const config = this.clientSidePreprocess(channel.drmConfig);

      // Cache the result immediately
      this.cache.set(cacheKey, {
        config,
        timestamp: Date.now(),
      });

      console.log(`⚡ DRM config processed instantly for channel ${channel.id}`);
      return config;

    } catch (error) {
      console.error('❌ DRM preprocessing error:', error);
      return null;
    }
  }

  clientSidePreprocess(drmConfig) {
    try {
      const config = typeof drmConfig === 'string' ? JSON.parse(drmConfig) : drmConfig;

      // Handle ClearKey DRM
      if (config.type === 'clearkey' && config.clearkey) {
        const keyId = this.formatHexKey(config.clearkey.keyId);
        const key = this.formatHexKey(config.clearkey.key);
        // Strict validation: must be 32 hex chars
        if (keyId.length !== 32 || key.length !== 32) {
          console.error('❌ Invalid ClearKey DRM keys: keyId or key not 32 hex chars', { keyId, key });
          return null; // Fallback to non-DRM in player
        }
        const clearkeyConfig = {
          type: 'clearkey',
          clearkey: { keyId, key },
        };
        // Add optional fields if present
        if (config.clearkey.contentId) clearkeyConfig.clearkey.contentId = config.clearkey.contentId;
        if (config.clearkey.licenseUrl) clearkeyConfig.clearkey.licenseUrl = config.clearkey.licenseUrl;
        if (config.clearkey.headers) clearkeyConfig.clearkey.headers = config.clearkey.headers;
        console.log('✅ ClearKey DRM config processed:', { keyIdLength: keyId.length, keyLength: key.length });
        return clearkeyConfig;
      }

      // Handle Widevine DRM
      if (config.type === 'widevine' && config.widevine) {
        console.log('✅ Widevine DRM config processed');
        return config;
      }

      // Handle PlayReady DRM
      if (config.type === 'playready' && config.playready) {
        console.log('✅ PlayReady DRM config processed');
        return config;
      }

      // Return as-is if unknown type
      console.warn('⚠️ Unknown DRM type, returning as-is:', config.type);
      return config;

    } catch (error) {
      console.error('❌ Client-side DRM preprocessing error:', error);
      return null;
    }
  }

  formatHexKey(key) {
    if (!key) return '';

    // Handle base64 encoded keys (common in ClearKey DRM)
    if (key.includes('=') || key.includes('+') || key.includes('/')) {
      try {
        // Decode base64 to hex
        const decoded = Buffer.from(key, 'base64').toString('hex');
        return this.formatHexKey(decoded); // Recursively format
      } catch (error) {
        console.warn('⚠️ Failed to decode base64 key, using as-is');
      }
    }

    // Remove any non-hex characters (spaces, dashes, etc.)
    const cleaned = key.replace(/[^0-9a-fA-F]/g, '');

    // Ensure it's 32 characters (128 bits) for AES-128
    if (cleaned.length === 32) {
      return cleaned.toLowerCase();
    }

    // If too short, pad with zeros; if too long, truncate
    const formatted = cleaned.padEnd(32, '0').substring(0, 32).toLowerCase();

    if (cleaned.length !== 32) {
      console.warn(`⚠️ DRM key length mismatch: expected 32, got ${cleaned.length}, formatted to: ${formatted}`);
    }

    return formatted;
  }

  async preloadDRMConfigs(channels) {
    console.log(`🔄 Preloading DRM configs for ${channels.length} channels...`);

    const drmChannels = channels.filter(c => c.drmEnabled && c.drmConfig);

    // Process in batches of 5 for faster parallel processing (increased from 3)
    const batchSize = 5;
    for (let i = 0; i < drmChannels.length; i += batchSize) {
      const batch = drmChannels.slice(i, i + batchSize);
      await Promise.all(batch.map(channel => this.preprocessDRM(channel)));
    }

    console.log(`✅ Preloaded ${drmChannels.length} DRM configs`);
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ DRM cache cleared');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

const drmService = new DRMService();
export default drmService;
