import { auth } from '$lib/firebase';
import { goto } from '$app/navigation';

// List of routes that don't require authentication
const publicRoutes = ['/landing', '/login', '/'];

/** @type {import('@sveltejs/kit').HandleClientError} */
export async function handleNavigate({ to }) {
    // If trying to access a protected route
    if (!publicRoutes.includes(to.pathname)) {
        // Check auth state
        const user = await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });

        // If not authenticated, redirect to landing
        if (!user) {
            goto('/landing');
            return false; // Prevent navigation
        }
    }
}