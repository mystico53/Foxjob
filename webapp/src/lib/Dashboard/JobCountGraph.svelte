<!-- JobCountGraph.svelte -->
<script>
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    import { auth } from '$lib/firebase';
    import { jobStore } from '$lib/jobStore';
    import { writable, derived } from 'svelte/store';
    import { onMount } from 'svelte';
  
    // Time period store
    const timePeriod = writable('month');
    
    // Filtered jobs store
    const filteredJobs = derived(
        [jobStore, timePeriod],
        ([$jobStore, $timePeriod]) => {
            if (!$jobStore) return [];
            
            // If "all" is selected, return all jobs
            if ($timePeriod === 'all') {
                return $jobStore;
            }
            
            const now = new Date();
            const startDate = new Date();
            
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
            return $jobStore.filter(job => {
                if (!job.generalData?.timestamp) return false;
                const jobDate = job.generalData.timestamp.toDate();
                return jobDate >= startDate && jobDate <= now;
            });
        }
    );
  
    // Stats derived from filtered jobs
    $: totalJobs = $filteredJobs.length;
    $: highScoringJobs = $filteredJobs.filter(
        job => job.AccumulatedScores?.accumulatedScore > 60
    ).length;
    $: progressPercentage = totalJobs > 0 ? Math.round((highScoringJobs / totalJobs) * 100) : 0;
  
    // Time period options with "All" added
    const timeOptions = [
        { value: 'day', label: 'Day' },
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
        { value: 'all', label: 'All' },
    ];
  </script>
  
  <div class="h-full w-full flex flex-col">
      <div class="flex justify-between items-center mb-4">
          <h2 class="text-[20px] font-bold">Jobs Collected</h2>
          <div class="flex items-center gap-2">
              <select
                  class="select bg-surface-200 dark:bg-surface-700 p-2 rounded-container-token w-24"
                  bind:value={$timePeriod}
              >
                  {#each timeOptions as option}
                      <option value={option.value}>{option.label}</option>
                  {/each}
              </select>
          </div>
      </div>
    
      <div class="flex-1 flex flex-col items-center justify-center">
          <div class="relative w-full flex items-center justify-center">
              <div class="w-40 h-40"> <!-- Fixed size for the progress radial container -->
                  <ProgressRadial
                      class="progress-radial"
                      value={progressPercentage}
                      stroke={40}
                      meter="stroke-primary-500"
                      track="stroke-tertiary-700/30"
                      font={180}
                      strokeLinecap="round"
                  >
                      {totalJobs}
                  </ProgressRadial>
              </div>
          </div>
          <div class="flex items-center gap-2 mt-4">
              <div class="w-3 h-3 rounded-full" style="background-color: #FF9C00;"></div>
              <p class="text-sm">{highScoringJobs} Jobs with a Score of 75 or above</p>
          </div>
      </div>
  </div>
    
  <style>
      :global(.progress-radial) {
          width: 100% !important;
          height: 100% !important;
      }
  </style>