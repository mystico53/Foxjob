<script>
    import { onMount, onDestroy } from 'svelte';
    import { currentBatch, totalJobs } from '$lib/stores/scrapeStore';
  
    // Props
    export let isSearching = false;
    export let searchStartTime = null;
    export let searchParams = {};
  
    let elapsedTime = 0;
    let interval;
  
    $: if (isSearching && searchStartTime) {
      startTimer();
    } else {
      stopTimer();
    }
  
    function startTimer() {
      stopTimer(); // Clear any existing interval
      interval = setInterval(() => {
        elapsedTime = Math.floor((Date.now() - searchStartTime) / 1000);
      }, 1000);
    }
  
    function stopTimer() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
  
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  
    // Format search parameters for display
    $: formattedParams = Object.entries(searchParams)
      .filter(([_, value]) => value)
      .map(([key, value]) => {
        const readableKey = key.charAt(0).toUpperCase() + 
          key.slice(1).replace(/([A-Z])/g, ' $1');
        return `${readableKey}: ${value}`;
      })
      .join(' • ');
  
    onDestroy(() => {
      stopTimer();
    });
  </script>
  
  {#if isSearching}
    <div class="card variant-glass-surface p-4 my-4">
      <h3 class="h3 mb-3">Search Status</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Time Elapsed -->
        <div class="flex items-center gap-2">
          <i class="fas fa-clock text-primary-500"></i>
          <div>
            <div class="font-medium">Time Elapsed</div>
            <div class="text-sm opacity-75">{formatTime(elapsedTime)}</div>
          </div>
        </div>
  
        <!-- Current Batch -->
        <div class="flex items-center gap-2">
          <i class="fas fa-layer-group text-primary-500"></i>
          <div>
            <div class="font-medium">Current Batch</div>
            <div class="text-sm opacity-75">{$currentBatch}</div>
          </div>
        </div>
  
        <!-- Jobs Found -->
        <div class="flex items-center gap-2">
          <i class="fas fa-users text-primary-500"></i>
          <div>
            <div class="font-medium">Jobs Found</div>
            <div class="text-sm opacity-75">{$totalJobs} jobs</div>
          </div>
        </div>
  
        <!-- Search Parameters -->
        <div class="flex items-center gap-2 col-span-full">
          <i class="fas fa-search text-primary-500"></i>
          <div>
            <div class="font-medium">Search Parameters</div>
            <div class="text-sm opacity-75 line-clamp-2">
              {formattedParams || 'No filters applied'}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}