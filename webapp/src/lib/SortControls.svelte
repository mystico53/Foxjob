<!-- SortControls.svelte -->
<script>
	import { sortConfig, sortedJobs } from '$lib/jobStore';

	// Set Date as default
	let selectedSort = 'generalData.timestamp';

	// Initialize sortConfig with Date if not already set
	if (!$sortConfig.column) {
		$sortConfig = {
			column: 'generalData.timestamp',
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
		<option value="generalData.timestamp">View by Date</option>
		<option value="Score.totalScore">View by Score</option>
	</select>
</div>
