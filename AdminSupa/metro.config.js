const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only watches the current project directory
config.watchFolders = [__dirname];

// Set the project root to the current directory
config.projectRoot = __dirname;

// Reset resolver to avoid looking in parent directories
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
};

module.exports = config;
