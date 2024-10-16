import { browser } from '$app/environment';
import { auth } from '$lib/firebase';
import { redirect } from '@sveltejs/kit';

/*
export async function load({ url }) {
  if (!browser) {
    // We're on the server, return immediately
    return {};
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();

      if (!user && url.pathname !== '/') {
        console.log('No user detected, redirecting to root.');
        // Redirect the user to root if they are not authenticated
        reject(redirect(302, '/'));
      } else {
        // Resolve without redirect if authenticated
        console.log('User detected, allowing access.');
        resolve({});
      }
    });

    // Timeout fallback to ensure the promise resolves
    setTimeout(() => {
      unsubscribe();
      console.log('Firebase auth timeout, resolving.');
      resolve({});
    }, 5000); // 5 second timeout
  });
}*/
