// src/lib/firebase.js
// src/lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider, 
    signInWithPopup,
    connectAuthEmulator
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";
import { browser } from '$app/environment';
import { getFirebaseConfig } from '$lib/config/firebase.config';

const firebaseConfig = getFirebaseConfig();

function initializeFirebase() {
  if (!getApps().length) {
    console.log('Initializing Firebase with config:', {
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      // Don't log the actual API key for security
      apiKeyLength: firebaseConfig.apiKey?.length
    });
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    auth.onAuthStateChanged((user) => {
      console.log('Auth state changed, user:', user?.uid || 'null');
    });

    const db = getFirestore(app);
    const functions = getFunctions(app);

    if (browser) {
      // Connect to emulators in development mode
      if (import.meta.env.MODE === 'development') {
        //connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      }

      // Set up auth persistence
      setPersistence(auth, browserLocalPersistence)
        .catch((error) => console.error("Error setting authentication persistence:", error));

      const analytics = import.meta.env.MODE !== 'development' ? getAnalytics(app) : null;
      return { app, auth, db, functions, analytics };
    }

    return { app, auth, db, functions };
  }
  return {};
}

export const firebase = browser ? initializeFirebase() : {};
export const { app, auth, db, functions, analytics } = firebase;

// Enhanced sign-in function with better error handling
export async function signInWithGoogle() {
  console.log("Google sign-in flow started");
  if (!auth) throw new Error('Firebase auth not initialized');
  
  // Log current Firebase config (without sensitive data)
  console.log('Current Firebase config:', {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    isApiKeyPresent: !!auth.app.options.apiKey
  });

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Detailed sign-in error:", {
      code: error.code,
      message: error.message,
      customData: error.customData,
      credential: error.credential
    });
    
    // Handle API key specific errors
    if (error.code === 'auth/api-key-expired' || 
        error.message?.includes('API key expired')) {
      throw new Error('Authentication configuration error. Please contact support.');
    }

    // Your existing error handling...
    switch (error.code) {
      case 'auth/popup-blocked':
        throw new Error('Please enable popups for this site to sign in with Google');
      case 'auth/popup-closed-by-user':
        throw new Error('Sign-in cancelled');
      case 'auth/cancelled-popup-request':
        throw new Error('Sign-in cancelled');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your internet connection.');
      case 'auth/too-many-requests':
        throw new Error('Too many sign-in attempts. Please try again later.');
      default:
        throw new Error('Unable to sign in with Google. Please try again.');
    }
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

console.log('Current environment:', import.meta.env.MODE);
console.log('Using auth domain:', firebaseConfig.authDomain);