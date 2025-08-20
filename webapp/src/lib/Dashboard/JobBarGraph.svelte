<script>
	import { onMount, onDestroy } from 'svelte';
	import { jobStatsStore } from '$lib/stores/jobStatsStore';
	import { authStore } from '$lib/stores/authStore';
	import Chart from 'chart.js/auto';

	let userId;
	let unsubscribe;
	let stats = [];
	let recentDaysStats = [];
	let isLoading = true;
	let debugInfo = {};
	let chartInstance;
	let chartCanvas;

	// Helper function to format date consistently (copied from jobStatsStore)
	function formatDate(date) {
		return date.toISOString().split('T')[0]; // YYYY-MM-DD format
	}

	// Subscribe to auth store to get the userId
	onMount(() => {
		unsubscribe = authStore.subscribe((user) => {
			userId = user?.uid;
			if (userId) {
				console.log('JobBarGraph: Initializing jobStatsStore with userId', userId);
				jobStatsStore.init(userId);
			}
		});

		// Subscribe to the job stats store
		const statsUnsubscribe = jobStatsStore.subscribe((data) => {
			console.log('JobBarGraph: Received data', data);
			stats = data;
		});

		// Subscribe to recent days stats
		const recentDaysUnsubscribe = jobStatsStore.recentDays.subscribe((data) => {
			console.log('JobBarGraph: Received recent days data', data);
			recentDaysStats = data;
			updateChart();
		});

		// Subscribe to loading state
		const loadingUnsubscribe = jobStatsStore.loading.subscribe((value) => {
			isLoading = value;
		});

		// Subscribe to debug info
		const debugUnsubscribe = jobStatsStore.debug.subscribe((data) => {
			debugInfo = data;
		});

		return () => {
			if (unsubscribe) unsubscribe();
			statsUnsubscribe();
			recentDaysUnsubscribe();
			loadingUnsubscribe();
			debugUnsubscribe();
			if (chartInstance) chartInstance.destroy();
			jobStatsStore.cleanup();
		};
	});

	// Update or create chart when data changes
	function updateChart() {
		if (!chartCanvas || recentDaysStats.length === 0) return;

		const ctx = chartCanvas.getContext('2d');
		const reversedStats = [...recentDaysStats].reverse();
		const labels = reversedStats.map((day) => day.label);

		// Create gradients for each category
		const topMatchGradient = ctx.createLinearGradient(0, 0, 0, 400);
		topMatchGradient.addColorStop(0, 'rgba(220, 55, 1, 0.9)');
		topMatchGradient.addColorStop(1, 'rgba(220, 55, 1, 0.7)');

		const goodMatchGradient = ctx.createLinearGradient(0, 0, 0, 400);
		goodMatchGradient.addColorStop(0, 'rgba(230, 85, 10, 0.85)');
		goodMatchGradient.addColorStop(1, 'rgba(230, 85, 10, 0.65)');

		const okMatchGradient = ctx.createLinearGradient(0, 0, 0, 400);
		okMatchGradient.addColorStop(0, 'rgba(240, 115, 20, 0.8)');
		okMatchGradient.addColorStop(1, 'rgba(240, 115, 20, 0.6)');

		const poorMatchGradient = ctx.createLinearGradient(0, 0, 0, 400);
		poorMatchGradient.addColorStop(0, 'rgba(255, 156, 0, 0.75)');
		poorMatchGradient.addColorStop(1, 'rgba(255, 156, 0, 0.55)');

		// Prepare datasets
		const datasets = [
			{
				label: 'Poor Matches (< 50)',
				data: reversedStats.map((day) => day.poorMatch || 0),
				backgroundColor: poorMatchGradient,
				borderWidth: 0
			},
			{
				label: 'OK Matches (≥ 50)',
				data: reversedStats.map((day) => day.okMatch || 0),
				backgroundColor: okMatchGradient,
				borderWidth: 0
			},
			{
				label: 'Good Matches (≥ 65)',
				data: reversedStats.map((day) => day.goodMatch || 0),
				backgroundColor: goodMatchGradient,
				borderWidth: 0
			},
			{
				label: 'Top Matches (≥ 85)',
				data: reversedStats.map((day) => day.topMatch || 0),
				backgroundColor: topMatchGradient,
				borderWidth: 0
			}
		];

		if (!chartInstance) {
			chartInstance = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: labels,
					datasets: datasets
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						x: {
							stacked: true,
							grid: {
								display: false
							}
						},
						y: {
							stacked: true,
							grid: {
								display: false
							},
							ticks: {
								stepSize: 10 // Show ticks at intervals of 10
							}
						}
					},
					plugins: {
						legend: {
							display: false // Hide the legend
						},
						tooltip: {
							enabled: true // Disabled as per request
						}
					}
				}
			});
		} else {
			chartInstance.data.labels = labels;
			chartInstance.data.datasets.forEach((dataset, i) => {
				dataset.data = datasets[i].data;
				dataset.backgroundColor = datasets[i].backgroundColor;
			});
			chartInstance.update();
		}
	}

	// Calculate aggregated stats for 7 days
	$: last7DaysStats = calculateLast7DaysStats(stats);

	function calculateLast7DaysStats(stats) {
		const today = new Date();
		const sevenDaysAgo = new Date(today);
		sevenDaysAgo.setDate(today.getDate() - 7);

		const sevenDaysAgoFormatted = formatDate(sevenDaysAgo);

		return stats
			.filter((item) => item.date >= sevenDaysAgoFormatted)
			.reduce(
				(acc, curr) => {
					return {
						total: acc.total + curr.total,
						topMatch: acc.topMatch + (curr.topMatch || 0),
						goodMatch: acc.goodMatch + (curr.goodMatch || 0),
						okMatch: acc.okMatch + (curr.okMatch || 0),
						poorMatch: acc.poorMatch + (curr.poorMatch || 0)
					};
				},
				{
					total: 0,
					topMatch: 0,
					goodMatch: 0,
					okMatch: 0,
					poorMatch: 0
				}
			);
	}

	// Calculate all-time stats
	$: allTimeStats = calculateAllTimeStats(stats);

	function calculateAllTimeStats(stats) {
		return stats.reduce(
			(acc, curr) => {
				return {
					total: acc.total + curr.total,
					topMatch: acc.topMatch + (curr.topMatch || 0),
					goodMatch: acc.goodMatch + (curr.goodMatch || 0),
					okMatch: acc.okMatch + (curr.okMatch || 0),
					poorMatch: acc.poorMatch + (curr.poorMatch || 0)
				};
			},
			{
				total: 0,
				topMatch: 0,
				goodMatch: 0,
				okMatch: 0,
				poorMatch: 0
			}
		);
	}

	// Update chart when the canvas is available
	$: if (chartCanvas && recentDaysStats.length > 0 && !chartInstance) {
		updateChart();
	}
</script>

<div class="flex h-full w-full flex-col">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-[20px] font-bold">Jobs Matched</h2>
	</div>

	<div class="space-y-4">
		{#if isLoading}
			<p>Loading job statistics...</p>
		{:else if recentDaysStats.length === 0}
			<p>No recent job data available</p>
		{:else}
			<!-- Chart Container -->
			<div class="p-2">
				<div class="h-64 w-full">
					<canvas bind:this={chartCanvas}></canvas>
				</div>
			</div>
		{/if}
	</div>
</div>
