<script>
    import { onMount, onDestroy } from 'svelte';
    import { jobStatsStore } from '$lib/stores/jobStatsStore';
    import { authStore } from '$lib/stores/authStore';
    
    let userId;
    let unsubscribe;
    let stats = [];
    let isLoading = true;
    let debugInfo = {};
    
    // Derived calculations
    $: todayStats = getTodayStats(stats);
    $: last7DaysStats = getLast7DaysStats(stats);
    $: lastMonthStats = getLastMonthStats(stats);
    
    // Get today's stats
    function getTodayStats(stats) {
      const today = new Date();
      const todayFormatted = formatDate(today);
      const todayData = stats.find(item => item.date === todayFormatted) || { total: 0, lowScore: 0, highScore: 0 };
      return todayData;
    }
    
    // Get last 7 days stats
    function getLast7DaysStats(stats) {
      const today = new Date();
      const last7Days = Array(7).fill().map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - i);
        return formatDate(d);
      });
      
      // Filter stats for last 7 days and sum them
      return stats
        .filter(item => last7Days.includes(item.date))
        .reduce((acc, curr) => {
          return {
            total: acc.total + curr.total,
            lowScore: acc.lowScore + curr.lowScore,
            highScore: acc.highScore + curr.highScore
          };
        }, { total: 0, lowScore: 0, highScore: 0 });
    }
    
    // Get last month stats
    function getLastMonthStats(stats) {
      return stats.reduce((acc, curr) => {
        return {
          total: acc.total + curr.total,
          lowScore: acc.lowScore + curr.lowScore,
          highScore: acc.highScore + curr.highScore
        };
      }, { total: 0, lowScore: 0, highScore: 0 });
    }
    
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
        loadingUnsubscribe();
        debugUnsubscribe();
        jobStatsStore.cleanup();
      };
    });
  </script>
  
  <div>
    <h3 class="text-lg font-bold mb-4">Job Statistics</h3>
    
    {#if isLoading}
      <p>Loading job statistics...</p>
    {:else if stats.length === 0}
      <p>No job data available</p>
    {:else}
      <div class="space-y-4">
        <!-- Today's Stats -->
        <div class="border p-2">
          <h4 class="font-bold">Today</h4>
          <p>Total Jobs: {todayStats.total}</p>
          <p>Good Matches (≥ 50): {todayStats.highScore}</p>
          <p>Poor Matches (&lt; 50): {todayStats.lowScore}</p>
        </div>
        
        <!-- Last 7 Days Stats -->
        <div class="border p-2">
          <h4 class="font-bold">Last 7 Days</h4>
          <p>Total Jobs: {last7DaysStats.total}</p>
          <p>Good Matches (≥ 50): {last7DaysStats.highScore}</p>
          <p>Poor Matches (&lt; 50): {last7DaysStats.lowScore}</p>
        </div>
        
        <!-- Last Month Stats -->
        <div class="border p-2">
          <h4 class="font-bold">All Jobs</h4>
          <p>Total Jobs: {lastMonthStats.total}</p>
          <p>Good Matches (≥ 50): {lastMonthStats.highScore}</p>
          <p>Poor Matches (&lt; 50): {lastMonthStats.lowScore}</p>
        </div>
        
        <!-- Debug Info -->
        <div class="mt-4 text-xs text-gray-500">
          <p>Jobs loaded: {debugInfo.jobsLoaded || 0}</p>
          <p>Last updated: {debugInfo.lastUpdated ? debugInfo.lastUpdated.toLocaleTimeString() : 'Never'}</p>
        </div>
      </div>
    {/if}
  </div>