import { auth } from '$lib/firebase';
import { goto } from '$app/navigation';

// List of routes that don't require authentication
const publicRoutes = ['/landing', '/login', '/'];

/** @type {import('@sveltejs/kit').HandleClientError} */
export function handleError({ error }) {
	console.error('Client error:', error);
	return { message: error.message };
}

/** @type {import('@sveltejs/kit').HandleClientInit} */
export function init() {
	// Initialize any client-side resources
	return {};
}

/** @type {import('@sveltejs/kit').HandleClientNavigate} */
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
