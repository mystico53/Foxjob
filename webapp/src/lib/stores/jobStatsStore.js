// $lib/stores/jobStatsStore.js
import { writable, derived } from 'svelte/store';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '$lib/firebase';

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

// Helper function for debugging date ranges
function getDateRangeInfo(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  const today = formatDate(new Date());
  
  const daysBetween = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  return {
    startDate: start,
    endDate: end,
    today,
    daysBetween,
    includesCurrentDate: start <= today && today <= end
  };
}

// Derived store for daily job statistics
const jobStatsByDay = derived(
  [rawJobs, dateRange],
  ([$rawJobs, $dateRange]) => {
    const rangeInfo = getDateRangeInfo($dateRange.startDate, $dateRange.endDate);
    console.log('Date range for job stats:', rangeInfo);
    
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
      // Focus on match.timestamp 
      if (!job.match?.timestamp) {
        console.log('No match.timestamp found for job:', job.id);
        return; // Skip jobs without a timestamp
      }
      
      // Convert Firestore timestamp to Date
      let timestamp;
      if (typeof job.match.timestamp.toDate === 'function') {
        timestamp = job.match.timestamp.toDate();
      } else if (typeof job.match.timestamp === 'string') {
        timestamp = new Date(job.match.timestamp);
      } else {
        console.log('Unrecognized timestamp format for job:', job.id);
        return; // Skip if the timestamp is in an unexpected format
      }
      
      // Check if timestamp is in the future (could be from a test environment or different timezone)
      const now = new Date();
      if (timestamp > now) {
        console.log(`Job ${job.id} has future timestamp (${timestamp}), adjusting to today for display purposes`);
        // For display purposes, we'll use today's date
        timestamp = now;
      }
      
      // Check if the job is within our date range
      const jobDate = formatDate(timestamp);
      if (!stats[jobDate]) return; // Skip if outside range
      
      // Get the score - specifically from match.final_score as shown in the screenshot
      const score = job.match?.final_score || 0;
      
      // Add some debug logging
      console.log(`Job ${job.id}: date=${jobDate}, score=${score}`);
      
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
            
            // Debug: Log the first job to see its structure
            if (jobs.length > 0) {
              console.log('Sample job structure:', JSON.stringify(jobs[0], null, 2));
            }
            
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
    
    // Debug helper to look through all jobs
    debugAllJobs: () => {
      let jobs = [];
      let currentDateRange = { startDate: new Date(), endDate: new Date() };
      
      rawJobs.subscribe(data => {
        jobs = data;
      })();
      
      dateRange.subscribe(range => {
        currentDateRange = range;
      })();
      
      const rangeInfo = getDateRangeInfo(currentDateRange.startDate, currentDateRange.endDate);
      
      console.log(`Analyzing ${jobs.length} jobs for timestamp and score data:`);
      console.log('Current date range:', rangeInfo);
      
      const analysisResults = {
        hasTimestamp: 0,
        hasFinalScore: 0,
        timestampPaths: {},
        scorePaths: {},
        datesDistribution: {},
        scoresDistribution: {
          '0-10': 0,
          '11-25': 0,
          '26-50': 0,
          '51-75': 0,
          '76-90': 0,
          '91-100': 0
        }
      };
      
      jobs.forEach((job, index) => {
        // Check for timestamps
        let foundTimestamp = false;
        let jobDate = null;
        
        if (job.match?.timestamp) {
          foundTimestamp = true;
          analysisResults.timestampPaths['match.timestamp'] = 
            (analysisResults.timestampPaths['match.timestamp'] || 0) + 1;
            
          // Get the actual date
          try {
            let timestamp;
            if (typeof job.match.timestamp.toDate === 'function') {
              timestamp = job.match.timestamp.toDate();
            } else if (typeof job.match.timestamp === 'string') {
              timestamp = new Date(job.match.timestamp);
            }
            
            if (timestamp) {
              jobDate = formatDate(timestamp);
              // Track date distribution
              analysisResults.datesDistribution[jobDate] = 
                (analysisResults.datesDistribution[jobDate] || 0) + 1;
            }
          } catch (e) {
            console.error('Error processing date for job', job.id, e);
          }
        }
        
        if (job.generalData?.timestamp) {
          foundTimestamp = true;
          analysisResults.timestampPaths['generalData.timestamp'] = 
            (analysisResults.timestampPaths['generalData.timestamp'] || 0) + 1;
        }
        
        if (job.searchMetadata?.processingDate) {
          foundTimestamp = true;
          analysisResults.timestampPaths['searchMetadata.processingDate'] = 
            (analysisResults.timestampPaths['searchMetadata.processingDate'] || 0) + 1;
        }
        
        if (foundTimestamp) {
          analysisResults.hasTimestamp++;
        }
        
        // Check for scores
        let foundScore = false;
        let scoreValue = null;
        
        if (typeof job.match?.final_score === 'number') {
          foundScore = true;
          scoreValue = job.match.final_score;
          analysisResults.scorePaths['match.final_score'] = 
            (analysisResults.scorePaths['match.final_score'] || 0) + 1;
            
          // Track score distribution
          if (scoreValue <= 10) analysisResults.scoresDistribution['0-10']++;
          else if (scoreValue <= 25) analysisResults.scoresDistribution['11-25']++;
          else if (scoreValue <= 50) analysisResults.scoresDistribution['26-50']++;
          else if (scoreValue <= 75) analysisResults.scoresDistribution['51-75']++;
          else if (scoreValue <= 90) analysisResults.scoresDistribution['76-90']++;
          else analysisResults.scoresDistribution['91-100']++;
        }
        
        if (typeof job.Score?.totalScore === 'number') {
          foundScore = true;
          analysisResults.scorePaths['Score.totalScore'] = 
            (analysisResults.scorePaths['Score.totalScore'] || 0) + 1;
        }
        
        if (typeof job.AccumulatedScores?.accumulatedScore === 'number') {
          foundScore = true;
          analysisResults.scorePaths['AccumulatedScores.accumulatedScore'] = 
            (analysisResults.scorePaths['AccumulatedScores.accumulatedScore'] || 0) + 1;
        }
        
        if (foundScore) {
          analysisResults.hasFinalScore++;
        }
        
        // Log a few sample jobs
        if (index < 3) {
          console.log(`Sample job ${index}:`, {
            id: job.id,
            hasTimestamp: foundTimestamp,
            hasScore: foundScore,
            timestamps: {
              match: job.match?.timestamp,
              generalData: job.generalData?.timestamp,
              searchMetadata: job.searchMetadata?.processingDate
            },
            scores: {
              matchFinalScore: job.match?.final_score,
              scoreTotalScore: job.Score?.totalScore,
              accumulatedScore: job.AccumulatedScores?.accumulatedScore
            }
          });
        }
      });
      
      // Add summary information
      analysisResults.summary = {
        totalJobs: jobs.length,
        jobsWithTimestamp: analysisResults.hasTimestamp,
        jobsWithScore: analysisResults.hasFinalScore,
        dateRange: rangeInfo,
        mostCommonDate: Object.entries(analysisResults.datesDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 1)
          .map(([date, count]) => ({ date, count }))
          .shift()
      };
      
      console.log('Analysis results:', analysisResults);
      return analysisResults;
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