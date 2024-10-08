// config.js
const FIREBASE_CONFIG = {
  emulatorUrl: 'http://127.0.0.1:5001/jobille-45494/us-central1/publishJobText',
  productionUrl: 'https://us-central1-jobille-45494.cloudfunctions.net/publishJobText',
  useEmulator: false
};

// Helper function to check if emulator is running
async function isEmulatorRunning() {
  try {
    const response = await fetch(FIREBASE_CONFIG.emulatorUrl, {
      method: 'OPTIONS'
    });
    return response.status === 204 || response.ok;
  } catch {
    return false;
  }
}

// New function to get the appropriate URL based on environment
function getTargetUrl() {
  return FIREBASE_CONFIG.useEmulator ? FIREBASE_CONFIG.emulatorUrl : FIREBASE_CONFIG.productionUrl;
}