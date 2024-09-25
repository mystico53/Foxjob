import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { auth } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function createAuthStore() {
    const { subscribe, set } = writable(null);

    if (browser) {
        onAuthStateChanged(auth, (user) => {
            set(user);
        });
    }

    return {
        subscribe,
        signOut: () => auth.signOut()
    };
}

export const authStore = createAuthStore();