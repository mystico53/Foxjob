<!-- SortControls.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { sortConfig, sortedJobs, jobStore } from '$lib/jobStore';
	import { writeBatch, collection, getDocs } from 'firebase/firestore';
    import { db, auth } from '$lib/firebase';

	let selectedSort = 'Score.totalScore';
	let deleting = false;
	let currentUser = null;
	let unsubscribe;

	onMount(() => {
		unsubscribe = auth.onAuthStateChanged((user) => {
			currentUser = user;
			console.log('Auth state changed:', currentUser?.uid); // Debug log
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});

	// Initialize sortConfig with Score as default
	if (!$sortConfig.column) {
		$sortConfig = {
			column: 'Score.totalScore',
			direction: 'desc'
		};
	}

	function handleSortChange(event) {
		selectedSort = event.target.value;
		$sortConfig = {
			column: selectedSort,
			direction: 'desc' // Both Score and Date should be desc (highest/newest first)
		};
	}

	async function deleteAllJobs() {
		if (!currentUser) {
			alert('You must be logged in to perform this action.');
			return;
		}

		const confirmation = confirm('Are you sure you want to delete all your jobs? This action cannot be undone.');
		if (!confirmation) return;

		deleting = true;

		try {
			console.log('Attempting to delete jobs...');
			
			const jobsRef = collection(db, 'users', currentUser.uid, 'jobs');
			const processedRef = collection(db, 'users', currentUser.uid, 'processed');

			const jobsSnapshot = await getDocs(jobsRef);
			const processedSnapshot = await getDocs(processedRef);

			if (jobsSnapshot.empty && processedSnapshot.empty) {
				alert('No jobs to delete.');
				deleting = false;
				return;
			}

			let batch = writeBatch(db);
			let count = 0;
			const promises = [];

			const deleteDocuments = (snapshot) => {
				snapshot.forEach((docSnapshot) => {
					console.log(`Deleting document: ${docSnapshot.ref.path}`);
					batch.delete(docSnapshot.ref);
					count++;

					if (count === 500) {
						promises.push(batch.commit());
						batch = writeBatch(db);
						count = 0;
					}
				});
			};

			deleteDocuments(jobsSnapshot);
			deleteDocuments(processedSnapshot);

			if (count > 0) {
				promises.push(batch.commit());
			}

			await Promise.all(promises);
			console.log('Deletion completed');
			
			// Refresh the job store
			if (currentUser) {
				jobStore.init(currentUser.uid);
			}
		} catch (err) {
			console.error('Error deleting jobs:', err);
			alert('Failed to delete jobs. Please try again.');
		} finally {
			deleting = false;
		}
	}

</script>

<div class="flex items-center justify-between p-4">
	<div class="flex items-center gap-2">
		<div class="text-2xl font-bold">
			{$sortedJobs?.length || 0} jobs
		</div>
		<button 
			class="p-2 text-surface-400 hover:text-red-500 transition-colors disabled:opacity-50 rounded-full hover:bg-surface-200"
			on:click={deleteAllJobs}
			disabled={deleting}
			title="Delete all jobs"
		>
			<iconify-icon icon="solar:trash-bin-trash-bold" width="20" height="20"></iconify-icon>
		</button>
	</div>

	<select
		value={selectedSort}
		on:change={handleSortChange}
		class="w-44 rounded-lg border border-gray-200 bg-white p-2"
	>
		<option value="Score.totalScore">View by Score</option>
		<option value="generalData.timestamp">View by Date</option>
	</select>
</div>
