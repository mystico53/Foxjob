// config.js
const FIREBASE_CONFIG = {
    emulatorUrl: 'http://127.0.0.1:5001/jobille-45494/us-central1/processText', // Adjust the port and path
    productionUrl: 'https://processtext-kvshkfhmua-uc.a.run.app',
    useEmulator: false // This will be updated dynamically
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