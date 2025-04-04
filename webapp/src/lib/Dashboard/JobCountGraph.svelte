<!-- JobCountGraph.svelte -->
<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/stores/jobStore';
	import { writable, derived } from 'svelte/store';
	import { onMount } from 'svelte';

	// Time period store
	const timePeriod = writable('month');

	// Filtered jobs store
	const filteredJobs = derived([jobStore, timePeriod], ([$jobStore, $timePeriod]) => {
		if (!$jobStore) return [];

		// If "all" is selected, return all jobs
		if ($timePeriod === 'all') {
			return $jobStore;
		}

		const now = new Date();
		const startDate = new Date();

		// Set start date based on selected period
		switch ($timePeriod) {
			case 'day':
				startDate.setHours(0, 0, 0, 0);
				break;
			case 'week':
				startDate.setDate(now.getDate() - now.getDay());
				startDate.setHours(0, 0, 0, 0);
				break;
			case 'month':
				startDate.setDate(1);
				startDate.setHours(0, 0, 0, 0);
				break;
		}

		// Filter jobs within the selected time period
		return $jobStore.filter((job) => {
			// Get timestamp from any available source
			const dateValue = job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp;
			if (!dateValue) return false;
			
			// Handle different date formats
			let jobDate;
			if (dateValue && dateValue.toDate) {
				jobDate = dateValue.toDate();
			} else if (typeof dateValue === 'string') {
				jobDate = new Date(dateValue);
				if (isNaN(jobDate)) return false;
			} else {
				return false;
			}
			
			return jobDate >= startDate && jobDate <= now;
		});
	});

	// Stats derived from filtered jobs
	$: totalJobs = $filteredJobs.length;
	$: highScoringJobs = $filteredJobs.filter(
		(job) => (job.AccumulatedScores?.accumulatedScore > 65) || (job.match?.final_score > 65)
	).length;
	$: progressPercentage = totalJobs > 0 ? Math.round((highScoringJobs / totalJobs) * 100) : 0;

	// Time period options with "All" added
	const timeOptions = [
		{ value: 'day', label: 'Day' },
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'all', label: 'All' }
	];
</script>

<div class="flex h-full w-full flex-col">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-[20px] font-bold">Jobs Collected</h2>
		<div class="flex items-center gap-2">
			<select
				class="select bg-surface-200 dark:bg-surface-700 rounded-container-token w-24 p-2"
				bind:value={$timePeriod}
			>
				{#each timeOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="flex flex-1 flex-col items-center justify-center">
		<div class="relative flex w-full items-center justify-center">
			<div class="h-40 w-40">
				<!-- Fixed size for the progress radial container -->
				<ProgressRadial
					class="progress-radial"
					value={progressPercentage}
					stroke={40}
					meter="stroke-primary-500"
					track="stroke-tertiary-700/30"
					font={180}
					strokeLinecap="round"
				>
					{totalJobs}
				</ProgressRadial>
			</div>
		</div>
		<div class="mt-4 flex items-center gap-2">
			<div class="h-3 w-3 rounded-full" style="background-color: #FF9C00;"></div>
			<p class="text-sm">{highScoringJobs} Jobs with a Score of 65 or above</p>
		</div>
	</div>
</div>

<style>
	:global(.progress-radial) {
		width: 100% !important;
		height: 100% !important;
	}
</style>