// src/lib/firebase.js
// src/lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut,
    connectAuthEmulator
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";
import { browser } from '$app/environment';
import { getFirebaseConfig } from '$lib/config/firebase.config';
import { writable } from 'svelte/store';

const firebaseConfig = getFirebaseConfig();

// Create a Svelte store for auth state
export const authState = writable(null);
let authStateUnsubscribe = null;

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
      console.log(`[${new Date().toISOString()}] Auth state changed:`, user?.uid || 'null');
    });

    const db = getFirestore(app);
    const functions = getFunctions(app);

    // Set up the auth state listener
    if (browser) {
      authStateUnsubscribe = auth.onAuthStateChanged((user) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Firebase auth state changed:`, {
          uid: user?.uid || 'null',
          email: user?.email,
          emailVerified: user?.emailVerified,
          provider: user?.providerData?.[0]?.providerId
        });
        
        // Update the Svelte store
        authState.set(user);
      });

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

// Clean up auth state listener on app termination
if (browser) {
  window.addEventListener('unload', () => {
    if (authStateUnsubscribe) {
      authStateUnsubscribe();
    }
  });
}

export async function signInWithGoogle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Google sign-in flow started`);
  
  try {
    const provider = new GoogleAuthProvider();
    // Force popup mode and select account prompt
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    console.log(`[${timestamp}] Google sign-in successful:`, {
      uid: result.user.uid,
      email: result.user.email,
      provider: result.user.providerData[0]?.providerId
    });
    return result.user;
  } catch (error) {
    console.error(`[${timestamp}] Google sign-in error:`, {
      code: error.code,
      message: error.message,
      email: error.email,
      credential: error.credential
    });
    throw error;
  }
}

export async function signOutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
    console.log(`[${new Date().toISOString()}] User signed out successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error signing out:`, error);
    throw error;
  }
}

console.log(`[${new Date().toISOString()}] Current environment:`, import.meta.env.MODE);
console.log(`[${new Date().toISOString()}] Using auth domain:`, firebaseConfig.authDomain);