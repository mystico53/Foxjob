<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { sortedJobs, loading } from '$lib/stores/jobStore';
    import CardDetails from '$lib/Jobcards/CardDetails.svelte';

    let selectedJob = null;
    let selectedJobIndex = -1;

    $: jobId = $page.params.jobId;
    $: if (jobId && $sortedJobs) {
        selectedJob = $sortedJobs.find(j => j.id === jobId);
        selectedJobIndex = $sortedJobs.findIndex(j => j.id === jobId);
    }

    function handleNext() {
        if (!$sortedJobs || selectedJobIndex >= $sortedJobs.length - 1) return;
        goto(`/workflow/${$sortedJobs[selectedJobIndex + 1].id}`);
    }

    function handlePrevious() {
        if (!$sortedJobs || selectedJobIndex <= 0) return;
        goto(`/workflow/${$sortedJobs[selectedJobIndex - 1].id}`);
    }
</script>

{#if selectedJob}
    <CardDetails
        job={selectedJob}
        handleNext={handleNext}
        previousJob={handlePrevious}
        isFirstJob={selectedJobIndex === 0}
        isLastJob={selectedJobIndex === $sortedJobs.length - 1}
    />
{:else if $loading}
    <div class="flex h-full items-center justify-center">
        <span class="loading loading-spinner loading-lg text-primary-500"></span>
    </div>
{:else}
    <div class="flex h-full items-center justify-center">
        <div class="text-surface-400 text-center">
            Job not found
        </div>
    </div>
{/if}