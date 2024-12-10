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
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const functions = getFunctions(app);

    if (browser) {
      // Connect to emulators in development mode
      if (import.meta.env.MODE === 'development') {
        console.log('Connecting to Firebase emulators...');
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
        console.log('Connected to Firebase emulators');
      }

      setPersistence(auth, browserLocalPersistence)
        .then(() => console.log("Authentication persistence set"))
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

// Custom sign-in function
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    console.log("Attempting to sign in with Google...");
    const result = await signInWithPopup(auth, provider);
    console.log("Sign in successful", result.user);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
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