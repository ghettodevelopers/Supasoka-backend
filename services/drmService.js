import apiService from './api';

class DRMService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async preprocessDRM(channel) {
    if (!channel.drmEnabled || !channel.drmConfig) {
      return null;
    }

    // Check cache first
    const cacheKey = `drm_${channel.id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`✅ Using cached DRM config for channel ${channel.id}`);
      return cached.config;
    }

    try {
      // Try backend preprocessing first
      const response = await apiService.post('/channels/drm/preprocess', {
        channelId: channel.id,
        drmConfig: channel.drmConfig,
      });

      const config = response.drmConfig;
      
      // Cache the result
      this.cache.set(cacheKey, {
        config,
        timestamp: Date.now(),
      });

      console.log(`✅ DRM config preprocessed for channel ${channel.id}`);
      return config;

    } catch (error) {
      console.log('⚠️ Backend preprocessing failed, using client-side:', error.message);
      
      // Fallback to client-side preprocessing
      const config = this.clientSidePreprocess(channel.drmConfig);
      
      // Cache the result
      this.cache.set(cacheKey, {
        config,
        timestamp: Date.now(),
      });

      return config;
    }
  }

  clientSidePreprocess(drmConfig) {
    try {
      const config = typeof drmConfig === 'string' ? JSON.parse(drmConfig) : drmConfig;

      if (config.type === 'clearkey' && config.clearkey) {
        return {
          type: 'clearkey',
          clearkey: {
            keyId: this.formatHexKey(config.clearkey.keyId),
            key: this.formatHexKey(config.clearkey.key),
            contentId: config.clearkey.contentId || '',
            licenseUrl: config.clearkey.licenseUrl || '',
            headers: config.clearkey.headers || {},
          },
        };
      }

      return config;
    } catch (error) {
      console.error('Client-side DRM preprocessing error:', error);
      return null;
    }
  }

  formatHexKey(key) {
    if (!key) return '';
    
    // Remove any non-hex characters
    const cleaned = key.replace(/[^0-9a-fA-F]/g, '');
    
    // Ensure it's 32 characters (128 bits)
    if (cleaned.length === 32) {
      return cleaned.toLowerCase();
    }
    
    // Pad or truncate to 32 characters
    return cleaned.padEnd(32, '0').substring(0, 32).toLowerCase();
  }

  async preloadDRMConfigs(channels) {
    console.log(`🔄 Preloading DRM configs for ${channels.length} channels...`);
    
    const drmChannels = channels.filter(c => c.drmEnabled && c.drmConfig);
    
    // Process in batches of 3 to avoid overwhelming the server
    const batchSize = 3;
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
