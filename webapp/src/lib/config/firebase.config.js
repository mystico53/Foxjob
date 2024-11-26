// src/lib/config/firebase.config.js
const configs = {
    staging: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: "jobille-45494.web.app",
      projectId: "jobille-45494",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    },
    production: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: "foxjob-prod.firebaseapp.com",
      projectId: "foxjob-prod",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    }
  };
  
  export const getFirebaseConfig = () => {
    console.log('Current environment:', import.meta.env.MODE);
    const config = configs[import.meta.env.MODE] || configs.staging;
    console.log('Using Firebase config:', {
      authDomain: config.authDomain,
      projectId: config.projectId
    });
    return config;
  };