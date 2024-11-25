// config.js
export const FIREBASE_CONFIG = {
  emulatorUrl: 'http://127.0.0.1:5001/jobille-45494/us-central1/publishJobText',
  stagingUrl: 'https://us-central1-jobille-45494.cloudfunctions.net/publishJobText',
  productionUrl: 'https://us-central1-foxjob-prod.cloudfunctions.net/publishJobText',
  useEmulator: false
};

export const AUTH_CONFIG = {
  emulatorUrl: 'http://localhost:3000/auth/signin',
  stagingUrl: 'https://jobille-45494.web.app/auth/signin',
  productionUrl: 'https://foxjob-prod.web.app/auth/signin',
  useEmulator: false  // Reuse existing useEmulator flag from FIREBASE_CONFIG
};

export async function getAuthUrl() {
  if (FIREBASE_CONFIG.useEmulator) {  // Reuse existing useEmulator flag
    return AUTH_CONFIG.emulatorUrl;
  }
  
  const isProd = await isProductionVersion();
  return isProd ? AUTH_CONFIG.productionUrl : AUTH_CONFIG.stagingUrl;
}

// Function to check if we're in development version
export async function isDevelopmentVersion() {
  const manifest = chrome.runtime.getManifest();
  const version = parseFloat(manifest.version);
  console.log('Current version:', version);
  return version >= 2.0;  // Development versions are 2.0 and above
}

// Function to check if we're in production version
export async function isProductionVersion() {
  const manifest = chrome.runtime.getManifest();
  const version = parseFloat(manifest.version);
  console.log('Current version:', version);
  return version >= 3.0;  // Production versions are 3.0 and above
}

// Function to update extension icon
export async function updateExtensionIcon() {
  console.log('Starting icon update process...');
  try {
    const isDev = await isDevelopmentVersion();
    const isProd = await isProductionVersion();
    console.log('Is development version?', isDev);
    console.log('Is production version?', isProd);
    
    // Use different icons based on version
    const iconPath = isDev ? {
      "16": "icons/E_icon16.png",
      "32": "icons/E_icon32.png",
      "48": "icons/E_icon48.png",
      "128": "icons/E_icon128.png"
    } : {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    };

    console.log('Setting icon path to:', iconPath);
    await chrome.action.setIcon({ path: iconPath });
    console.log('Icon update completed successfully');
  } catch (error) {
    console.error('Error updating icon:', error);
    throw error;
  }
}

// Function to get the appropriate URL based on environment
export async function getTargetUrl() {
  if (FIREBASE_CONFIG.useEmulator) {
    return FIREBASE_CONFIG.emulatorUrl;
  }
  
  const isProd = await isProductionVersion();
  return isProd ? FIREBASE_CONFIG.productionUrl : FIREBASE_CONFIG.stagingUrl;
}