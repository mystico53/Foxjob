<script>
  import { onMount, onDestroy } from 'svelte';
  import { auth } from '$lib/firebase';
  import { jobStore, sortedJobs, loading, error, sortConfig, searchText } from './jobStore';

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
</script>

<div class="w-full container mx-auto px-4 max-w-7xl">
<div class="flex justify-between items-center mb-4">
  <h2 class="text-xl font-bold">Job List</h2>
  <div class="flex gap-4 items-center">
    <div class="relative w-48">
      <select
        bind:value={sortValue}
        on:change={handleSort}
        class="w-full rounded-md border border-gray-300 py-2 pl-4 pr-8 appearance-none bg-white"
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
        class="pl-10 w-full rounded-md border border-gray-300 py-2"
      />
    </div>
  </div>
</div>

<div class="space-y-4">
  {#if $loading}
    <p class="text-center">Loading...</p>
  {:else if $error}
    <p class="text-center text-error">{$error}</p>
  {:else if !user}
    <p class="text-center">Please sign in to view your job list.</p>
  {:else}  

  <div class="table-container card">
      <table class="table table-compact w-full">
        <thead>
          <tr class="bg-tertiary-500">
            <th class="w-[15%]">Company</th>
            <th class="w-[25%]">Title</th>
            <th class="w-[25%]">Industry</th>
            <th class="w-[10%]">Score</th>
            <th class="w-[15%]">Date</th>
            <th class="w-[10%]">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedJobs as job}
            <tr>
              <td>{job.companyInfo?.name || 'N/A'}</td>
              <td>{job.jobInfo?.jobTitle || 'N/A'}</td>
              <td>{job.companyInfo?.industry || 'N/A'}</td>
              <td>{job.AccumulatedScores?.accumulatedScore ? Math.round(job.AccumulatedScores.accumulatedScore) : 'N/A'}</td>
              <td>{formatDate(job.generalData?.timestamp)}</td>
              <td>{job.generalData?.status || ''}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="!p-2">
              <div class="flex justify-between items-center h-8">
                <span class="text-sm">
                  Showing {Math.min((currentPage - 1) * rowsPerPage + 1, $sortedJobs.length)} - {Math.min(currentPage * rowsPerPage, $sortedJobs.length)} of {$sortedJobs.length} entries
                </span>
                <div class="flex gap-1">
                  <button 
                    class="btn btn-sm !py-0 h-6 min-h-0 variant-soft"
                    on:click={previousPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span class="flex items-center px-2 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    class="btn btn-sm !py-0 h-6 min-h-0 variant-soft"
                    on:click={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
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