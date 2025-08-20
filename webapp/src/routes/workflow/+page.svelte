<script>
	import { sortedJobs } from '$lib/stores/jobStore';
	import { goto } from '$app/navigation';

	// Redirect to first job if available
	$: if ($sortedJobs && $sortedJobs.length > 0) {
		goto(`/workflow/${$sortedJobs[0].id}`);
	}
</script>

<div class="flex h-full items-center justify-center">
	<div class="text-center text-surface-400">
		<div>Select a job to view details</div>
	</div>
</div>
