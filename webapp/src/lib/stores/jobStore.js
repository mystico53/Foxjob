import { writable, derived } from 'svelte/store';
import { db } from '$lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Create the main stores
const jobs = writable([]);
const loading = writable(true);
const error = writable(null);
const sortConfig = writable({
    column: 'AccumulatedScores.accumulatedScore', // Changed default sort from timestamp to status
    direction: 'desc'
});
const searchText = writable('');

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Derived store for sorted and filtered jobs
const sortedJobs = derived(
    [jobs, sortConfig, searchText],
    ([$jobs, $sortConfig, $searchText]) => {
        let filteredJobs = $jobs;
        
        // Search filtering
        if ($searchText) {
            const searchLower = $searchText.toLowerCase();
            filteredJobs = $jobs.filter(job => {
                return (
                    (job?.companyInfo?.name || '').toLowerCase().includes(searchLower) ||
                    (job?.jobInfo?.jobTitle || '').toLowerCase().includes(searchLower) ||
                    (job?.jobInfo?.description || '').toLowerCase().includes(searchLower)
                );
            });
        }

        // Sorting
        return [...filteredJobs].sort((a, b) => {
            // Skip timestamp sorting entirely
            if ($sortConfig.column === 'generalData.timestamp') {
                // Return 0 to maintain original order when sorting by timestamp
                return 0;
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

function createJobStore() {
    let unsubscribeJobs = null;

    const { subscribe, set, update } = jobs;

    return {
        subscribe,
        init: async (userId) => {
            loading.set(true);
            error.set(null);
            
            try {
                const jobsRef = collection(db, 'users', userId, 'scrapedJobs');
                
                unsubscribeJobs = onSnapshot(
                    jobsRef,
                    async (jobsSnapshot) => {
                        const jobPromises = jobsSnapshot.docs.map(async (jobDoc) => {
                            const jobDataRaw = jobDoc.data() || {};
                            
                            // Create the job object without timestamp
                            return {
                                id: jobDoc.id,
                                companyInfo: {
                                    name: jobDataRaw.basicInfo?.company || 'Not found',
                                    logoUrl: jobDataRaw.basicInfo?.companyLogo || '',
                                    companyUrl: jobDataRaw.basicInfo?.companyUrl || ''
                                },
                                jobInfo: {
                                    jobTitle: jobDataRaw.title || jobDataRaw.basicInfo?.title || 'Not found',
                                    description: jobDataRaw.details?.description || 'Not found',
                                    descriptionHtml: jobDataRaw.details?.description || null, // Add this line to store HTML version
                                    summary: jobDataRaw.details?.summary || null, // Store summary if available  
                                    location: jobDataRaw.basicInfo?.location || 'Not found',
                                    applyUrl: jobDataRaw.basicInfo?.applyLink || '',
                                    postedDate: jobDataRaw.details?.postedDate || null,
                                    postedTimeAgo: jobDataRaw.details?.postedTimeAgo || null
                                },
                                generalData: {
                                    status: jobDataRaw.processing?.status || 'Not processed',
                                    processingStatus: jobDataRaw.processing?.status || 'unknown',
                                    hidden: false
                                    // Removed timestamp completely
                                },
                                Score: {
                                    totalScore: jobDataRaw.match?.finalScore || 0,
                                    summary: jobDataRaw.match?.summary || 'No summary available'
                                },
                                matchResult: {
                                    keySkills: jobDataRaw.match?.evaluators ? 
                                        Object.values(jobDataRaw.match.evaluators).map((evaluator, index) => ({
                                            skill: `Skill ${index + 1}`,
                                            score: evaluator.score || 0,
                                            assessment: evaluator.reasoning || 'No assessment'
                                        })) : [],
                                    totalScore: jobDataRaw.match?.finalScore || 0,
                                    summary: jobDataRaw.match?.summary || 'No summary available'
                                },
                                SkillAssessment: {
                                    DomainExpertise: {},
                                    Hardskills: {},
                                    Softskills: {}
                                },
                                verdict: null,
                                AccumulatedScores: {
                                    accumulatedScore: jobDataRaw.match?.finalScore || 0
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
            } catch (err) {
                console.error('Error setting up job listener:', err);
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
            set([]);
            loading.set(true);
            error.set(null);
        }
    };
}

// Create and export the job store
export const jobStore = createJobStore();
export { sortedJobs, loading, error, sortConfig, searchText };