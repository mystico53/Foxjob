// src/lib/firebase.js
// src/lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut
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
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    auth.onAuthStateChanged((user) => {
      // Auth state change handled by store update
    });

    const db = getFirestore(app);
    const functions = getFunctions(app);

    // Set up the auth state listener
    if (browser) {
      authStateUnsubscribe = auth.onAuthStateChanged((user) => {
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
        .catch((error) => {
          // Handle persistence error silently
        });

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
  try {
    const provider = new GoogleAuthProvider();
    // Force popup mode and select account prompt
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw error;
  }
}

export async function signOutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}