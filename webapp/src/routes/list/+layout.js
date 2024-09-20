// src/routes/list/+layout.js
import { auth } from '$lib/firebase';
import { redirect } from '@sveltejs/kit';

export async function load() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (!user) {
        throw redirect(302, '/');
      }
      resolve({});
    });
  });
}