const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Suppress warnings
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add resolver configuration to handle warnings
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
