<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { jobStore, loading, error } from '$lib/stores/jobStore';
    import { db } from '$lib/firebase';
    import { doc, updateDoc } from 'firebase/firestore';

    let user = null;
    let unsubscribeAuth = null;
    let currentPage = 1;
    let rowsPerPage = 10;
    let searchText = '';

    $: filteredJobs = $jobStore.filter(job => 
        ['processing', 'cancelled', 'retrying'].includes(job.generalData?.processingStatus) &&
        (searchText === '' || 
         job.id.toLowerCase().includes(searchText.toLowerCase()) ||
         job.generalData?.processingStatus.toLowerCase().includes(searchText.toLowerCase()))
    );

    // Pagination
    $: totalPages = Math.ceil(filteredJobs.length / rowsPerPage);
    $: paginatedJobs = filteredJobs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    function nextPage() {
        if (currentPage < totalPages) currentPage++;
    }

    function previousPage() {
        if (currentPage > 1) currentPage--;
    }

    async function handleRetry(jobId) {
        if (!user) return;
        try {
            const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
            await updateDoc(jobRef, {
                'generalData.processingStatus': 'retrying'
            });

            const response = await fetch('https://retryprocessing-kvshkfhmua-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobId: jobId,
                    userId: user.uid
                })
            });

            const result = await response.json();
            console.log('Retry initiated - Response:', {
                success: result.success,
                messageId: result.messageId,
                docId: result.docId,
                timestamp: result.timestamp
            });

        } catch (err) {
            console.error('Error in handleRetry:', err);
            const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
            await updateDoc(jobRef, {
                'generalData.processingStatus': 'cancelled'
            });
        }
    }

    onMount(() => {
        unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            if (user) {
                jobStore.init(user.uid);
            }
        });
    });

    onDestroy(() => {
        if (unsubscribeAuth) unsubscribeAuth();
        jobStore.cleanup();
    });
</script>

<div class="container mx-auto w-full max-w-7xl px-4">
    <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-bold">Processing Status</h2>
        <div class="flex items-center gap-4">
            <div class="relative w-64">
                <iconify-icon
                    icon="gravity-ui:magnifier"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                ></iconify-icon>
                <input
                    type="search"
                    bind:value={searchText}
                    placeholder="Search jobs"
                    class="w-full rounded-md border border-gray-300 py-2 pl-10"
                />
            </div>
        </div>
    </div>

    <div class="space-y-4">
        {#if $loading}
            <p class="text-center">Loading...</p>
        {:else if $error}
            <p class="text-error text-center">{$error}</p>
        {:else if !user}
            <p class="text-center">Please sign in to view processing status.</p>
        {:else}
            <div class="table-container card">
                <table class="table-compact table w-full">
                    <thead>
                        <tr class="bg-tertiary-500">
                            <th class="w-[30%]">Job ID</th>
                            <th class="w-[30%]">User ID</th>
                            <th class="w-[20%]">Processing Status</th>
                            <th class="w-[20%]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each paginatedJobs as job}
                            <tr>
                                <td>{job.id}</td>
                                <td>{user.uid}</td>
                                <td>{job.generalData?.processingStatus || 'pending'}</td>
                                <td>
                                    <button 
                                        class="btn btn-sm variant-ghost-tertiary"
                                        on:click={() => handleRetry(job.id)}
                                    >
                                        Repair
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="!p-2">
                                <div class="relative flex h-8 items-center justify-center">
                                    <div class="absolute left-0">
                                        <span class="text-gray-400">
                                            Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredJobs.length)} - {Math.min(
                                                currentPage * rowsPerPage,
                                                filteredJobs.length
                                            )} <span class="lowercase">of</span>
                                            {filteredJobs.length} entries
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <button
                                            class="btn btn-sm variant-soft h-6 min-h-0 !py-0"
                                            on:click={previousPage}
                                            disabled={currentPage === 1}
                                        >
                                            <iconify-icon icon="solar:map-arrow-left-bold" width="20" height="20"
                                            ></iconify-icon>
                                        </button>
                                        <span class="flex items-center px-2 lowercase">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            class="btn btn-sm variant-soft h-6 min-h-0 !py-0"
                                            on:click={nextPage}
                                            disabled={currentPage === totalPages}
                                        >
                                            <iconify-icon icon="solar:map-arrow-right-bold" width="20" height="20"
                                            ></iconify-icon>
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        {/if}
    </div>
</div>