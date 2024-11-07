<script>
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/firebase';
	import { jobStore, sortedJobs, loading, error, sortConfig, searchText } from '$lib/jobStore';
  
	let user = null;
	let unsubscribeAuth = null;
	let currentPage = 1;
	let rowsPerPage = 10;
  
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
	$: paginatedJobs = $sortedJobs.slice(
	  (currentPage - 1) * rowsPerPage,
	  currentPage * rowsPerPage
	);
  
	function nextPage() {
	  if (currentPage < totalPages) currentPage++;
	}
  
	function previousPage() {
	  if (currentPage > 1) currentPage--;
	}
  
	function formatDate(timestamp) {
	  if (timestamp && timestamp.toDate) {
		const date = timestamp.toDate();
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = String(date.getFullYear()).slice(-2);
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${day}.${month}.${year}, ${hours}:${minutes}`;
	  }
	  return 'N/A';
	}
  
	function handleSort(column) {
	  $sortConfig = {
		column,
		direction: $sortConfig.column === column && $sortConfig.direction === 'asc' ? 'desc' : 'asc'
	  };
	}
  </script>
  
  <div class="container mx-auto p-4">
	{#if $loading}
	  <p class="text-center">Loading...</p>
	{:else if $error}
	  <p class="text-center text-red-500">{$error}</p>
	{:else if !user}
	  <p class="text-center">Please sign in to view your job list.</p>
	{:else}
	  <!-- Search and Rows Per Page -->
	  <div class="flex justify-between items-center mb-4">
		<input
		  type="text"
		  placeholder="Search..."
		  bind:value={$searchText}
		  class="input input-bordered w-full max-w-xs"
		/>
		<select
		  bind:value={rowsPerPage}
		  class="select select-bordered w-32"
		  on:change={() => currentPage = 1}
		>
		  {#each [5, 10, 25, 50, 100] as value}
			<option {value}>{value} per page</option>
		  {/each}
		</select>
	  </div>
  
	  <!-- Table -->
	  <div class="overflow-x-auto">
		<table class="table table-hover w-full">
		  <thead>
			<tr>
			  <th class="!px-2">No.</th>
			  <th on:click={() => handleSort('generalData.status')} class="cursor-pointer">
				Status {$sortConfig.column === 'generalData.status' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('companyInfo.name')} class="cursor-pointer">
				Company {$sortConfig.column === 'companyInfo.name' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('jobInfo.jobTitle')} class="cursor-pointer">
				Title {$sortConfig.column === 'jobInfo.jobTitle' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('companyInfo.industry')} class="cursor-pointer">
				Industry {$sortConfig.column === 'companyInfo.industry' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('AccumulatedScores.accumulatedScore')} class="cursor-pointer">
				Score {$sortConfig.column === 'AccumulatedScores.accumulatedScore' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('generalData.timestamp')} class="cursor-pointer">
				Date {$sortConfig.column === 'generalData.timestamp' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
			  </th>
			</tr>
		  </thead>
		  <tbody>
			{#each paginatedJobs as job, i}
			  <tr>
				<td class="!px-2">{(currentPage - 1) * rowsPerPage + i + 1}</td>
				<td>{job.generalData?.status || ''}</td>
				<td>{job.companyInfo?.name || 'N/A'}</td>
				<td>{job.jobInfo?.jobTitle || 'N/A'}</td>
				<td>{job.companyInfo?.industry || 'N/A'}</td>
				<td>{job.AccumulatedScores?.accumulatedScore ? Math.round(job.AccumulatedScores.accumulatedScore) : 'N/A'}</td>
				<td>{formatDate(job.generalData?.timestamp)}</td>
			  </tr>
			{/each}
		  </tbody>
		</table>
	  </div>
  
	  <!-- Pagination -->
	  <div class="flex justify-between items-center mt-4">
		<div class="text-sm text-gray-600">
		  Showing {Math.min((currentPage - 1) * rowsPerPage + 1, $sortedJobs.length)} - {Math.min(currentPage * rowsPerPage, $sortedJobs.length)} of {$sortedJobs.length} entries
		</div>
		<div class="flex gap-2">
		  <button
			class="btn btn-sm"
			on:click={() => currentPage = 1}
			disabled={currentPage === 1}
		  >
			First
		  </button>
		  <button
			class="btn btn-sm"
			on:click={previousPage}
			disabled={currentPage === 1}
		  >
			Previous
		  </button>
		  <span class="flex items-center px-4">
			Page {currentPage} of {totalPages}
		  </span>
		  <button
			class="btn btn-sm"
			on:click={nextPage}
			disabled={currentPage === totalPages}
		  >
			Next
		  </button>
		  <button
			class="btn btn-sm"
			on:click={() => currentPage = totalPages}
			disabled={currentPage === totalPages}
		  >
			Last
		  </button>
		</div>
	  </div>
	{/if}
  </div>
  
  <style>
	:global(.table th), :global(.table td) {
	  @apply px-4 py-2 border-b;
	}
	
	:global(.table th) {
	  @apply font-semibold bg-gray-50;
	}
  
	:global(.table tr:hover) {
	  @apply bg-gray-50;
	}
  </style>