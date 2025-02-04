// $lib/stores/scrapeStore.js
import { writable } from 'svelte/store'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '$lib/firebase'  // Import db from your firebase config

export const scrapeStore = writable([])
export const isLoading = writable(false)
export const totalJobs = writable(0)
export const currentBatch = writable(0)
export let uid; 

scrapeStore.subscribe(value => {
  console.log('🔄 scrapeStore updated:', value.length, 'jobs')
})

export function initJobListener(uid) {
  console.log('🎯 1. Initializing job listener for uid:', uid);
  
  async function setupListener(userId) {
    const scrapedjobsRef = collection(db, 'users', userId, 'scrapedJobs');  // Using imported db
    const q = query(scrapedjobsRef, orderBy('searchMetadata.processingDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        console.log('📥 Snapshot received:', {
          empty: snapshot.empty,
          size: snapshot.size
        });

        if (snapshot.empty) {
          if (userId !== 'test_user') {
            console.log('No jobs found for user, trying test_user');
            return setupListener('test_user');
          }
          scrapeStore.set([]);
          currentBatch.set(0);
          return;
        }

        const jobs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data // Start with all data
          };
        });

        console.log('✨ Processed jobs:', jobs);
        
        scrapeStore.set(jobs);
        totalJobs.set(jobs.length);
        currentBatch.set(jobs.length);
        isLoading.set(false);  // Don't forget to set loading to false when done!
      },
      (error) => {
        console.error('🚨 Firestore listener error:', error);
        if (userId !== 'test_user') {
          console.log('Error with user, trying test_user');
          return setupListener('test_user');
        }
      }
    );
  }

  try {
    if (!uid) {
      console.log('No uid provided, using test_user');
      return setupListener('test_user');
    }
    return setupListener(uid);
  } catch (error) {
    console.error('💥 Error setting up Firestore listener:', error);
    return () => {};
  }
}

export function clearScrapeStore() {
  console.log('🧹 Clearing scrape store');
  scrapeStore.set([]);
  totalJobs.set(0);
  currentBatch.set(0);
  isLoading.set(false);
}