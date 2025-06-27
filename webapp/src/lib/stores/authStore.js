// $lib/stores/authStore.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function createAuthStore() {
    const { subscribe, set } = writable(null);

    if (browser) {
        onAuthStateChanged(auth, (user) => {
            const timestamp = new Date().toISOString();

            // Update the auth store state immediately
            set(user);

            if (user) {
                // Delay Firestore write to avoid token invalidation
                setTimeout(async () => {
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await setDoc(userRef, {
                            displayName: user.displayName,
                            email: user.email,
                            lastSignIn: timestamp
                        }, { merge: true });
                    } catch (error) {
                        // Handle errors silently
                    }
                }, 1000); // 1 second delay
            }
        });
    }

    return {
        subscribe,
        signOut: async () => {
            try {
                await auth.signOut();
            } catch (error) {
                throw error;
            }
        }
    };
}

export const authStore = createAuthStore();