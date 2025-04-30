// $lib/stores/jobStatsStore.js
import { writable, derived } from 'svelte/store';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '$lib/firebase';

// Helper function to format dates consistently
function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Create the main stores
const rawJobs = writable([]);
const isLoading = writable(true);
const error = writable(null);

// Get today's date and calculate relative dates
const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

const dateRange = writable({
  startDate: thirtyDaysAgo, // Last 30 days
  endDate: today            // Today
});

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
        date: dateKey,
        total: 0,
        topMatch: 0,  // Score >= 85
        goodMatch: 0, // Score >= 65 and < 85
        okMatch: 0,   // Score >= 50 and < 65
        poorMatch: 0  // Score < 50
      };
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      currentDate = newDate;
    }
    
    // Process each job
    $rawJobs.forEach(job => {
      // Skip jobs without a timestamp
      if (!job.match?.timestamp) return;
      
      // Convert Firestore timestamp to Date
      let timestamp;
      try {
        if (typeof job.match.timestamp.toDate === 'function') {
          timestamp = job.match.timestamp.toDate();
        } else if (typeof job.match.timestamp === 'string') {
          timestamp = new Date(job.match.timestamp);
        } else {
          return; // Skip if timestamp format is unexpected
        }
      } catch (e) {
        console.error('Error converting timestamp:', e);
        return; // Skip if timestamp conversion fails
      }
      
      // Handle future timestamps by using today instead
      if (timestamp > today) timestamp = new Date();
      
      // Check if the job is within our date range
      const jobDate = formatDate(timestamp);
      if (!stats[jobDate]) return; // Skip if outside range
      
      // Get the score
      const score = job.match?.final_score || 0;
      
      // Increment counters
      stats[jobDate].total++;
      
      // Categorize score
      if (score >= 85) {
        stats[jobDate].topMatch++;
      } else if (score >= 65) {
        stats[jobDate].goodMatch++;
      } else if (score >= 50) {
        stats[jobDate].okMatch++;
      } else {
        stats[jobDate].poorMatch++;
      }
    });
    
    // Convert to array format for chart libraries
    const chartData = Object.keys(stats).map(date => ({
      date,
      ...stats[date]
    }));
    
    // Sort by date
    return chartData.sort((a, b) => a.date.localeCompare(b.date));
  }
);

// Derived store for past 5 days stats
const lastFiveDaysStats = derived(
  jobStatsByDay,
  ($jobStatsByDay) => {
    // Get dates for the past 5 days
    const todayDate = new Date();
    const past5Days = Array(5).fill().map((_, i) => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      return formatDate(d);
    });
    
    // Find stats for each of these days
    return past5Days.map(dateStr => {
      // Find the matching stats or use default values
      const dayStats = $jobStatsByDay.find(item => item.date === dateStr) || {
        date: dateStr,
        total: 0,
        topMatch: 0,
        goodMatch: 0,
        okMatch: 0,
        poorMatch: 0
      };
      
      // Add a readable label
      let label;
      const todayStr = formatDate(todayDate);
      
      if (dateStr === todayStr) {
        label = 'Today';
      } else {
        // Create new date objects for comparison to avoid modifying original dates
        const dateObj = new Date(dateStr);
        const todayObj = new Date(todayStr);
        
        // Calculate days difference
        const diffTime = todayObj.getTime() - dateObj.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          label = 'Yesterday';
        } else {
          label = `${diffDays} days ago`;
        }
      }
      
      return {
        ...dayStats,
        label
      };
    });
  }
);

// Create and export the store
export const jobStatsStore = {
  subscribe: jobStatsByDay.subscribe,
  recentDays: { subscribe: lastFiveDaysStats.subscribe },
  loading: { subscribe: isLoading.subscribe },
  error: { subscribe: error.subscribe },
  debug: writable({
    jobsLoaded: 0,
    lastUpdated: null,
    initialized: false
  }),
  
  // Initialize the store
  init: (userId) => {
    if (!userId) return;
    
    isLoading.set(true);
    
    try {
      const jobsRef = collection(db, 'users', userId, 'scrapedJobs');
      
      return onSnapshot(
        jobsRef,
        (snapshot) => {
          const jobs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          rawJobs.set(jobs);
          isLoading.set(false);
          
          // Update debug info
          jobStatsStore.debug.update(d => ({
            jobsLoaded: jobs.length,
            lastUpdated: new Date(),
            initialized: true
          }));
        },
        (err) => {
          console.error('JobStatsStore Error:', err);
          error.set(err.message);
          isLoading.set(false);
        }
      );
    } catch (err) {
      error.set(err.message);
      isLoading.set(false);
      return () => {};
    }
  },
  
  // Set date range for filtering
  setDateRange: (start, end) => {
    dateRange.set({ startDate: start, endDate: end });
  },
  
  // Clean up listeners
  cleanup: () => {
    rawJobs.set([]);
    isLoading.set(true);
    error.set(null);
    jobStatsStore.debug.set({
      jobsLoaded: 0,
      lastUpdated: null,
      initialized: false
    });
  }
};