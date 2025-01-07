import { writable } from 'svelte/store'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

export const scrapeStore = writable([])
export const isLoading = writable(false)
export const totalJobs = writable(0)
export const currentBatch = writable(0) // Add missing export

scrapeStore.subscribe(value => {
  console.log('🔄 scrapeStore updated:', value.length, 'jobs')
})

export function initJobListener(db, uid) {
  console.log('🎯 1. Initializing job listener for uid:', uid);
  if (!uid) {
    console.warn('❌ No uid provided to initJobListener');
    return;
  }

  try {
    const scrapedjobsRef = collection(db, 'users', uid, 'scrapedjobs');
    
    const q = query(
      scrapedjobsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📥 Snapshot received:', {
          empty: snapshot.empty,
          size: snapshot.size
        });

        if (snapshot.empty) {
          scrapeStore.set([]);
          currentBatch.set(0);
          return;
        }

        const jobs = snapshot.docs
          .filter(doc => doc.data().verificationStatus === 'Success')
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.details?.title || data.basicInfo?.job_title,
              company: data.details?.company || data.basicInfo?.company_name,
              jobUrl: data.basicInfo?.job_link || data.details?.url,
              description: data.details?.description,
              location: data.details?.location,
              salary: data.details?.salary,
              datePosted: data.details?.datePosted,
              createdAt: data.createdAt
            };
          });

        console.log('✨ Processed', jobs.length, 'verified jobs');
        
        scrapeStore.set(jobs);
        totalJobs.set(jobs.length);
        currentBatch.set(jobs.length);
      },
      (error) => {
        console.error('🚨 Firestore listener error:', error);
      }
    );

    return unsubscribe;
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
  isLoading.set(false); // Ensure loading state is reset when clearing
}