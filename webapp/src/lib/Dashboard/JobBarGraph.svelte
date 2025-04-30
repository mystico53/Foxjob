<script>
    import { onMount, onDestroy } from 'svelte';
    import { jobStatsStore } from '$lib/stores/jobStatsStore';
    import { authStore } from '$lib/stores/authStore';
    
    let userId;
    let unsubscribe;
    let stats = [];
    let recentDaysStats = [];
    let isLoading = true;
    let debugInfo = {};
    
    // Helper function to format date consistently (copied from jobStatsStore)
    function formatDate(date) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    // Subscribe to auth store to get the userId
    onMount(() => {
      unsubscribe = authStore.subscribe(user => {
        userId = user?.uid;
        if (userId) {
          console.log('JobBarGraph: Initializing jobStatsStore with userId', userId);
          jobStatsStore.init(userId);
        }
      });
      
      // Subscribe to the job stats store
      const statsUnsubscribe = jobStatsStore.subscribe(data => {
        console.log('JobBarGraph: Received data', data);
        stats = data;
      });
      
      // Subscribe to recent days stats
      const recentDaysUnsubscribe = jobStatsStore.recentDays.subscribe(data => {
        console.log('JobBarGraph: Received recent days data', data);
        recentDaysStats = data;
      });
      
      // Subscribe to loading state
      const loadingUnsubscribe = jobStatsStore.loading.subscribe(value => {
        isLoading = value;
      });
      
      // Subscribe to debug info
      const debugUnsubscribe = jobStatsStore.debug.subscribe(data => {
        debugInfo = data;
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
        statsUnsubscribe();
        recentDaysUnsubscribe();
        loadingUnsubscribe();
        debugUnsubscribe();
        jobStatsStore.cleanup();
      };
    });
    
    // Calculate aggregated stats for 7 days
    $: last7DaysStats = calculateLast7DaysStats(stats);
    
    function calculateLast7DaysStats(stats) {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      const sevenDaysAgoFormatted = formatDate(sevenDaysAgo);
      
      return stats
        .filter(item => item.date >= sevenDaysAgoFormatted)
        .reduce((acc, curr) => {
          return {
            total: acc.total + curr.total,
            topMatch: acc.topMatch + (curr.topMatch || 0),
            goodMatch: acc.goodMatch + (curr.goodMatch || 0),
            okMatch: acc.okMatch + (curr.okMatch || 0),
            poorMatch: acc.poorMatch + (curr.poorMatch || 0)
          };
        }, { 
          total: 0, 
          topMatch: 0, 
          goodMatch: 0,
          okMatch: 0,
          poorMatch: 0 
        });
    }
    
    // Calculate all-time stats
    $: allTimeStats = calculateAllTimeStats(stats);
    
    function calculateAllTimeStats(stats) {
      return stats.reduce((acc, curr) => {
        return {
          total: acc.total + curr.total,
          topMatch: acc.topMatch + (curr.topMatch || 0),
          goodMatch: acc.goodMatch + (curr.goodMatch || 0),
          okMatch: acc.okMatch + (curr.okMatch || 0),
          poorMatch: acc.poorMatch + (curr.poorMatch || 0)
        };
      }, { 
        total: 0, 
        topMatch: 0, 
        goodMatch: 0,
        okMatch: 0,
        poorMatch: 0 
      });
    }
  </script>
  
  <div>
    <h3 class="text-lg font-bold mb-4">Job Statistics</h3>
    
    {#if isLoading}
      <p>Loading job statistics...</p>
    {:else if stats.length === 0}
      <p>No job data available</p>
    {:else}
      <div class="space-y-4">
        <!-- Past Five Days Stats -->
        <div class="border p-2">
          <h4 class="font-bold">Recent Job Activity</h4>
          
          {#each recentDaysStats as day}
            <div class="border-b py-2 last:border-b-0">
              <h5 class="font-semibold">{day.label} ({day.date})</h5>
              <p>Total Jobs: {day.total}</p>
              <p>Top Matches (≥ 85): {day.topMatch || 0}</p>
              <p>Good Matches (≥ 65): {day.goodMatch || 0}</p>
              <p>OK Matches (≥ 50): {day.okMatch || 0}</p>
              <p>Poor Matches (&lt; 50): {day.poorMatch || 0}</p>
            </div>
          {/each}
        </div>
        
        <!-- Last 7 Days Stats -->
        <div class="border p-2">
          <h4 class="font-bold">Last 7 Days</h4>
          <p>Total Jobs: {last7DaysStats.total}</p>
          <p>Top Matches (≥ 85): {last7DaysStats.topMatch || 0}</p>
          <p>Good Matches (≥ 65): {last7DaysStats.goodMatch || 0}</p>
          <p>OK Matches (≥ 50): {last7DaysStats.okMatch || 0}</p>
          <p>Poor Matches (&lt; 50): {last7DaysStats.poorMatch || 0}</p>
        </div>
        
        <!-- All-Time Stats -->
        <div class="border p-2">
          <h4 class="font-bold">All Jobs</h4>
          <p>Total Jobs: {allTimeStats.total}</p>
          <p>Top Matches (≥ 85): {allTimeStats.topMatch || 0}</p>
          <p>Good Matches (≥ 65): {allTimeStats.goodMatch || 0}</p>
          <p>OK Matches (≥ 50): {allTimeStats.okMatch || 0}</p>
          <p>Poor Matches (&lt; 50): {allTimeStats.poorMatch || 0}</p>
        </div>
        
        <!-- Debug Info -->
        <div class="mt-4 text-xs text-gray-500">
          <p>Jobs loaded: {debugInfo.jobsLoaded || 0}</p>
          <p>Last updated: {debugInfo.lastUpdated ? debugInfo.lastUpdated.toLocaleTimeString() : 'Never'}</p>
        </div>
      </div>
    {/if}
  </div>