<!-- JobStackedBarChart.svelte -->
<script>
	import { writable, derived } from 'svelte/store';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/stores/jobStore';
	import { onMount } from 'svelte';

	// Time period store
	const timePeriod = writable('month');

	// Score categories
	const scoreRanges = [
		{ name: '0-20', min: 0, max: 20, color: '#FF6B6B' },  // Red
		{ name: '21-50', min: 21, max: 50, color: '#FFD166' }, // Yellow
		{ name: '51-65', min: 51, max: 65, color: '#06D6A0' }, // Green
		{ name: '66-100', min: 66, max: 100, color: '#118AB2' } // Blue
	];

	// Filtered jobs store
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

	// Stacked bar chart data
	const stackedBarData = derived([filteredJobs, timePeriod], ([$filteredJobs, $timePeriod]) => {
		// Create date range based on time period
		let now = new Date();
		let startDate = new Date();
		let numberOfDays = 30; // Default for month
		
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
				}
				break;
		}
		
		// Initialize data structure for all days
		const jobsByDay = {};
		
		for (let i = 0; i < numberOfDays; i++) {
			let date = new Date(startDate);
			date.setDate(startDate.getDate() + i);
			const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
			const displayDate = formatDate(date);
			
			jobsByDay[dateString] = {
				date: dateString,
				displayDate,
				total: 0
			};
			
			// Initialize counts for each score range
			scoreRanges.forEach(range => {
				jobsByDay[dateString][range.name] = 0;
			});
		}
		
		// Process jobs into appropriate buckets
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
			if (!jobsByDay[dateString]) return;
			
			// Get the job score
			const score = job.AccumulatedScores?.accumulatedScore || job.match?.final_score || 0;
			
			// Find the appropriate score range and increment
			for (const range of scoreRanges) {
				if (score >= range.min && score <= range.max) {
					jobsByDay[dateString][range.name]++;
					jobsByDay[dateString].total++;
					break;
				}
			}
		});
		
		// Convert to array and calculate stacked positions
		const result = Object.values(jobsByDay).sort((a, b) => a.date.localeCompare(b.date));
		
		// Calculate stacked positions for each day's data
		result.forEach(day => {
			let stackBase = 0;
			scoreRanges.forEach(range => {
				const count = day[range.name];
				day[`${range.name}Start`] = stackBase;
				day[`${range.name}End`] = stackBase + count;
				stackBase += count;
			});
		});
		
		return result;
	});
	
	// Stats derived from filtered jobs
	$: totalJobs = $filteredJobs.length;
	$: highScoringJobs = $filteredJobs.filter(
		(job) => (job.AccumulatedScores?.accumulatedScore > 65) || (job.match?.final_score > 65)
	).length;
	$: progressPercentage = totalJobs > 0 ? Math.round((highScoringJobs / totalJobs) * 100) : 0;

	// Find max count for scaling
	$: maxCount = Math.max(...$stackedBarData.map(d => d.total), 1); // Prevent division by zero
	
	// Chart dimensions
	let chartWidth = 0;
	let containerWidth;
	$: chartWidth = containerWidth || 500;
	const chartHeight = 250;
	const margin = { top: 20, right: 20, bottom: 40, left: 40 };
	const innerWidth = chartWidth - margin.left - margin.right;
	const innerHeight = chartHeight - margin.top - margin.bottom;
	
	// Format date for display
	function formatDate(date) {
		const options = { month: 'short', day: 'numeric' };
		return date.toLocaleDateString(undefined, options);
	}
	
	// Time period options
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

	<!-- Stacked Bar Chart -->
	<div class="chart-container" bind:clientWidth={containerWidth}>
		<svg width={chartWidth} height={chartHeight}>
			<g transform={`translate(${margin.left}, ${margin.top})`}>
				<!-- Y-axis -->
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
							<text x="-8" y="4" font-size="10" text-anchor="end">{tick}</text>
						</g>
					{/each}
				</g>
				
				<!-- Grid lines -->
				{#each [0, Math.ceil(maxCount/2), maxCount] as tick}
					<line 
						x1="0" 
						y1={innerHeight * (1 - tick/maxCount)} 
						x2={innerWidth} 
						y2={innerHeight * (1 - tick/maxCount)} 
						stroke="currentColor" 
						stroke-opacity="0.1" 
						stroke-dasharray="2,2" 
					/>
				{/each}
				
				<!-- Stacked Bars -->
				{#each $stackedBarData as day, i}
					<g transform={`translate(${(i * (innerWidth / $stackedBarData.length)) + (innerWidth / $stackedBarData.length) / 4}, 0)`}>
						{#each scoreRanges as range}
							{#if day[range.name] > 0}
								<rect
									class="bar-segment"
									y={innerHeight * (1 - day[`${range.name}End`]/maxCount)}
									width={(innerWidth / $stackedBarData.length) / 2}
									height={innerHeight * (day[range.name]/maxCount)}
									fill={range.color}
								>
									<title>Score {range.name}: {day[range.name]} jobs</title>
								</rect>
							{/if}
						{/each}
						
						<!-- X-axis labels (dates) -->
						{#if $timePeriod !== 'day'}
							<text 
								y={innerHeight + 16} 
								x={(innerWidth / $stackedBarData.length) / 4}
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
	
	<!-- Legend -->
	<div class="mt-4 flex items-center justify-center gap-4 flex-wrap">
		{#each scoreRanges as range}
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full" style={`background-color: ${range.color};`}></div>
				<p class="text-xs">{range.name} points</p>
			</div>
		{/each}
	</div>
	
	<!-- Summary stats -->
	<div class="mt-2 flex items-center justify-center">
		<p class="text-sm">{totalJobs} Total Jobs / {highScoringJobs} Jobs with Score > 65</p>
	</div>
</div>

<style>
	.chart-container {
		width: 100%;
		height: auto;
		margin: 0 auto;
	}
	
	.bar-segment {
		transition: height 0.3s ease, opacity 0.2s ease;
	}
	
	.bar-segment:hover {
		opacity: 0.8;
	}
</style>