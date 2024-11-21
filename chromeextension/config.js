// config.js
export const FIREBASE_CONFIG = {
  emulatorUrl: 'http://127.0.0.1:5001/jobille-45494/us-central1/publishJobText',
  productionUrl: 'https://us-central1-jobille-45494.cloudfunctions.net/publishJobText',
  useEmulator: false
};

// Function to check if we're in development version
export async function isDevelopmentVersion() {
  const manifest = chrome.runtime.getManifest();
  const version = parseFloat(manifest.version);
  console.log('Current version:', version);
  return version >= 2.0;  // Development versions are 2.0 and above
}

// Function to update extension icon
export async function updateExtensionIcon() {
  console.log('Starting icon update process...');
  try {
    const isDev = await isDevelopmentVersion();
    console.log('Is development version?', isDev);
    
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
export function getTargetUrl() {
  return FIREBASE_CONFIG.useEmulator ? FIREBASE_CONFIG.emulatorUrl : FIREBASE_CONFIG.productionUrl;
}