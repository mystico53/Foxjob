<script>
    import { jobStore } from '$lib/stores/jobStore';
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { ProgressRadial } from '@skeletonlabs/skeleton';

    let user = null;
    let unsubscribeAuth = null;
    let sortedJobs = [];
    let isProcessing = false;
    let lastResponse = null;

    $: if ($jobStore) {
        sortedJobs = [...$jobStore].sort((a, b) => {
            const scoreA = a.AccumulatedScores?.accumulatedScore || 0;
            const scoreB = b.AccumulatedScores?.accumulatedScore || 0;
            return scoreB - scoreA; // Sort in descending order
        });
    }

    async function sendAllGapsToCloud() {
        if (!user || isProcessing) return;
        
        isProcessing = true;
        lastResponse = null;
        
        // Get all gaps from top jobs as simple strings
        const allGaps = sortedJobs
            .filter(job => job.verdict?.keyGaps && Object.keys(job.verdict.keyGaps).length > 0)
            .slice(0, 10) // Take up to 10 jobs
            .flatMap(job => Object.values(job.verdict.keyGaps)); // Convert gaps object to array of strings

        try {
            const response = await fetch('http://127.0.0.1:5001/jobille-45494/us-central1/processGaps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid,
                    gaps: allGaps
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Response from cloud function:', result);
            lastResponse = result;
            
        } catch (error) {
            console.error('Error sending gaps to cloud function:', error);
            // Optional: Show error notification to user
        } finally {
            isProcessing = false;
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
    <div class="card p-4 mb-4 variant-surface">
        <button 
            class="btn variant-filled-primary w-full"
            on:click={sendAllGapsToCloud}
            disabled={isProcessing}
        >
            {#if isProcessing}
                <ProgressRadial stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" width="w-6"/>
            {:else}
                Analyze All Gaps
            {/if}
        </button>

        {#if lastResponse}
            <div class="mt-4 p-4 variant-ghost-surface">
                <h4 class="h4 mb-2">Analysis Results:</h4>
                <pre class="whitespace-pre-wrap text-sm">
                    {JSON.stringify(lastResponse, null, 2)}
                </pre>
            </div>
        {/if}
    </div>

    {#if sortedJobs.length > 0}
        {#each sortedJobs as job}
            {#if job.verdict?.keyGaps && Object.keys(job.verdict.keyGaps).length > 0}
                <div class="card p-4 mb-4 variant-surface">
                    <header class="card-header">
                        <h3 class="h3">
                            Score: {Math.round(job.AccumulatedScores?.accumulatedScore || 0)}
                            <span class="opacity-50 text-sm ml-2">ID: {job.id}</span>
                        </h3>
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