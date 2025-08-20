// $lib/stores/scrapeStore.js
import { writable } from 'svelte/store';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '$lib/firebase'; // Import db from your firebase config

export const scrapeStore = writable([]);
export const isLoading = writable(false);
export const totalJobs = writable(0);
export const currentBatch = writable(0);
export let uid;

scrapeStore.subscribe((value) => {
	//console.log('🔄 scrapeStore updated:', value.length, 'jobs')
});

// Helper function to ensure collection exists
async function ensureCollectionExists(userId) {
	try {
		// Create a placeholder document to ensure the collection exists
		const placeholderRef = doc(db, 'users', userId);
		await setDoc(placeholderRef, { exists: true }, { merge: true });
		console.log('✅ Ensured user document exists:', userId);
	} catch (error) {
		console.error('❌ Error ensuring user document exists:', error);
	}
}

export function initJobListener(uid) {
	console.log('🎯 1. Initializing job listener for uid:', uid);
	isLoading.set(true);

	// Handle missing UID
	if (!uid) {
		console.log('⚠️ No uid provided, showing empty state');
		scrapeStore.set([]);
		totalJobs.set(0);
		currentBatch.set(0);
		isLoading.set(false);
		return () => {};
	}

	try {
		console.log(`📂 Attempting to access Firestore path: users/${uid}/scrapedJobs`);
		// Ensure user document exists
		ensureCollectionExists(uid);

		// Setup the listener
		const scrapedjobsRef = collection(db, 'users', uid, 'scrapedJobs');
		const q = query(scrapedjobsRef, orderBy('searchMetadata.processingDate', 'desc'));

		return onSnapshot(
			q,
			(snapshot) => {
				// Successfully connected to Firestore
				console.log('📥 Snapshot received:', {
					empty: snapshot.empty,
					size: snapshot.size
				});

				// Handle empty collection case
				if (snapshot.empty) {
					console.log('📭 No jobs found, showing empty state');
					scrapeStore.set([]);
					totalJobs.set(0);
					currentBatch.set(0);
					isLoading.set(false);
					return;
				}

				// Process jobs as before
				const jobs = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data()
				}));

				console.log('✨ Processed jobs:', jobs.length);
				scrapeStore.set(jobs);
				totalJobs.set(jobs.length);
				currentBatch.set(jobs.length);
				isLoading.set(false);
			},
			(error) => {
				console.error('🚨 Firestore listener error:', error);
				// Handle error by showing empty state
				scrapeStore.set([]);
				totalJobs.set(0);
				currentBatch.set(0);
				isLoading.set(false);
			}
		);
	} catch (error) {
		console.error('💥 Error setting up Firestore listener:', error);
		scrapeStore.set([]);
		totalJobs.set(0);
		currentBatch.set(0);
		isLoading.set(false);
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
