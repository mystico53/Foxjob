<script>
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/firebase';
	import {
		jobStore,
		sortedJobs,
		loading,
		error,
		sortConfig,
		searchText
	} from '$lib/stores/jobStore';
	import { goto } from '$app/navigation';
	import ProcessingJobsCount from '$lib/utilities/ProcessingJobsCount.svelte';

	let user = null;
	let unsubscribeAuth = null;
	let currentPage = 1;
	let rowsPerPage = 10;
	let sortValue = 'date-newest'; // Default sort

	// Sort options
	const sortOptions = [
		{ label: 'Most recent', value: 'date-newest' },
		{ label: 'Highest Score', value: 'score-highest' },
		{ label: 'Status A-Z', value: 'status-asc' },
		{ label: 'Company A-Z', value: 'company-asc' }
	];

	onMount(() => {
		unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
			user = currentUser;
			if (user) {
				jobStore.init(user.uid);
			}
		});
	});

	onDestroy(() => {
		if (unsubscribeAuth) unsubscribeAuth();
		jobStore.cleanup();
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

	function formatDate(dateValue) {
    // Handle Firebase Timestamp objects
    if (dateValue && dateValue.toDate) {
        const date = dateValue.toDate();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year}, ${hours}:${minutes}`;
    }
    // Handle ISO date strings
    else if (dateValue && typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date)) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}.${month}.${year}, ${hours}:${minutes}`;
        }
    }
    return 'N/A';
}

	function truncateText(text, maxLength = 30) {
		if (!text || text === 'N/A') return text;
		return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
	}

	function handleSort(event) {
		const value = event.target.value;
		switch (value) {
			case 'date-newest':
				$sortConfig = { column: 'generalData.timestamp', direction: 'desc' };
				break;
			case 'date-oldest':
				$sortConfig = { column: 'generalData.timestamp', direction: 'asc' };
				break;
			case 'score-highest':
				$sortConfig = { column: 'AccumulatedScores.accumulatedScore', direction: 'desc' };
				break;
			case 'score-lowest':
				$sortConfig = { column: 'AccumulatedScores.accumulatedScore', direction: 'asc' };
				break;
			case 'status-asc':
				$sortConfig = { column: 'generalData.status', direction: 'asc' };
				break;
			case 'status-desc':
				$sortConfig = { column: 'generalData.status', direction: 'desc' };
				break;
			case 'company-asc':
				$sortConfig = { column: 'companyInfo.name', direction: 'asc' };
				break;
			case 'company-desc':
				$sortConfig = { column: 'companyInfo.name', direction: 'desc' };
				break;
		}
		sortValue = value;
	}

	function handleRowClick(job) {
		// Just navigate to the workflow page with the job ID
		goto(`/workflow/${job.id}`);
	}
</script>

<div class="container mx-auto w-full max-w-7xl px-4">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<!-- Added a container div with flex -->
			<h2 class="text-xl font-bold">Job List</h2>
			<ProcessingJobsCount />
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
		{#if $loading}
			<p class="text-center">Loading...</p>
		{:else if $error}
			<p class="text-error text-center">{$error}</p>
		{:else if !user}
			<p class="text-center">Please sign in to view your job list.</p>
		{:else}
			<div class="table-container card">
				<table class="table-compact table w-full">
					<thead>
						<tr class="bg-tertiary-500">
							<th class="w-[25%]">Company</th>
							<th class="w-[25%]">Title</th>
							<th class="w-[25%]">Industry</th>
							<th class="w-[5%]">Score</th>
							<th class="w-[15%]">Date</th>
							<th class="w-[5%]">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedJobs as job}
							<tr
								on:click={() => handleRowClick(job)}
								class="hover:bg-tertiary-100 cursor-pointer transition-colors duration-200"
							>
							<td title={job.companyInfo?.name || 'N/A'}>
								<div class="flex items-center gap-2">
								  {#if job.companyInfo?.logoUrl}
									<span class="flex-shrink-0">
									  <img 
										src={job.companyInfo.logoUrl} 
										alt={job.companyInfo.name || 'Company logo'} 
										class="h-6 w-6 rounded-full object-cover"
									  />
									</span>
								  {/if}
								  <span>{truncateText(job.companyInfo?.name || 'N/A')}</span>
								</div>
							  </td>
								<td title={job.jobInfo?.jobTitle || 'N/A'}
									>{truncateText(job.jobInfo?.jobTitle || 'N/A')}</td
								>
								<td title={job.companyInfo?.industry || 'N/A'}
									>{truncateText(job.companyInfo?.industry || 'N/A')}</td
								>
								<td
									>{job.AccumulatedScores?.accumulatedScore
										? Math.round(job.AccumulatedScores.accumulatedScore)
										: 'N/A'}</td
								>
								<td>{job.jobInfo?.postedDate ? formatDate(job.jobInfo.postedDate) : (job.jobInfo?.postedTimeAgo || 'N/A')}</td>
								<td>{job.generalData?.status || ''}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="6" class="!p-2">
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
											class="btn btn-sm variant-soft h-6 min-h-0 !py-0"
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
											class="btn btn-sm variant-soft h-6 min-h-0 !py-0"
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
