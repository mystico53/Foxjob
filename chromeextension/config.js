// config.js

// Environment enum
export const Environment = {
  DEVELOPMENT: 0,
  STAGING: 1,
  PRODUCTION: 2
};

// Current environment setting
export const CURRENT_ENV = Environment.PRODUCTION;

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
    apiKey: "AIzaSyDiiK5-8yzXxhpSV-B-Prm-8FLtlJjeZO8",
    authDomain: "jobille-45494.firebaseapp.com",
    projectId: "jobille-45494",
    storageBucket: "jobille-45494.firebasestorage.app",
    messagingSenderId: "656035288386",
    appId: "1:656035288386:web:d034b9b6afc86f92fba4db",
    measurementId: "G-B9037MYKGY"
  },
  [Environment.STAGING]: {
    apiKey: "AIzaSyDiiK5-8yzXxhpSV-B-Prm-8FLtlJjeZO8",
    authDomain: "jobille-45494.firebaseapp.com",
    projectId: "jobille-45494",
    storageBucket: "jobille-45494.firebasestorage.app",
    messagingSenderId: "656035288386",
    appId: "1:656035288386:web:d034b9b6afc86f92fba4db",
    measurementId: "G-B9037MYKGY"
  },
  [Environment.PRODUCTION]: {
    apiKey: "AIzaSyBsTIQkh_vOHRcRE9UCXM5MIw_AX2lFs6A",
    authDomain: "foxjob-prod.firebaseapp.com",
    projectId: "foxjob-prod",
    storageBucket: "foxjob-prod.firebasestorage.app",
    messagingSenderId: "272779924090",
    appId: "1:272779924090:web:cdcc12777109fdab72a1c3",
    measurementId: "G-ZH7V3JPRQZ"
  }
};

// URL configurations per environment
export const URL_CONFIG = {
  [Environment.DEVELOPMENT]: {
    publishJob: `http://127.0.0.1:${EMULATOR_CONFIG.functions}/jobille-45494/us-central1/publishJobText`,
    authSignin: `http://127.0.0.1:${EMULATOR_CONFIG.auth}/auth/signin`,
    library: 'https://jobille-45494.web.app/workflow'
  },
  [Environment.STAGING]: {
    publishJob: 'https://us-central1-jobille-45494.cloudfunctions.net/publishJobText',
    authSignin: 'https://jobille-45494.web.app/auth/signin',
    library: 'https://jobille-45494.web.app/workflow'
  },
  [Environment.PRODUCTION]: {
    publishJob: 'https://us-central1-foxjob-prod.cloudfunctions.net/publishJobText',
    authSignin: 'https://foxjob-prod.web.app/auth/signin',
    library: 'https://foxjob.io/workflow'
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