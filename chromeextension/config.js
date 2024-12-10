// config.js

// Environment enum
export const Environment = {
  DEVELOPMENT: 0,
  STAGING: 1,
  PRODUCTION: 2
};

// Current environment setting
export const CURRENT_ENV = Environment.DEVELOPMENT;

// Emulator configuration
export const USE_EMULATOR = false;

// URL configurations per environment
export const URL_CONFIG = {
  [Environment.DEVELOPMENT]: {
    publishJob: 'http://127.0.0.1:5001/jobille-45494/us-central1/publishJobText',
    authSignin: 'http://localhost:5000/auth/signin',
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
    library: 'https://foxjob.io/workflow'  // Added library URL
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

// Function to get URL for a specific service
export function getServiceUrl(serviceName) {
  if (USE_EMULATOR) {
    return URL_CONFIG[Environment.DEVELOPMENT][serviceName];
  }
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

// Function to update extension icon
export async function updateExtensionIcon() {
  try {
    // Use development icons for both development and staging environments
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