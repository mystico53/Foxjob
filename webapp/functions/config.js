// config.js

const functions = require('firebase-functions');

const defaultConfig = {
  pubsub: {
    useEmulator: false,
    emulatorHost: null,
  },
  // Add other configuration settings as needed
};

const devConfig = {
  pubsub: {
    useEmulator: true,
    emulatorHost: 'localhost:8085',
  },
  // Add other development-specific settings
};

function getConfig() {
  // Use Firebase config if available (in production)
  const firebaseConfig = functions.config().env || {};

  // Determine the environment
  const isProduction = firebaseConfig.node_env === 'production';

  // Merge configurations
  return {
    ...defaultConfig,
    ...(isProduction ? {} : devConfig),
    ...firebaseConfig,
  };
}

module.exports = getConfig();