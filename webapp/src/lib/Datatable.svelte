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

<div class="container mx-auto px-4 max-w-7xl">
  
  <div class="space-y-4">
    {#if $loading}
      <p class="text-center">Loading...</p>
    {:else if $error}
      <p class="text-center text-error">{$error}</p>
    {:else if !user}
      <p class="text-center">Please sign in to view your job list.</p>
    {:else}

        <!-- Search and Rows Per Page -->
    <div class="flex w-64">

        <div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
            <div class="input-group-shim p-0"></div>
            <div class="relative">
                <iconify-icon 
                  icon="gravity-ui:magnifier" 
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                ></iconify-icon>
                <input 
                  type="search" 
                  placeholder="Search jobs" 
                  bind:value={$searchText} 
                  class="pl-6" 
                />
              </div>
            
        </div>

    </div>
  
      <!-- Table Container -->
      <div class="table-container">
        <table class="table table-hover table-compact">
          <thead>
            <tr>
              
              <th class="w-[10%]" on:click={() => handleSort('generalData.status')} role="button">
                Status {$sortConfig.column === 'generalData.status' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[20%]" on:click={() => handleSort('companyInfo.name')} role="button">
                Company {$sortConfig.column === 'companyInfo.name' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[20%]" on:click={() => handleSort('jobInfo.jobTitle')} role="button">
                Title {$sortConfig.column === 'jobInfo.jobTitle' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[15%]" on:click={() => handleSort('companyInfo.industry')} role="button">
                Industry {$sortConfig.column === 'companyInfo.industry' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[10%]" on:click={() => handleSort('AccumulatedScores.accumulatedScore')} role="button">
                Score {$sortConfig.column === 'AccumulatedScores.accumulatedScore' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th class="w-[20%]" on:click={() => handleSort('generalData.timestamp')} role="button">
                Date {$sortConfig.column === 'generalData.timestamp' ? $sortConfig.direction === 'asc' ? '▲' : '▼' : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedJobs as job, i}
              <tr>
                
                <td>{job.generalData?.status || ''}</td>
                <td>{job.companyInfo?.name || 'N/A'}</td>
                <td>{job.jobInfo?.jobTitle || 'N/A'}</td>
                <td>{job.companyInfo?.industry || 'N/A'}</td>
                <td>{job.AccumulatedScores?.accumulatedScore ? Math.round(job.AccumulatedScores.accumulatedScore) : 'N/A'}</td>
                <td>{formatDate(job.generalData?.timestamp)}</td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="7">
                <div class="flex justify-between items-center">
                  <span>
                    Showing {Math.min((currentPage - 1) * rowsPerPage + 1, $sortedJobs.length)} - {Math.min(currentPage * rowsPerPage, $sortedJobs.length)} of {$sortedJobs.length} entries
                  </span>
                  <div class="flex gap-2">
                    
                    <button class="btn btn-sm variant-filled" on:click={previousPage} disabled={currentPage === 1}>
                      Previous
                    </button>
                    <span class="flex items-center px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button class="btn btn-sm variant-filled" on:click={nextPage} disabled={currentPage === totalPages}>
                      Next
                    </button>
                    
                  </div>
                </div>
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    {/if}
  </div>
</div>