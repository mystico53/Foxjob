<!-- SortControls.svelte -->
<script>
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import { sortConfig } from '$lib/jobStore';

	// Set Score as default
	let selectedSort = 'Score.totalScore';

	// Initialize sortConfig with Score if not already set
	if (!$sortConfig.column) {
		$sortConfig = {
			column: 'Score.totalScore',
			direction: 'desc'
		};
	}

	function handleSortChange(value) {
		selectedSort = value;

		// Configure sort direction and handle special case for status
		const sortDirection = value === 'generalData.status' ? 'asc' : 'desc';

		$sortConfig = {
			column: value,
			direction: sortDirection,
			// Add special handling for status to prioritize bookmarked
			statusPriority:
				value === 'generalData.status'
					? {
							bookmarked: 1,
							read: 2,
							unread: 3
						}
					: null
		};
	}
</script>

<div class="space-y-2 p-4">
	<RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
		<RadioItem
			bind:group={selectedSort}
			name="sort"
			value="generalData.timestamp"
			on:change={() => handleSortChange('generalData.timestamp')}
		>
			Date
		</RadioItem>
		<RadioItem
			bind:group={selectedSort}
			name="sort"
			value="Score.totalScore"
			on:change={() => handleSortChange('Score.totalScore')}
		>
			Score
		</RadioItem>
		<RadioItem
			bind:group={selectedSort}
			name="sort"
			value="generalData.status"
			on:change={() => handleSortChange('generalData.status')}
		>
			Status
		</RadioItem>
	</RadioGroup>
</div>
