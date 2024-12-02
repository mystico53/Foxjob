<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { jobStore, sortedJobs, loading, error } from '$lib/stores/jobStore';
    import JobCard from '$lib/Jobcards/JobCard.svelte';
    import SortControls from '$lib/SortControls.svelte';
    import { flip } from 'svelte/animate';
    import SearchBar from '$lib/SearchBar.svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let currentUser = null;
    let sidebar;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            currentUser = user;
            if (user) {
                jobStore.init(user.uid);
            }
        });

        return () => {
            unsubscribe();
            jobStore.cleanup();
        };
    });

    function handleJobClick(job) {
        if (window.innerWidth <= 768) {
            sidebar.style.transform = 'translateX(-100%)';
        }
        goto(`/workflow/${job.id}`, { replaceState: true });
    }

    async function toggleBookmark(jobId) {
        try {
            if (!currentUser?.uid) throw new Error('No user logged in');
            const jobToUpdate = $sortedJobs.find((j) => j.id === jobId);
            if (!jobToUpdate) throw new Error('Job not found');

            const newStatus =
                jobToUpdate.generalData?.status?.toLowerCase() === 'bookmarked' ? 'read' : 'bookmarked';
            await jobStore.updateStatus(currentUser.uid, jobId, newStatus);
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    }

    function handleMobileNav() {
        if (sidebar) {
            const isHidden = sidebar.style.transform === 'translateX(-100%)';
            sidebar.style.transform = isHidden ? 'translateX(0)' : 'translateX(-100%)';
        }
    }
</script>

<!-- Main Content -->
<div class="fixed left-0 flex h-[calc(100vh-72px)] w-full flex-col md:flex-row">
    <!-- Sidebar -->
    <aside
        class="bg-surface-100 custom-scrollbar h-full w-full transform overflow-y-auto border-r transition-transform md:w-80 md:translate-x-0"
        style="width: 25rem;"
        bind:this={sidebar}
    >
        <SortControls />
        <SearchBar />
        <div class="p-4">
            {#if $loading}
                <div class="flex justify-center p-4">
                    <span class="loading loading-spinner loading-lg text-primary-500"></span>
                </div>
            {/if}

            {#if $sortedJobs && $sortedJobs.length > 0}
                <div class="flex flex-col gap-4">
                    {#each $sortedJobs as job (job.id)}
                        <div animate:flip={{ duration: 700 }}>
                            <JobCard
                                companyName={job.companyInfo?.name || 'no info'}
                                jobTitle={job.jobInfo?.jobTitle || 'no info'}
                                score={job.AccumulatedScores.accumulatedScore}
                                status={job.generalData?.status}
                                remoteType={job.jobInfo?.remoteType || 'no info'}
                                compensation={job.compensation || 'no info'}
                                timestamp={job.generalData?.timestamp?.toDate()}
                                handleClick={() => handleJobClick(job)}
                                jobId={job.id}
                                isSelected={job.id === $page.params.jobId}
                                {toggleBookmark}
                            />
                        </div>
                    {/each}
                </div>
            {:else if !$loading}
                <div class="text-surface-400 p-4 text-center">No jobs found.</div>
            {/if}
        </div>
    </aside>

    <!-- Main content area -->
    <main class="bg-surface-100 flex-1 overflow-y-auto p-4">
        <slot />
    </main>
</div>

<!-- Mobile navigation button -->
<button
    class="bg-primary-500 fixed bottom-4 right-4 z-20 rounded-full p-3 text-white shadow-lg md:hidden"
    on:click={handleMobileNav}
>
    {#if $page.params.jobId}
        <!-- Left Arrow Icon -->
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
    {:else}
        <!-- Right Arrow Icon -->
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
    {/if}
</button>