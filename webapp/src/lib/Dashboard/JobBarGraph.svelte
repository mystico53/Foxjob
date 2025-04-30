<script>
    import { onMount, onDestroy } from 'svelte';
    import { jobStatsStore } from '$lib/stores/jobStatsStore';
    import { authStore } from '$lib/stores/authStore';
    import Chart from 'chart.js/auto';
    
    let userId;
    let unsubscribe;
    let stats = [];
    let recentDaysStats = [];
    let isLoading = true;
    let debugInfo = {};
    let chartInstance;
    let chartCanvas;
    
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
        updateChart();
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
        if (chartInstance) chartInstance.destroy();
        jobStatsStore.cleanup();
      };
    });
    
    // Update or create chart when data changes
    function updateChart() {
      if (!chartCanvas || recentDaysStats.length === 0) return;
      
      if (chartInstance) {
        chartInstance.destroy();
      }
      
      const ctx = chartCanvas.getContext('2d');
      
      // Reverse the array to have today on the right
      const reversedStats = [...recentDaysStats].reverse();
      
      // Extract labels (dates)
      const labels = reversedStats.map(day => day.label);
      
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Top Matches (≥ 85)',
              data: reversedStats.map(day => day.topMatch || 0),
              backgroundColor: 'rgba(66, 153, 225, 0.9)', // Darkest blue
              borderColor: 'rgba(66, 153, 225, 1)',
              borderWidth: 1
            },
            {
              label: 'Good Matches (≥ 65)',
              data: reversedStats.map(day => day.goodMatch || 0),
              backgroundColor: 'rgba(66, 153, 225, 0.7)', // Medium blue
              borderColor: 'rgba(66, 153, 225, 0.8)',
              borderWidth: 1
            },
            {
              label: 'OK Matches (≥ 50)',
              data: reversedStats.map(day => day.okMatch || 0),
              backgroundColor: 'rgba(255, 156, 0, 0.7)', // Medium orange
              borderColor: 'rgba(255, 156, 0, 0.8)',
              borderWidth: 1
            },
            {
              label: 'Poor Matches (< 50)',
              data: reversedStats.map(day => day.poorMatch || 0),
              backgroundColor: 'rgba(220, 55, 1, 0.7)', // Medium red
              borderColor: 'rgba(220, 55, 1, 0.8)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: {
                display: false
              }
            },
            y: {
              stacked: true,
              grid: {
                display: false
              },
              ticks: {
                stepSize: 10 // Show ticks at intervals of 10
              }
            }
          },
          plugins: {
            legend: {
              display: false // Hide the legend
            },
            tooltip: {
              enabled: false // Disabled as per request
            }
          }
        }
      });
    }
    
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
    
    // Update chart when the canvas is available
    $: if (chartCanvas && recentDaysStats.length > 0 && !chartInstance) {
      updateChart();
    }
  </script>
  
  <div>
    <div class="space-y-4">
      {#if isLoading}
        <p>Loading job statistics...</p>
      {:else if recentDaysStats.length === 0}
        <p>No recent job data available</p>
      {:else}
        <!-- Chart Container -->
        <div class="p-2">
          <div class="h-64 w-full">
            <canvas bind:this={chartCanvas}></canvas>
          </div>
          
          <!-- Color Legend (manually added instead of chart legend) -->
          <div class="flex flex-wrap items-center justify-center mt-2 gap-4">
            <div class="flex items-center">
              <div class="w-4 h-4 mr-1" style="background-color: rgba(66, 153, 225, 0.9);"></div>
              <span>Top Matches (≥ 85)</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 mr-1" style="background-color: rgba(66, 153, 225, 0.7);"></div>
              <span>Good Matches (≥ 65)</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 mr-1" style="background-color: rgba(255, 156, 0, 0.7);"></div>
              <span>OK Matches (≥ 50)</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 mr-1" style="background-color: rgba(220, 55, 1, 0.7);"></div>
              <span>Poor Matches (&lt; 50)</span>
            </div>
          </div>
        </div>
        
        <!-- Text Details (keeping for reference) -->
        <div class="border p-2">
          <h4 class="font-bold">Recent Job Activity Details</h4>
          
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
      {/if}
    </div>
  </div>