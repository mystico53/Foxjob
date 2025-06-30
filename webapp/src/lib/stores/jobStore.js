import { writable, derived } from 'svelte/store';
import { db } from '$lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';

// Create the main stores
const jobs = writable([]);
const loading = writable(true);
const error = writable(null);
const sortConfig = writable({
    column: 'AccumulatedScores.accumulatedScore', // Changed default sort from timestamp to status
    direction: 'desc'
});
const searchText = writable('');
const batchFilter = writable('recent'); // 'recent' (default), 'seven', 'all'

// Store for batches
const batches = writable([]);

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper function to check if a date is today
const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

// Helper function to check if a date is within the last week
const isWithinLastWeek = (date) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
};

// Helper function to get job date
const getJobDate = (job) => {
    const dateValue = job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp;
    if (!dateValue) return new Date(0);
    
    if (typeof dateValue === 'string') {
        return new Date(dateValue);
    } else if (dateValue && dateValue.toDate) {
        return dateValue.toDate();
    }
    return new Date(0);
};

// Helper function to get batch info and timestamp
const getBatchInfo = (job, $batches) => {
    // Find which batch this job belongs to by checking completedJobIds
    const batch = $batches.find(b => b.completedJobIds?.includes(job.id));
    return {
        batchId: batch?.id || null,
        timestamp: batch?.completedAt || new Date(0)
    };
};

// Derived store for sorted and filtered jobs
const sortedJobs = derived(
    [jobs, sortConfig, searchText, batchFilter, batches],
    ([$jobs, $sortConfig, $searchText, $batchFilter, $batches]) => {
        let filteredJobs = $jobs;
        
        // Get all batches with their timestamps
        const sortedBatches = [...$batches].sort((a, b) => {
            const aTime = a.completedAt?.toDate?.() || new Date(0);
            const bTime = b.completedAt?.toDate?.() || new Date(0);
            return bTime - aTime;
        });

        // Apply batch filtering before other filters
        if ($batchFilter !== 'all' && sortedBatches.length > 0) {
            const batchesToShow = $batchFilter === 'recent' 
                ? [sortedBatches[0]] // Only most recent batch
                : sortedBatches.slice(0, 7); // Up to 7 most recent batches
            
            // Get all job IDs from selected batches
            const allowedJobIds = new Set(
                batchesToShow.flatMap(batch => batch.completedJobIds || [])
            );
            
            // Filter jobs that belong to selected batches
            filteredJobs = filteredJobs.filter(job => allowedJobIds.has(job.id));
        }

        // Search filtering
        if ($searchText) {
            const searchLower = $searchText.toLowerCase();
            filteredJobs = filteredJobs.filter(job => {
                return (
                    (job?.basicInfo?.company || '').toLowerCase().includes(searchLower) ||
                    (job?.basicInfo?.title || '').toLowerCase().includes(searchLower) ||
                    (job?.details?.description || '').toLowerCase().includes(searchLower)
                );
            });
        }

        // Bookmarked filter and sort
        if ($sortConfig.column === 'bookmarked') {
            // Only jobs with status 'bookmarked', sorted by accumulatedScore desc
            return [...filteredJobs]
                .filter(job => (job.generalData?.status || '').toLowerCase() === 'bookmarked')
                .sort((a, b) => {
                    const scoreA = a.AccumulatedScores?.accumulatedScore || 0;
                    const scoreB = b.AccumulatedScores?.accumulatedScore || 0;
                    return scoreB - scoreA;
                });
        }

        // Sorting
        return [...filteredJobs].sort((a, b) => {
            if ($sortConfig.column === 'generalData.timestamp') {
                // Get posted dates from details
                const aDate = a.details?.postedDate || a.jobInfo?.postedDate || a.generalData?.timestamp;
                const bDate = b.details?.postedDate || b.jobInfo?.postedDate || b.generalData?.timestamp;
                
                // Convert string dates to Date objects for comparison
                let dateA, dateB;
                
                if (aDate && typeof aDate === 'string') {
                    dateA = new Date(aDate);
                } else if (aDate && aDate.toDate) {
                    dateA = aDate.toDate();
                } else {
                    dateA = new Date(0); // Default to epoch if no date
                }
                
                if (bDate && typeof bDate === 'string') {
                    dateB = new Date(bDate);
                } else if (bDate && bDate.toDate) {
                    dateB = bDate.toDate();
                } else {
                    dateB = new Date(0); // Default to epoch if no date
                }
                
                // Sort descending (newest first) for "Most recent"
                return $sortConfig.direction === 'desc' ? 
                    dateB.getTime() - dateA.getTime() : 
                    dateA.getTime() - dateB.getTime();
            }

            const aValue = getNestedValue(a, $sortConfig.column);
            const bValue = getNestedValue(b, $sortConfig.column);

            // Handle numeric sorting (scores)
            if ($sortConfig.column === 'AccumulatedScores.accumulatedScore') {
                const scoreA = typeof aValue === 'number' ? aValue : 0;
                const scoreB = typeof bValue === 'number' ? bValue : 0;
                return $sortConfig.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
            }

            // Handle string sorting (company name, status)
            const valA = (aValue || '').toString().toLowerCase();
            const valB = (bValue || '').toString().toLowerCase();
            
            // Handle empty values
            if (!valA && !valB) return 0;
            if (!valA) return $sortConfig.direction === 'asc' ? -1 : 1;
            if (!valB) return $sortConfig.direction === 'asc' ? 1 : -1;
            
            return $sortConfig.direction === 'asc' ? 
                valA.localeCompare(valB) : 
                valB.localeCompare(valA);
        });
    }
);

// Initialize batches listener when jobs are initialized
function createJobStore() {
    let unsubscribeJobs = null;
    let unsubscribeBatches = null;

    const { subscribe, set, update } = jobs;

    return {
        subscribe,
        init: async (userId) => {
            loading.set(true);
            error.set(null);
            
            try {
                // Setup jobs listener
                const jobsRef = collection(db, 'users', userId, 'scrapedJobs');
                unsubscribeJobs = onSnapshot(
                    jobsRef,
                    async (jobsSnapshot) => {
                        const jobPromises = jobsSnapshot.docs.map(async (jobDoc) => {
                            const jobDataRaw = jobDoc.data() || {};
                            
                            // Create the job object with added fields for details
                            return {
                                id: jobDoc.id,
                                companyInfo: {
                                    name: jobDataRaw.basicInfo?.company || 'Not found',
                                    logoUrl: jobDataRaw.basicInfo?.companyLogo || '',
                                    companyUrl: jobDataRaw.basicInfo?.companyUrl || ''
                                },
                                // Add basicInfo direct mapping for maximum compatibility
                                basicInfo: {
                                    ...jobDataRaw.basicInfo || {},  // Copy all fields from basicInfo
                                    url: jobDataRaw.basicInfo?.url || '' // Ensure URL is mapped
                                },
                                jobInfo: {
                                    jobTitle: jobDataRaw.title || jobDataRaw.basicInfo?.title || 'Not found',
                                    description: jobDataRaw.details?.description || 'Not found',
                                    descriptionHtml: jobDataRaw.details?.description || null,
                                    summary: jobDataRaw.details?.summary || null,
                                    location: jobDataRaw.basicInfo?.location || 'Not found',
                                    // Check multiple paths for the apply URL
                                    applyUrl: jobDataRaw.basicInfo?.applyLink || 
                                             jobDataRaw.basicInfo?.url || 
                                             jobDataRaw.url || 
                                             '',
                                    postedDate: jobDataRaw.details?.postedDate || null,
                                    postedTimeAgo: jobDataRaw.details?.postedTimeAgo || null
                                },
                                details: {
                                    // Map all details fields directly
                                    ...jobDataRaw.details || {},
                                    // Make sure URL is captured if it exists in a different field
                                    url: jobDataRaw.details?.url || jobDataRaw.url || null
                                },
                                generalData: {
                                    status: jobDataRaw.processing?.status || 'Not processed',
                                    processingStatus: jobDataRaw.processing?.status || 'unknown',
                                    hidden: false,
                                    // Add URL to generalData as well for maximum compatibility
                                    url: jobDataRaw.generalData?.url || jobDataRaw.url || null
                                },
                                salary: jobDataRaw.salary || undefined,
                                // Rest of your mappings remain the same
                                match: jobDataRaw.match || {},
                                Score: {
                                    totalScore: jobDataRaw.match?.final_score || 0,
                                    summary: typeof jobDataRaw.match?.summary === 'string' 
                                        ? jobDataRaw.match.summary 
                                        : 'No summary available'
                                },
                                matchResult: {
                                    keySkills: jobDataRaw.match?.evaluators ? 
                                        Object.values(jobDataRaw.match.evaluators).map((evaluator, index) => ({
                                            skill: `Skill ${index + 1}`,
                                            score: evaluator.score || 0,
                                            assessment: evaluator.reasoning || 'No assessment'
                                        })) : [],
                                    totalScore: jobDataRaw.match?.final_score || 0,
                                    summary: typeof jobDataRaw.match?.summary === 'string'
                                        ? jobDataRaw.match.summary
                                        : (jobDataRaw.match?.summary?.short_description || 'No summary available')
                                },
                                SkillAssessment: {
                                    DomainExpertise: {},
                                    Hardskills: {},
                                    Softskills: {}
                                },
                                verdict: null,
                                AccumulatedScores: {
                                    accumulatedScore: jobDataRaw.match?.final_score || 0
                                }
                            };
                        });

                        const jobResults = await Promise.all(jobPromises);
                        set(jobResults);
                        loading.set(false);
                    },
                    (err) => {
                        console.error('Error listening to jobs:', err);
                        error.set('Failed to load jobs. Please try again later.');
                        loading.set(false);
                    }
                );

                // Setup batches listener
                const batchesRef = collection(db, 'jobBatches');
                const batchesQuery = query(
                    batchesRef,
                    where('userId', '==', userId),
                    orderBy('completedAt', 'desc')
                );

                unsubscribeBatches = onSnapshot(
                    batchesQuery,
                    (snapshot) => {
                        const batchResults = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        batches.set(batchResults);
                    },
                    (err) => {
                        console.error('Error listening to batches:', err);
                    }
                );

            } catch (err) {
                console.error('Error setting up listeners:', err);
                error.set('Failed to initialize jobs. Please try again later.');
                loading.set(false);
            }
        },

        updateStatus: async (userId, jobId, newStatus) => {
            try {
                const jobRef = doc(db, 'users', userId, 'scrapedJobs', jobId);
                await updateDoc(jobRef, { 'processing.status': newStatus });
            } catch (err) {
                console.error('Error updating job status:', err);
                error.set('Failed to update job status');
                throw err;
            }
        },

        hideJob: async (userId, jobId) => {
            try {
                const jobRef = doc(db, 'users', userId, 'scrapedJobs', jobId);
                // Import deleteDoc at the top of the file
                await deleteDoc(jobRef); 
                return true; // Return success
            } catch (err) {
                console.error('Error hiding job:', err);
                error.set('Failed to hide job');
                throw err;
            }
        },

        cleanup: () => {
            if (unsubscribeJobs) {
                unsubscribeJobs();
                unsubscribeJobs = null;
            }
            if (unsubscribeBatches) {
                unsubscribeBatches();
                unsubscribeBatches = null;
            }
            set([]);
            batches.set([]);
        }
    };
}

// Create and export the job store
export const jobStore = createJobStore();
export { sortedJobs, loading, error, sortConfig, searchText, batchFilter as timeFilter };