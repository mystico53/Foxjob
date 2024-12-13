// $lib/stores/authStore.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function createAuthStore() {
    const { subscribe, set } = writable(null);

    if (browser) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Get the Google sub ID 
                const googleSubId = user.providerData[0]?.uid;
                
                // Write user data with sub ID as document ID
                const userRef = doc(db, 'users', googleSubId);
                await setDoc(userRef, {
                    displayName: user.displayName,
                    email: user.email,
                    firebaseUid: user.uid,
                    lastLogin: new Date()
                }, { merge: true });

                // Make sure we're setting a user object that has all needed properties
                set({
                    ...user,
                    subId: googleSubId,
                    uid: googleSubId // Override Firebase UID with sub ID if needed
                });
            } else {
                set(null);
            }
        });
    }

    return {
        subscribe,
        signOut: () => auth.signOut()
    };
}

export const authStore = createAuthStore();