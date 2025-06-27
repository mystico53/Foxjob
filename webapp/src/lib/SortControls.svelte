<!-- SortControls.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { sortConfig, sortedJobs, jobStore } from '$lib/stores/jobStore';
    import { writeBatch, collection, getDocs, query, limit } from 'firebase/firestore';
    import { db, auth } from '$lib/firebase';

    let deleting = false;
    let currentUser = null;
    let unsubscribe;

    onMount(() => {
        unsubscribe = auth.onAuthStateChanged((user) => {
            currentUser = user;
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    function handleSortChange(event) {
        const newValue = event.target.value;
        $sortConfig = {
            column: newValue,
            direction: 'desc'
        };
    }

    async function deleteAllJobs() {
        if (!currentUser) {
            alert('You must be logged in to perform this action.');
            return;
        }

        const confirmation = confirm(
            'Are you sure you want to delete all your jobs? This action cannot be undone.'
        );
        if (!confirmation) return;

        deleting = true;

        try {
            const jobsRef = collection(db, 'users', currentUser.uid, 'jobs');
            const processedRef = collection(db, 'users', currentUser.uid, 'processed');
            const scrapedJobsRef = collection(db, 'users', currentUser.uid, 'scrapedJobs');

            // Use query with limit to handle large collections more efficiently
            const batchSize = 450; // Reduced from 500 to provide safety margin
            let totalDeleted = 0;

            async function deleteQueryBatch(ref) {
                const q = query(ref, limit(batchSize));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    return 0;
                }

                const batch = writeBatch(db);
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                return snapshot.size;
            }

            // Delete documents in batches
            async function deleteCollection(ref) {
                let deleted = 0;
                while (true) {
                    const deleteCount = await deleteQueryBatch(ref);
                    totalDeleted += deleteCount;
                    if (deleteCount < batchSize) {
                        break;
                    }
                }
            }

            // Delete from all three collections
            await Promise.all([
                deleteCollection(jobsRef),
                deleteCollection(processedRef),
                deleteCollection(scrapedJobsRef)
            ]);

            // Refresh the job store
            if (currentUser) {
                await jobStore.init(currentUser.uid);
            }

        } catch (err) {
            alert(`Failed to delete jobs: ${err.message}`);
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
            class="text-surface-400 hover:bg-surface-200 rounded-full p-2 transition-colors hover:text-red-500 disabled:opacity-50"
            on:click={deleteAllJobs}
            disabled={deleting}
            title="Delete all jobs"
        >
            <iconify-icon icon="solar:trash-bin-trash-bold" width="20" height="20"></iconify-icon>
        </button>
    </div>

    <select
        value={$sortConfig.column}
        on:change={handleSortChange}
        class="w-44 rounded-lg border border-gray-200 bg-white p-2"
    >
        <option value="AccumulatedScores.accumulatedScore">Highest Score</option>
        <option value="generalData.timestamp">Most recent</option>
        <option value="bookmarked">Bookmarked</option>
    </select>
</div>