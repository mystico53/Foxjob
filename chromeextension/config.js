// config.js
export const FIREBASE_CONFIG = {
  emulatorUrl: 'http://127.0.0.1:5001/jobille-45494/us-central1/publishJobText',
  productionUrl: 'https://us-central1-jobille-45494.cloudfunctions.net/publishJobText',
  useEmulator: false
};

// Helper function to check if emulator is running
export async function isEmulatorRunning() {
  try {
    const response = await fetch(FIREBASE_CONFIG.emulatorUrl, {
      method: 'OPTIONS'
    });
    return response.status === 204 || response.ok;
  } catch {
    return false;
  }
}

// Function to update extension icon
export async function updateExtensionIcon() {
  const isEmulator = await isEmulatorRunning();
  
  // Use different icons based on emulator status
  const iconPath = isEmulator ? {
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

  // Update the extension icon
  chrome.action.setIcon({ path: iconPath });
}

// Function to get the appropriate URL based on environment
export function getTargetUrl() {
  return FIREBASE_CONFIG.useEmulator ? FIREBASE_CONFIG.emulatorUrl : FIREBASE_CONFIG.productionUrl;
}