<script>
	import { onMount, onDestroy } from 'svelte';
	import {
		scrapeStore,
		isLoading,
		totalJobs,
		currentBatch,
		initJobListener
	} from '$lib/stores/scrapeStore';
	import { writable, derived } from 'svelte/store';
	import { goto } from '$app/navigation';

	let currentPage = 1;
	let rowsPerPage = 30; // 30 jobs per page as requested
	let sortValue = 'date-newest'; // Default sort

	// Create local stores for sorting and searching
	const sortConfig = writable({ column: 'details.postedDate', direction: 'desc' });
	const searchText = writable('');

	// Create a derived store for sorted and filtered jobs
	const sortedJobs = derived(
		[scrapeStore, sortConfig, searchText],
		([$scrapeStore, $sortConfig, $searchText]) => {
			let filteredJobs = [...$scrapeStore];

			// Apply search filter if searchText is not empty
			if ($searchText && $searchText.trim() !== '') {
				const searchLower = $searchText.toLowerCase();
				filteredJobs = filteredJobs.filter((job) => {
					return (
						(job.basicInfo?.company && job.basicInfo.company.toLowerCase().includes(searchLower)) ||
						(job.basicInfo?.title && job.basicInfo.title.toLowerCase().includes(searchLower)) ||
						(job.basicInfo?.location && job.basicInfo.location.toLowerCase().includes(searchLower))
					);
				});
			}

			// Sort jobs based on sortConfig
			return filteredJobs.sort((a, b) => {
				// Extract values based on the column path
				const path = $sortConfig.column.split('.');
				let aValue = a;
				let bValue = b;

				// Navigate the object path
				for (const key of path) {
					aValue = aValue && aValue[key] !== undefined ? aValue[key] : null;
					bValue = bValue && bValue[key] !== undefined ? bValue[key] : null;
				}

				// Handle nulls and undefined
				if (aValue === null || aValue === undefined)
					return $sortConfig.direction === 'asc' ? -1 : 1;
				if (bValue === null || bValue === undefined)
					return $sortConfig.direction === 'asc' ? 1 : -1;

				// Compare based on value type
				if (typeof aValue === 'string') {
					return $sortConfig.direction === 'asc'
						? aValue.localeCompare(bValue)
						: bValue.localeCompare(aValue);
				} else {
					return $sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
				}
			});
		}
	);

	// Sort options
	const sortOptions = [
		{ label: 'Most recent', value: 'date-newest' },
		{ label: 'Highest Score', value: 'score-highest' },
		{ label: 'Status A-Z', value: 'status-asc' },
		{ label: 'Company A-Z', value: 'company-asc' }
	];

	onMount(() => {
		// Initialize the job listener with the current user ID
		initJobListener('test_user'); // Replace with actual user ID when available
	});

	onDestroy(() => {
		// Any cleanup needed
	});

	// Pagination
	$: totalPages = Math.ceil($sortedJobs.length / rowsPerPage);
	$: paginatedJobs = $sortedJobs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	function previousPage() {
		if (currentPage > 1) currentPage--;
	}

	function formatDate(isoDateString) {
		if (!isoDateString) return 'N/A';

		try {
			const date = new Date(isoDateString);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = String(date.getFullYear()).slice(-2);
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			return `${day}.${month}.${year}, ${hours}:${minutes}`;
		} catch (error) {
			return 'N/A';
		}
	}

	function truncateText(text, maxLength = 30) {
		if (!text || text === 'N/A') return text;
		return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
	}

	function handleSort(event) {
		const value = event.target.value;
		switch (value) {
			case 'date-newest':
				$sortConfig = { column: 'details.postedDate', direction: 'desc' };
				break;
			case 'date-oldest':
				$sortConfig = { column: 'details.postedDate', direction: 'asc' };
				break;
			case 'score-highest':
				$sortConfig = { column: 'match.finalScore', direction: 'desc' };
				break;
			case 'score-lowest':
				$sortConfig = { column: 'match.finalScore', direction: 'asc' };
				break;
			case 'status-asc':
				$sortConfig = { column: 'processing.status', direction: 'asc' };
				break;
			case 'status-desc':
				$sortConfig = { column: 'processing.status', direction: 'desc' };
				break;
			case 'company-asc':
				$sortConfig = { column: 'basicInfo.company', direction: 'asc' };
				break;
			case 'company-desc':
				$sortConfig = { column: 'basicInfo.company', direction: 'desc' };
				break;
		}
		sortValue = value;
	}

	function handleRowClick(job) {
		// Placeholder for navigation - will be implemented later
		console.log('Clicked job:', job.id);
		// goto(`/job/${job.id}`); // This would be the actual implementation
	}
</script>

<div class="container mx-auto w-full max-w-7xl px-4">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h2 class="text-xl font-bold">Scraped Jobs</h2>
			<div>
				<span class="badge-primary badge">Total: {$totalJobs}</span>
			</div>
		</div>
		<div class="flex items-center gap-4">
			<div class="relative w-48">
				<select
					bind:value={sortValue}
					on:change={handleSort}
					class="w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-4 pr-8"
				>
					{#each sortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			<div class="relative w-64">
				<iconify-icon
					icon="gravity-ui:magnifier"
					class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
				></iconify-icon>
				<input
					type="search"
					bind:value={$searchText}
					placeholder="Search jobs"
					class="w-full rounded-md border border-gray-300 py-2 pl-10"
				/>
			</div>
		</div>
	</div>

	<div class="space-y-4">
		{#if $isLoading}
			<p class="text-center">Loading...</p>
		{:else}
			<div class="card table-container">
				<table class="table table-compact w-full">
					<thead>
						<tr class="bg-tertiary-500">
							<th class="w-[10%]"></th>
							<!-- Logo column -->
							<th class="w-[20%]">Company</th>
							<th class="w-[20%]">Title</th>
							<th class="w-[20%]">Location</th>
							<th class="w-[10%]">Match Score</th>
							<th class="w-[15%]">Date</th>
							<th class="w-[5%]">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedJobs as job}
							<tr
								on:click={() => handleRowClick(job)}
								class="cursor-pointer transition-colors duration-200 hover:bg-tertiary-100"
							>
								<td class="flex justify-center">
									{#if job.basicInfo?.companyLogo}
										<img
											src={job.basicInfo.companyLogo}
											alt="{job.basicInfo?.company || 'Company'} logo"
											class="h-8 w-8 rounded object-contain"
										/>
									{/if}
								</td>
								<td title={job.basicInfo?.company || 'N/A'}
									>{truncateText(job.basicInfo?.company || 'N/A')}</td
								>
								<td title={job.basicInfo?.title || 'N/A'}
									>{truncateText(job.basicInfo?.title || 'N/A')}</td
								>
								<td title={job.basicInfo?.location || 'N/A'}
									>{truncateText(job.basicInfo?.location || 'N/A')}</td
								>
								<td>{job.match?.finalScore ? Math.round(job.match.finalScore) : 'N/A'}</td>
								<td>{formatDate(job.details?.postedDate)}</td>
								<td>{job.processing?.status || 'N/A'}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="7" class="!p-2">
								<div class="relative flex h-8 items-center justify-center">
									<div class="absolute left-0">
										<span class="text-gray-400">
											Showing {Math.min((currentPage - 1) * rowsPerPage + 1, $sortedJobs.length)} - {Math.min(
												currentPage * rowsPerPage,
												$sortedJobs.length
											)} <span class="lowercase">of</span>
											{$sortedJobs.length} entries
										</span>
									</div>
									<div class="flex items-center gap-1">
										<button
											class="variant-soft btn btn-sm h-6 min-h-0 !py-0"
											on:click={previousPage}
											disabled={currentPage === 1}
										>
											<iconify-icon icon="solar:map-arrow-left-bold" width="20" height="20"
											></iconify-icon>
										</button>
										<span class="flex items-center px-2 lowercase">
											Page {currentPage} of {totalPages}
										</span>
										<button
											class="variant-soft btn btn-sm h-6 min-h-0 !py-0"
											on:click={nextPage}
											disabled={currentPage === totalPages}
										>
											<iconify-icon icon="solar:map-arrow-right-bold" width="20" height="20"
											></iconify-icon>
										</button>
									</div>
								</div>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</div>
</div>
