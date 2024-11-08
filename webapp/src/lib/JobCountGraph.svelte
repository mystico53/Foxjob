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

    // Function to calculate bar width based on the maximum count across all days
    function calculateBarWidth(count, maxCount) {
        if (maxCount === 0) return 0;
        return (count / maxCount) * 100;
    }
    
    let maxDailyJobs = 0;
    
    // Subscribe to the jobStore's sortedJobs
    $: {
      if ($jobStore) {
        // Group jobs by date
        const dateGroups = {};
        
        $jobStore.forEach(job => {
          if (job.generalData?.timestamp) {
            const date = getLocalDateString(job.generalData.timestamp);
            
            if (!dateGroups[date]) {
                dateGroups[date] = {
                    total: 0,
                    bookmarked: 0
                };
            }
            
            dateGroups[date].total += 1;
            
            // Check if job is bookmarked
            if (job.generalData?.status === 'bookmarked') {
                dateGroups[date].bookmarked += 1;
            }
          }
        });
  
        // Find the maximum daily total for scaling
        maxDailyJobs = Math.max(...Object.values(dateGroups).map(counts => counts.total));

        // Convert to array for table display
        jobsByDate = Object.entries(dateGroups)
          .map(([date, counts]) => ({
            date,
            total: counts.total,
            bookmarked: counts.bookmarked
          }))
          .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending
      }
    }

    let totalBookmarked = 0;
    $: totalBookmarked = jobsByDate.reduce((sum, { bookmarked }) => sum + bookmarked, 0);
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
              <th>Jobs</th>
            </tr>
          </thead>
          <tbody>
            {#each jobsByDate as { date, total, bookmarked }}
              <tr>
                <td>{formatDate(date)}</td>
                <td class="w-full">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <div class="flex gap-2">
                        <span class="badge variant-filled-primary">{total}</span>
                        {#if bookmarked > 0}
                          <span class="badge variant-filled-warning">{bookmarked}</span>
                        {/if}
                      </div>
                      <div class="relative w-full h-2 bg-surface-500/30 rounded-full overflow-hidden">
                        <!-- Total jobs bar -->
                        <div 
                          class="absolute left-0 top-0 h-full bg-primary-500 rounded-full" 
                          style="width: {calculateBarWidth(total, maxDailyJobs)}%"
                        ></div>
                        <!-- Bookmarked jobs bar - percentage of the total bar -->
                        {#if bookmarked > 0}
                          <div 
                            class="absolute left-0 top-0 h-full bg-black rounded-full" 
                            style="width: {calculateBarWidth(bookmarked, maxDailyJobs)}%"
                          ></div>
                        {/if}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
  
      <div class="mt-4 flex gap-4">
        <p class="text-sm">Total jobs scanned: {jobsByDate.reduce((sum, { total }) => sum + total, 0)}</p>
        <p class="text-sm">Total bookmarked: {totalBookmarked}</p>
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