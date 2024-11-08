<!-- JobCountGraph.svelte -->
<script>
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    import { auth } from '$lib/firebase';
    import { jobStore } from '$lib/jobStore';
    import { onMount } from 'svelte';
  
    let jobsByDate = [];
    
    // Function to get local date string without timezone offset
    function getLocalDateString(timestamp) {
        const date = timestamp.toDate();
        // Add one day to fix the offset
        date.setDate(date.getDate() + 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // Function to format date as "Nov 7, 2024"
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
        });
    }
    
    // Subscribe to the jobStore's sortedJobs
    $: {
      if ($jobStore) {
        // Group jobs by date
        const dateGroups = {};
        
        $jobStore.forEach(job => {
          if (job.generalData?.timestamp) {
            // Use local date string instead of ISO
            const date = getLocalDateString(job.generalData.timestamp);
            dateGroups[date] = (dateGroups[date] || 0) + 1;
          }
        });
  
        // Convert to array for table display
        jobsByDate = Object.entries(dateGroups)
          .map(([date, count]) => ({
            date,
            count
          }))
          .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending
      }
    }
  </script>
  
  <div class="card p-4">
    
    {#if jobsByDate.length === 0}
      <p class="text-center py-4">No job data available</p>
    {:else}
      <div class="table-container">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Date</th>
              <th>Number of scanned jobs</th>
            </tr>
          </thead>
          <tbody>
            {#each jobsByDate as { date, count }}
              <tr>
                <td>{formatDate(date)}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="badge variant-filled-primary">{count}</span>
                    <div class="w-24 h-2 rounded-full bg-primary-500" style="width: {Math.min(count * 20, 100)}%"></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
  
      <div class="mt-4">
        <p class="text-sm">Total jobs scanned: {jobsByDate.reduce((sum, { count }) => sum + count, 0)}</p>
      </div>
    {/if}
  </div>
  
  <style>
    .table-container {
      overflow-x: auto;
    }
    
    :global(.badge) {
      min-width: 2rem;
      text-align: center;
    }
  </style>