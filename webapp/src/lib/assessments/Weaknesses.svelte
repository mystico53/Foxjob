<!-- JobList.svelte -->
<script>
    import { jobStore } from '$lib/stores/jobStore';
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { ProgressRadial } from '@skeletonlabs/skeleton';

    let user = null;
    let unsubscribeAuth = null;
    let sortedJobs = [];
    let processingJobs = new Set();

    $: if ($jobStore) {
        sortedJobs = [...$jobStore].sort((a, b) => {
            const scoreA = a.AccumulatedScores?.accumulatedScore || 0;
            const scoreB = b.AccumulatedScores?.accumulatedScore || 0;
            return scoreB - scoreA; // Sort in descending order
        });
    }

    async function sendGapsToCloud(jobId, gaps) {
        if (!user || processingJobs.has(jobId)) return;
        
        processingJobs.add(jobId);
        
        try {
            const response = await fetch('http://127.0.0.1:5001/jobille-45494/us-central1/processGaps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobId,
                    userId: user.uid,
                    gaps
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response from cloud function:', data);
            
            // Optional: Show a toast or notification that the gaps were sent successfully
            
        } catch (error) {
            console.error('Error sending gaps to cloud function:', error);
            // Optional: Show error notification to user
        } finally {
            processingJobs.delete(jobId);
            processingJobs = processingJobs; // Trigger reactivity
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

<div class="container mx-auto p-4">
    {#if sortedJobs.length > 0}
        {#each sortedJobs as job}
            {#if job.verdict?.keyGaps && Object.keys(job.verdict.keyGaps).length > 0}
                <div class="card p-4 mb-4 variant-surface">
                    <header class="card-header flex justify-between items-center">
                        <h3 class="h3">
                            Score: {Math.round(job.AccumulatedScores?.accumulatedScore || 0)}
                            <span class="opacity-50 text-sm ml-2">ID: {job.id}</span>
                        </h3>
                        <button 
                            class="btn variant-filled-primary"
                            on:click={() => sendGapsToCloud(job.id, job.verdict.keyGaps)}
                            disabled={processingJobs.has(job.id)}
                        >
                            {#if processingJobs.has(job.id)}
                                <ProgressRadial stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" width="w-6"/>
                            {:else}
                                Send Gaps
                            {/if}
                        </button>
                    </header>
                    <section class="p-4">
                        <ul class="list">
                            {#each Object.entries(job.verdict.keyGaps) as [key, value]}
                                <li class="py-2">{key}: {value}</li>
                            {/each}
                        </ul>
                    </section>
                </div>
            {/if}
        {/each}
    {:else}
        <div class="card p-4 variant-ghost-surface">
            <p class="text-center">No jobs found</p>
        </div>
    {/if}
</div>