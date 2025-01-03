import { writable, derived } from 'svelte/store'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'

export const scrapeStore = writable([])
export const isLoading = writable(true)
export const latestBatchTimestamp = writable(null)
export const currentBatch = writable(0)
export const totalJobs = writable(0) // Add this store

export function initJobListener(db, uid) {
  if (!uid) return

  const scrapedjobsRef = collection(db, 'users', uid, 'scrapedjobs')
  const q = query(
    scrapedjobsRef,
    orderBy('storedAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const latestBatchId = jobs.length > 0 ? jobs[0].batchId.split('-')[0] : null
    const latestJobs = jobs.filter(job => 
      job.batchId.startsWith(latestBatchId)
    )

    currentBatch.set(latestBatchId ? parseInt(latestBatchId) : 0)
    totalJobs.set(latestJobs.length) // Update total jobs count
    scrapeStore.set(latestJobs)
    isLoading.set(false)
  })
}

export function clearScrapeStore() {
  scrapeStore.set([])
  latestBatchTimestamp.set(null)
  currentBatch.set(0)
  totalJobs.set(0)
}