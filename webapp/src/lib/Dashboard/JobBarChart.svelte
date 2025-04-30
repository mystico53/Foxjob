<!-- JobBarChart.svelte -->
<script>
	import { writable, derived } from 'svelte/store';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/stores/jobStore';
	import { onMount } from 'svelte';

	// Time period store
	const timePeriod = writable('month');

	// Filtered jobs store - similar to your existing code
	const filteredJobs = derived([jobStore, timePeriod], ([$jobStore, $timePeriod]) => {
		if (!$jobStore) return [];

		// If "all" is selected, return all jobs
		if ($timePeriod === 'all') {
			return $jobStore;
		}

		let now = new Date();
		let startDate = new Date();

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

	// Bar chart data derived store
	const barChartData = derived([filteredJobs, timePeriod], ([$filteredJobs, $timePeriod]) => {
		// Create a map to hold job counts by day
		const jobsByDay = new Map();
		
		// Create date range based on time period
		let now = new Date();
		let startDate = new Date();
		let numberOfDays = 30; // Default for month
		let skipLabels = 1; // Show every label by default
		
		switch ($timePeriod) {
			case 'day':
				startDate.setHours(0, 0, 0, 0);
				numberOfDays = 1;
				break;
			case 'week':
				startDate.setDate(now.getDate() - now.getDay());
				startDate.setHours(0, 0, 0, 0);
				numberOfDays = 7;
				break;
			case 'month':
				startDate.setDate(1);
				startDate.setHours(0, 0, 0, 0);
				numberOfDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); // Days in current month
				skipLabels = 3; // Show every 3rd label for month view
				break;
			case 'all':
				// For "all", find the earliest job date to determine start date
				if ($filteredJobs.length > 0) {
					let earliestDate = new Date(now);
					$filteredJobs.forEach(job => {
						const dateValue = job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp;
						if (!dateValue) return;
						
						let jobDate;
						if (dateValue && dateValue.toDate) {
							jobDate = dateValue.toDate();
						} else if (typeof dateValue === 'string') {
							jobDate = new Date(dateValue);
							if (isNaN(jobDate)) return;
						} else {
							return;
						}
						
						if (jobDate < earliestDate) {
							earliestDate = jobDate;
						}
					});
					startDate = new Date(earliestDate);
					startDate.setHours(0, 0, 0, 0);
					numberOfDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
					skipLabels = Math.ceil(numberOfDays / 10); // Show approximately 10 labels total
				}
				break;
		}
		
		// Initialize the map with all days in the range (fill with zeros)
		for (let i = 0; i < numberOfDays; i++) {
			let date = new Date(startDate);
			date.setDate(startDate.getDate() + i);
			const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
			jobsByDay.set(dateString, {
				date: dateString,
				count: 0,
				displayDate: formatDate(date),
				showLabel: i % skipLabels === 0 // Only show label for every nth day
			});
		}
		
		// Count jobs for each day
		$filteredJobs.forEach(job => {
			const dateValue = job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp;
			if (!dateValue) return;
			
			let jobDate;
			if (dateValue && dateValue.toDate) {
				jobDate = dateValue.toDate();
			} else if (typeof dateValue === 'string') {
				jobDate = new Date(dateValue);
				if (isNaN(jobDate)) return;
			} else {
				return;
			}
			
			const dateString = jobDate.toISOString().split('T')[0];
			if (jobsByDay.has(dateString)) {
				const dayData = jobsByDay.get(dateString);
				dayData.count++;
			}
		});
		
		// Convert map to array for easier use in chart
		return Array.from(jobsByDay.values())
			.sort((a, b) => a.date.localeCompare(b.date)); // Sort by date
	});
	
	// Stats derived from filtered jobs (keeping from your original)
	$: totalJobs = $filteredJobs.length;
	$: highScoringJobs = $filteredJobs.filter(
		(job) => (job.AccumulatedScores?.accumulatedScore > 65) || (job.match?.final_score > 65)
	).length;
	$: progressPercentage = totalJobs > 0 ? Math.round((highScoringJobs / totalJobs) * 100) : 0;

	// Find max count for scaling
	$: maxCount = Math.max(...$barChartData.map(d => d.count), 1); // Prevent division by zero
	
	// Chart dimensions
	let chartWidth = 0;
	let containerWidth;
	$: chartWidth = Math.max(containerWidth || 500, 200); // Ensure minimum width
	const chartHeight = 280;
	const margin = { top: 20, right: 20, bottom: 60, left: 40 };
	$: innerWidth = Math.max(chartWidth - margin.left - margin.right, 10); // Ensure minimum inner width
	const innerHeight = chartHeight - margin.top - margin.bottom;
	
	// Format date for display
	function formatDate(date) {
		// Create a much more compact date format
		const timePeriodValue = $timePeriod;
		if (timePeriodValue === 'month' || timePeriodValue === 'all') {
			// Just show the day number for month view to save space
			return date.getDate().toString();
		} else {
			// Show abbreviated month + day for week view
			const month = date.toLocaleString('default', { month: 'short' });
			const day = date.getDate();
			return `${month} ${day}`;
		}
	}
	
	// Time period options with "All" added (keeping from your original)
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

	<!-- Bar chart container -->
	<div class="chart-container" bind:clientWidth={containerWidth}>
		<svg width={chartWidth} height={chartHeight}>
			<g transform={`translate(${margin.left}, ${margin.top})`}>
				<!-- Y axis (counts) -->
				<g class="y-axis">
					<line 
						x1="0" 
						y1="0" 
						x2="0" 
						y2={innerHeight} 
						stroke="currentColor" 
						stroke-opacity="0.2" 
					/>
					{#each [0, Math.ceil(maxCount/2), maxCount] as tick}
						<g transform={`translate(0, ${innerHeight * (1 - tick/maxCount)})`}>
							<line 
								x1="-5" 
								y1="0" 
								x2="0" 
								y2="0" 
								stroke="currentColor" 
								stroke-opacity="0.2" 
							/>
							<text x="-8" y="4" text-anchor="end" font-size="10">{tick}</text>
						</g>
					{/each}
				</g>
				
				<!-- Bars -->
				{#each $barChartData as day, i}
					<g transform={`translate(${(i * (innerWidth / $barChartData.length)) + (innerWidth / $barChartData.length) / 4}, 0)`}>
						<rect
							class="bar bg-primary-500"
							y={innerHeight * (1 - day.count/maxCount)}
							width={(innerWidth / $barChartData.length) / 2}
							height={day.count ? innerHeight * (day.count/maxCount) : 1}
							fill="currentColor"
						/>
						
						<!-- X axis labels (dates) -->
						{#if $timePeriod !== 'day'}
							<text 
								y={innerHeight + 16} 
								x={(innerWidth / $barChartData.length) / 4}
								text-anchor="middle" 
								font-size="10"
							>
								{day.displayDate}
							</text>
						{/if}
					</g>
				{/each}
			</g>
		</svg>
	</div>
	
	<!-- Summary stats (keeping from your original) -->
	<div class="mt-4 flex items-center justify-center gap-2">
		<div class="h-3 w-3 rounded-full bg-primary-500"></div>
		<p class="text-sm">{totalJobs} Total Jobs / {highScoringJobs} Jobs with Score > 65</p>
	</div>
</div>

<style>
	.chart-container {
		width: 100%;
		height: auto;
		margin: 0 auto;
	}
	
	.bar {
		transition: height 0.3s ease;
	}
	
	.bar:hover {
		opacity: 0.8;
	}
</style>