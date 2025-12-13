const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resetCache: true,
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Disable watch mode for production builds
        if (req.url && req.url.includes('bundle')) {
          req.bundleOptions = req.bundleOptions || {};
          req.bundleOptions.hot = false;
        }
        return middleware(req, res, next);
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
