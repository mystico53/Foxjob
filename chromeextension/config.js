// config.js

// Environment enum
export const Environment = {
  DEVELOPMENT: 0,
  STAGING: 1,
  PRODUCTION: 2
};

// Current environment setting
export const CURRENT_ENV = Environment.STAGING;

// For backwards compatibility
export const USE_EMULATOR = false;

// Emulator ports configuration
export const EMULATOR_CONFIG = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199
};

// Firebase configurations per environment
export const FIREBASE_CONFIG = {
  [Environment.DEVELOPMENT]: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  },
  [Environment.STAGING]: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  },
  [Environment.PRODUCTION]: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  }
};

// URL configurations per environment
export const URL_CONFIG = {
  [Environment.DEVELOPMENT]: {
    publishJob: process.env.PUBLISH_JOB_URL,
    authSignin: process.env.AUTH_SIGNIN_URL,
    library: process.env.LIBRARY_URL
  },
  [Environment.STAGING]: {
    publishJob: process.env.PUBLISH_JOB_URL,
    authSignin: process.env.AUTH_SIGNIN_URL,
    library: process.env.LIBRARY_URL
  },
  [Environment.PRODUCTION]: {
    publishJob: process.env.PUBLISH_JOB_URL,
    authSignin: process.env.AUTH_SIGNIN_URL,
    library: process.env.LIBRARY_URL
  }
};

// Environment-specific icons
const ICONS = {
  development: {
    "16": "icons/E_icon16.png",
    "32": "icons/E_icon32.png",
    "48": "icons/E_icon48.png",
    "128": "icons/E_icon128.png"
  },
  production: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
};

// Function to get Firebase config for current environment
export function getFirebaseConfig() {
  const config = FIREBASE_CONFIG[CURRENT_ENV];
  
  if (isDevelopment()) {
    return {
      ...config,
      emulator: {
        enabled: true,
        host: '127.0.0.1',  // Changed from localhost to 127.0.0.1
        ports: EMULATOR_CONFIG
      }
    };
  }
  
  return config;
}

// Function to get URL for a specific service
export function getServiceUrl(serviceName) {
  return URL_CONFIG[CURRENT_ENV][serviceName];
}

// Environment helper functions
export function getCurrentEnvironment() {
  return CURRENT_ENV;
}

export function isDevelopment() {
  return CURRENT_ENV === Environment.DEVELOPMENT;
}

export function isStaging() {
  return CURRENT_ENV === Environment.STAGING;
}

export function isProduction() {
  return CURRENT_ENV === Environment.PRODUCTION;
}

// Function to initialize Firebase with emulator connections
export async function initializeFirebase(firebase) {
  const firebaseApp = firebase.initializeApp(getFirebaseConfig());
  
  if (isDevelopment()) {
    // Connect to auth emulator
    await firebase.auth().useEmulator(`http://127.0.0.1:${EMULATOR_CONFIG.auth}`);
    
    // Connect to firestore emulator
    firebase.firestore().useEmulator('127.0.0.1', EMULATOR_CONFIG.firestore);
    
    // Connect to functions emulator
    firebase.functions().useEmulator('127.0.0.1', EMULATOR_CONFIG.functions);
    
    // Connect to storage emulator
    firebase.storage().useEmulator('127.0.0.1', EMULATOR_CONFIG.storage);
    
    console.log('Connected to Firebase emulators');
  }
  
  return firebaseApp;
}

// Function to update extension icon
export async function updateExtensionIcon() {
  try {
    const iconPath = isProduction() ? ICONS.production : ICONS.development;
    await chrome.action.setIcon({ path: iconPath });
  } catch (error) {
    console.error('Error updating icon:', error);
    console.error('Current environment:', getEnvironmentName());
    console.error('Attempted icon path:', iconPath);
    throw error;
  }
}

// Helper function to get environment name (useful for logging)
export function getEnvironmentName() {
  switch (CURRENT_ENV) {
    case Environment.DEVELOPMENT:
      return 'Development';
    case Environment.STAGING:
      return 'Staging';
    case Environment.PRODUCTION:
      return 'Production';
    default:
      return 'Unknown';
  }
}

// Export the icons configuration for potential external use
export const IconsConfig = ICONS;