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
                console.log(`[${timestamp}] Auth store detected signed in user:`, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                });

                // Delay Firestore write to avoid token invalidation
                setTimeout(async () => {
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await setDoc(userRef, {
                            displayName: user.displayName,
                            email: user.email,
                            lastSignIn: timestamp
                        }, { merge: true });

                        console.log(`[${timestamp}] Successfully updated user data in Firestore`);
                    } catch (error) {
                        if (error.code === 'permission-denied') {
                            console.warn(`[${timestamp}] Firestore write permission denied for user ${user.uid}. Check your Firestore rules.`);
                        } else {
                            console.error(`[${timestamp}] Error writing user data to Firestore:`, {
                                code: error.code,
                                message: error.message
                            });
                        }
                    }
                }, 1000); // 1 second delay
            } else {
                console.log(`[${timestamp}] Auth store detected signed out state`);
            }
        });
    }

    return {
        subscribe,
        signOut: async () => {
            const timestamp = new Date().toISOString();
            try {
                await auth.signOut();
                console.log(`[${timestamp}] User signed out successfully`);
            } catch (error) {
                console.error(`[${timestamp}] Error during sign out:`, error);
                throw error;
            }
        }
    };
}

export const authStore = createAuthStore();