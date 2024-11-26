import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { browser } from '$app/environment';
import { getFirebaseConfig } from '$lib/config/firebase.config';

const firebaseConfig = getFirebaseConfig();

function initializeFirebase() {
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    if (browser) {
      setPersistence(auth, browserLocalPersistence)
        .then(() => console.log("Authentication persistence set"))
        .catch((error) => console.error("Error setting authentication persistence:", error));

      const analytics = getAnalytics(app);
      return { app, auth, db, analytics };
    }

    return { app, auth, db };
  }
  return {};
}

export const firebase = browser ? initializeFirebase() : {};
export const { app, auth, db, analytics } = firebase;

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