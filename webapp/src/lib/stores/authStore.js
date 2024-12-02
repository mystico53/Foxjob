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
                // Write basic user info to Firestore
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, {
                    displayName: user.displayName,
                    email: user.email
                }, { merge: true }); // merge: true prevents overwriting other fields
            }
            set(user);
        });
    }

    return {
        subscribe,
        signOut: () => auth.signOut()
    };
}

export const authStore = createAuthStore();