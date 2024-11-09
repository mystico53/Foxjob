<script>
    import { onMount } from 'svelte';
    import { getFirestore, doc, getDoc } from 'firebase/firestore';
    import CardDetails from '$lib/CardDetails.svelte';

    export let feedback;
    export let isFirstFeedback = false;
    export let isLastFeedback = false;

    const db = getFirestore();
    let job = null;
    let loading = true;
    let error = null;

    async function loadJobData() {
        if (!feedback?.jobId) {
            loading = false;
            return;
        }

        try {
            loading = true;
            error = null;
            
            const jobRef = doc(db, 'jobs', feedback.jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (jobDoc.exists()) {
                job = {
                    id: jobDoc.id,
                    ...jobDoc.data()
                };
            } else {
                error = 'Job not found';
            }
        } catch (err) {
            console.error('Error loading job:', err);
            error = 'Failed to load job data';
        } finally {
            loading = false;
        }
    }

    // Reload job data when feedback changes
    $: if (feedback?.jobId) {
        loadJobData();
    }
</script>

<div class="space-y-8">
    <!-- Feedback Information -->
    <div class="card p-4">
        <h3 class="h3 mb-4">Feedback Details</h3>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="font-bold">Type:</span>
                <span class="badge {feedback.type === 'upvote' ? 'variant-filled-success' : 'variant-filled-error'} ml-2">
                    {feedback.type}
                </span>
            </div>
            <div>
                <span class="font-bold">Date:</span>
                <span class="ml-2">
                    {feedback.timestamp?.toLocaleString() || 'N/A'}
                </span>
            </div>
            <div>
                <span class="font-bold">Job ID:</span>
                <span class="ml-2">{feedback.jobId || 'N/A'}</span>
            </div>
            <div>
                <span class="font-bold">Item:</span>
                <span class="ml-2">{feedback.itemId || 'N/A'}</span>
            </div>
            {#if feedback.reason}
                <div class="col-span-2">
                    <span class="font-bold">Reason:</span>
                    <p class="mt-2">{feedback.reason}</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Job Details -->
    {#if loading}
        <div class="flex justify-center p-4">
            <span class="loading loading-spinner loading-lg text-primary-500" />
        </div>
    {:else if error}
        <div class="alert variant-filled-error">
            <span>{error}</span>
        </div>
    {:else if job}
        <CardDetails
            {job}
            handleNext={() => {}}
            previousJob={() => {}}
            isFirstJob={true}
            isLastJob={true}
            toggleBookmark={() => {}}
            openJobLink={(url) => window.open(url, '_blank')}
        />
    {:else}
        <div class="alert variant-filled-warning">
            <span>No associated job data found</span>
        </div>
    {/if}
</div>