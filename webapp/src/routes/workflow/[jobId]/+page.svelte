<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { sortedJobs } from '$lib/stores/jobStore';
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
        const nextIndex = selectedJobIndex + 1;
        goto(`/workflow/${$sortedJobs[nextIndex].id}`);
    }

    function handlePrevious() {
        if (!$sortedJobs || selectedJobIndex <= 0) return;
        const prevIndex = selectedJobIndex - 1;
        goto(`/workflow/${$sortedJobs[prevIndex].id}`);
    }

    function openJobLink(url) {
        window.open(url, '_blank');
    }
</script>

{#if selectedJob}
    <CardDetails
        job={selectedJob}
        handleNext={handleNext}
        previousJob={handlePrevious}
        isFirstJob={selectedJobIndex === 0}
        isLastJob={selectedJobIndex === $sortedJobs.length - 1}
        toggleBookmark
        {openJobLink}
    />
{:else}
    <div class="flex h-full items-center justify-center">
        <div class="text-surface-400 text-center">
            Loading job details...
        </div>
    </div>
{/if}