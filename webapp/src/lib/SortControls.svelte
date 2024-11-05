<!-- SortControls.svelte -->
<script>
	import { ListBox, ListBoxItem } from '@skeletonlabs/skeleton';
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

	function handleSortChange() {
		$sortConfig = {
			column: selectedSort,
			direction: 'desc' // Both Score and Date should be desc (highest/newest first)
		};
	}
</script>

<div class="flex items-center justify-between border-b p-4">
	<div class="text-2xl font-bold">
		{$sortedJobs?.length || 0} jobs
	</div>

	<ListBox>
		<ListBoxItem
			bind:group={selectedSort}
			name="sort"
			value="generalData.timestamp"
			on:change={handleSortChange}
		>
			View by Date
		</ListBoxItem>
		<ListBoxItem
			bind:group={selectedSort}
			name="sort"
			value="Score.totalScore"
			on:change={handleSortChange}
		>
			View by Score
		</ListBoxItem>
	</ListBox>
</div>
