<!-- src/lib/components/ProcessingJobsCount.svelte -->
<script>
	import { jobStore } from '$lib/stores/jobStore';

	// Reactive count of processing jobs
	$: processingJobsCount = $jobStore.filter(
		(job) => job.generalData?.processingStatus === 'processing'
	).length;
</script>

{#if processingJobsCount > 0}
	<div class="flex items-center gap-2 p-4">
		<span class="badge variant-filled-primary">{processingJobsCount}</span>
		<span class="text-sm">Job{processingJobsCount !== 1 ? 's' : ''} Processing</span>
	</div>
{/if}
