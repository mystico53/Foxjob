<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { jobStore, sortedJobs, loading, error, sortConfig, searchText } from './jobStore';
  
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

<div class="w-full container mx-auto px-4 max-w-7xl">

  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-bold">Job List</h2>
    <div class="relative w-64"> <!-- Fixed width using standard Tailwind class -->
      <iconify-icon
        icon="gravity-ui:magnifier"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      ></iconify-icon>
      <input
        type="search"
        placeholder="Search jobs"
        class="pl-10 w-full rounded-md border border-gray-300 py-2"
      />
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
  
      <!-- Table Container -->
      <div class="table-container card">
        <table class="table table-compact">
          <thead>
            <tr class="bg-tertiary-500">
              <th class="w-[25%]" on:click={() => handleSort('companyInfo.name')} role="button">
                Company {$sortConfig.column === 'companyInfo.name' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[25%]" on:click={() => handleSort('jobInfo.jobTitle')} role="button">
                Title {$sortConfig.column === 'jobInfo.jobTitle' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[20%]" on:click={() => handleSort('companyInfo.industry')} role="button">
                Industry {$sortConfig.column === 'companyInfo.industry' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[10%]" on:click={() => handleSort('AccumulatedScores.accumulatedScore')} role="button">
                Score {$sortConfig.column === 'AccumulatedScores.accumulatedScore' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[10%]" on:click={() => handleSort('generalData.timestamp')} role="button">
                Date {$sortConfig.column === 'generalData.timestamp' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[10%]" on:click={() => handleSort('generalData.status')} role="button">
                Status {$sortConfig.column === 'generalData.status' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedJobs as job, i}
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
              <td colspan="6" class="!p-2"> <!-- Force override any existing padding -->
                <div class="flex justify-between items-center h-8"> <!-- Fixed height -->
                  <span class="text-sm">
                    Showing {Math.min((currentPage - 1) * rowsPerPage + 1, $sortedJobs.length)} - {Math.min(currentPage * rowsPerPage, $sortedJobs.length)} of {$sortedJobs.length} entries
                  </span>
                  <div class="flex gap-1">
                    <button class="btn btn-sm !py-0 h-6 min-h-0 variant-soft"> <!-- Override button height -->
                      Previous
                    </button>
                    <span class="flex items-center px-2 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button class="btn btn-sm !py-0 h-6 min-h-0 variant-soft">
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