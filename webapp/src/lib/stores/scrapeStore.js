// stores/scrapeStore.js
import { writable, derived } from 'svelte/store'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'

export const scrapeStore = writable([])
export const isLoading = writable(true)
export const latestBatchTimestamp = writable(null)

export function initJobListener(db, uid) {
  if (!uid) return

  // Get reference to user's scrapedjobs collection
  const scrapedjobsRef = collection(db, 'users', uid, 'scrapedjobs')

  // Query for the most recent jobs by storedAt timestamp
  const q = query(
    scrapedjobsRef,
    orderBy('storedAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Group jobs by batchId
    const latestBatchId = jobs.length > 0 ? jobs[0].batchId.split('-')[0] : null
    
    // Filter for only the latest batch's jobs
    const latestJobs = jobs.filter(job => 
      job.batchId.startsWith(latestBatchId)
    )

    scrapeStore.set(latestJobs)
    isLoading.set(false)
  })
}

// Add clear function for the store
export function clearScrapeStore() {
  scrapeStore.set([])
  latestBatchTimestamp.set(null)
}