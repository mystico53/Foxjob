// src/routes/list/+layout.js
import { browser } from '$app/environment';
import { auth } from '$lib/firebase';
import { redirect } from '@sveltejs/kit';

export async function load() {
  if (!browser) {
    // We're on the server, return immediately
    return {};
  }

  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (!user) {
        throw redirect(302, '/');
      }
      resolve({});
    });

    // Set a timeout to avoid hanging indefinitely
    setTimeout(() => {
      unsubscribe();
      resolve({});
    }, 5000); // 5 second timeout
  });
}