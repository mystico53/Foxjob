// $lib/stores/jobStatsStore.js
import { writable, derived } from 'svelte/store';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '$lib/firebase';

// Create the main stores
const rawJobs = writable([]);
const isLoading = writable(true);
const error = writable(null);
const dateRange = writable({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  endDate: new Date()
});

// Debug store to verify data is loading
const debug = writable({
  jobsLoaded: 0,
  lastUpdated: null,
  initialized: false
});

// Helper function to format dates consistently
function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Derived store for daily job statistics
const jobStatsByDay = derived(
  [rawJobs, dateRange],
  ([$rawJobs, $dateRange]) => {
    const stats = {};
    
    // Initialize the dates in the range
    let currentDate = new Date($dateRange.startDate);
    while (currentDate <= $dateRange.endDate) {
      const dateKey = formatDate(currentDate);
      stats[dateKey] = {
        total: 0,
        lowScore: 0,  // Score < 50
        highScore: 0  // Score >= 50
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Process each job
    $rawJobs.forEach(job => {
      // Get the job's timestamp
      if (!job.generalData?.timestamp) return; // Skip jobs without a timestamp
      
      const timestamp = job.generalData.timestamp.toDate();
      
      // Check if the job is within our date range
      const jobDate = formatDate(timestamp);
      if (!stats[jobDate]) return; // Skip if outside range
      
      // Get the score
      const score = job.match?.final_score || 0;
      
      // Increment counters
      stats[jobDate].total++;
      if (score >= 50) {
        stats[jobDate].highScore++;
      } else {
        stats[jobDate].lowScore++;
      }
    });
    
    // Convert to array format for chart libraries
    const chartData = Object.keys(stats).map(date => ({
      date,
      total: stats[date].total,
      lowScore: stats[date].lowScore,
      highScore: stats[date].highScore
    }));
    
    // Sort by date
    return chartData.sort((a, b) => a.date.localeCompare(b.date));
  }
);

function createJobStatsStore() {
  let unsubscribe = null;
  
  return {
    subscribe: jobStatsByDay.subscribe,
    
    // Additional stores to expose
    loading: { subscribe: isLoading.subscribe },
    error: { subscribe: error.subscribe },
    dateRange: {
      subscribe: dateRange.subscribe,
      set: dateRange.set,
      update: dateRange.update
    },
    debug: { subscribe: debug.subscribe },
    
    // Initialize the store with user data
    init: (userId) => {
      isLoading.set(true);
      error.set(null);
      
      console.log('🔍 JobStatsStore: Initializing for user', userId);
      
      if (!userId) {
        error.set('No user ID provided');
        isLoading.set(false);
        return;
      }
      
      try {
        // Create a reference to the user's jobs collection
        const jobsRef = collection(db, 'users', userId, 'scrapedJobs');
        
        // Set up real-time listener
        unsubscribe = onSnapshot(
          jobsRef,
          (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            console.log(`📊 JobStatsStore: Loaded ${jobs.length} jobs`);
            rawJobs.set(jobs);
            isLoading.set(false);
            
            // Update debug info
            debug.update(d => ({
              ...d,
              jobsLoaded: jobs.length,
              lastUpdated: new Date(),
              initialized: true
            }));
          },
          (err) => {
            console.error('❌ JobStatsStore Error:', err);
            error.set(err.message);
            isLoading.set(false);
          }
        );
      } catch (err) {
        console.error('💥 JobStatsStore Setup Error:', err);
        error.set(err.message);
        isLoading.set(false);
      }
    },
    
    // Set date range for filtering
    setDateRange: (start, end) => {
      dateRange.set({
        startDate: start,
        endDate: end
      });
      console.log('📅 JobStatsStore: Date range updated', { start, end });
    },
    
    // Clean up listeners
    cleanup: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      rawJobs.set([]);
      isLoading.set(true);
      error.set(null);
      debug.set({
        jobsLoaded: 0,
        lastUpdated: null,
        initialized: false
      });
      console.log('🧹 JobStatsStore: Cleaned up');
    }
  };
}

// Create and export the store
export const jobStatsStore = createJobStatsStore();