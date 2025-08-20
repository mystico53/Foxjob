// $lib/stores/statusMonitoringStore.js
import { writable } from 'svelte/store';
import { db } from '$lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

function createJobStore() {
	const { subscribe, set, update } = writable({
		jobs: [],
		loading: true,
		error: null
	});

	let unsubscribe = null;

	return {
		subscribe,
		init: async (userId) => {
			update((state) => ({ ...state, loading: true, error: null }));

			try {
				const jobsRef = collection(db, 'users', userId, 'jobs');
				const jobsQuery = query(jobsRef);

				unsubscribe = onSnapshot(
					jobsQuery,
					async (snapshot) => {
						const jobs = snapshot.docs.map((doc) => ({
							id: doc.id,
							...doc.data(),
							generalData: {
								...doc.data().generalData,
								timestamp: doc.data().generalData?.timestamp || null
							}
						}));

						update((state) => ({
							...state,
							jobs,
							loading: false
						}));
					},
					(err) => {
						console.error('Jobs listener error:', err);
						update((state) => ({
							...state,
							error: 'Failed to load jobs',
							loading: false
						}));
					}
				);
			} catch (err) {
				console.error('Store initialization error:', err);
				update((state) => ({
					...state,
					error: 'Failed to initialize jobs',
					loading: false
				}));
			}
		},
		cleanup: () => {
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
			set({ jobs: [], loading: true, error: null });
		}
	};
}

export const jobStore = createJobStore();
