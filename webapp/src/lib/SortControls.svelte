<!-- SortControls.svelte -->
<script>
	import { sortConfig, sortedJobs } from '$lib/jobStore';

	// Set Score as default to match actual behavior
	let selectedSort = 'Score.totalScore';

	// Initialize sortConfig with Score as default
	if (!$sortConfig.column) {
		$sortConfig = {
			column: 'Score.totalScore',
			direction: 'desc'
		};
	}

	function handleSortChange(event) {
		selectedSort = event.target.value;
		$sortConfig = {
			column: selectedSort,
			direction: 'desc' // Both Score and Date should be desc (highest/newest first)
		};
	}
</script>

<div class="flex items-center justify-between p-4">
	<div class="text-2xl font-bold">
		{$sortedJobs?.length || 0} jobs
	</div>

	<select
		value={selectedSort}
		on:change={handleSortChange}
		class="w-44 rounded-lg border border-gray-200 bg-white p-2"
	>
		<option value="Score.totalScore">View by Score</option>
		<option value="generalData.timestamp">View by Date</option>
	</select>
</div>
