// src/lib/stores/jobStore.js
import { writable, derived } from 'svelte/store';
import { db } from '$lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

// Create the main stores
const jobs = writable([]);
const loading = writable(true);
const error = writable(null);
const sortConfig = writable({
    column: 'AccumulatedScores.accumulatedScore',
    direction: 'desc'
});
const searchText = writable('');

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Add new derived store for processing jobs
const processingJobs = derived(
    jobs,
    $jobs => $jobs.filter(job => {
        const status = job.generalData?.processingStatus;
        return status === 'processing' || status === 'cancelled' || status === 'error';
    })
);

// Derived store for sorted and filtered jobs
const sortedJobs = derived(
    [jobs, sortConfig, searchText],
    ([$jobs, $sortConfig, $searchText]) => {
        // First filter by search text
        let filteredJobs = $jobs;
        if ($searchText) {
            const searchLower = $searchText.toLowerCase();
            filteredJobs = $jobs.filter(job => {
                return (
                    job.companyInfo?.name?.toLowerCase().includes(searchLower) ||
                    job.jobInfo?.jobTitle?.toLowerCase().includes(searchLower) ||
                    job.jobInfo?.description?.toLowerCase().includes(searchLower)
                );
            });
        }

        // Then sort the filtered results
        return [...filteredJobs].sort((a, b) => {
            const aValue = getNestedValue(a, $sortConfig.column);
            const bValue = getNestedValue(b, $sortConfig.column);

            // Handle special cases first
            if ($sortConfig.column === 'generalData.timestamp') {
                const aDate = aValue?.toDate?.() || new Date(0);
                const bDate = bValue?.toDate?.() || new Date(0);
                return $sortConfig.direction === 'desc' ? bDate - aDate : aDate - bDate;
            }

            if ($sortConfig.column === 'AccumulatedScores.accumulatedScore') {
                const scoreA = aValue || 0;
                const scoreB = bValue || 0;
                return $sortConfig.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
            }

            // Handle string comparisons (for status and company name)
            const valA = (aValue || '').toLowerCase();
            const valB = (bValue || '').toLowerCase();
            
            if ($sortConfig.direction === 'asc') {
                return valA.localeCompare(valB);
            } else {
                return valB.localeCompare(valA);
            }
        });
    }
);

// Store actions
function createJobStore() {
    let unsubscribeJobs = null;

    const { subscribe, set, update } = jobs;

    return {
        subscribe,
        init: async (userId) => {
            loading.set(true);
            error.set(null);
            
            try {
                const jobsRef = collection(db, 'users', userId, 'jobs');
                const jobsQuery = query(jobsRef, where('generalData.hidden', '==', false));

                unsubscribeJobs = onSnapshot(
                    jobsQuery,
                    async (jobsSnapshot) => {
                        const jobPromises = jobsSnapshot.docs.map(async (jobDoc) => {
                            const jobDataRaw = jobDoc.data();
                            console.log("Raw job data:", jobDataRaw);
                            
                            // Return early for any processing-related status
                            if (jobDataRaw.generalData?.processingStatus) {
                                return {
                                    id: jobDoc.id,
                                    generalData: {
                                        ...jobDataRaw.generalData,
                                        status: jobDataRaw.generalData?.status || '',
                                        url: jobDataRaw.generalData?.url || '',
                                        timestamp: jobDataRaw.generalData?.timestamp,
                                        processingStatus: jobDataRaw.generalData?.processingStatus
                                    }
                                };
                            }
                            
                            const summarizedData = jobDataRaw.summarized;
                            const scoreData = jobDataRaw.Score;

                            if (!summarizedData || !scoreData) return null;

                            const matchResult = {
                                keySkills: [],
                                totalScore: scoreData.totalScore || 0,
                                summary: scoreData.summary || ''
                            };

                            Object.keys(scoreData).forEach((key) => {
                                if (key.startsWith('Requirement')) {
                                    const req = scoreData[key];
                                    matchResult.keySkills.push({
                                        skill: req.requirement,
                                        score: req.score,
                                        assessment: req.assessment
                                    });
                                }
                            });

                            return {
                                id: jobDoc.id,
                                ...summarizedData,
                                generalData: {
                                    ...jobDataRaw.generalData,
                                    status: jobDataRaw.generalData?.status || ''
                                },
                                Score: scoreData,
                                matchResult: matchResult,
                                SkillAssessment: {
                                    DomainExpertise: jobDataRaw.SkillAssessment?.DomainExpertise || {},
                                    Hardskills: jobDataRaw.SkillAssessment?.Hardskills || {},
                                    Softskills: jobDataRaw.SkillAssessment?.Softskills || {}
                                },
                                verdict: jobDataRaw.verdict || null,
                                AccumulatedScores: jobDataRaw.AccumulatedScores || {
                                    accumulatedScore: 0,
                                    domainScore: 0,
                                    hardSkillScore: 0,
                                    requirementScore: 0,
                                    verdictScore: 0
                                }
                            }; 
                        });

                        const jobResults = await Promise.all(jobPromises);
                        set(jobResults.filter(job => job !== null));
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
                const jobRef = doc(db, 'users', userId, 'jobs', jobId);
                await updateDoc(jobRef, { 'generalData.status': newStatus });
            } catch (err) {
                error.set('Failed to update job status');
                throw err;
            }
        },

        hideJob: async (userId, jobId) => {
            try {
                const jobRef = doc(db, 'users', userId, 'jobs', jobId);
                await updateDoc(jobRef, { 'generalData.hidden': true });
            } catch (err) {
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
        },

        updateProcessingStatus: async (userId, jobId, newStatus) => {
            try {
                const jobRef = doc(db, 'users', userId, 'jobs', jobId);
                await updateDoc(jobRef, { 
                    'generalData.processingStatus': newStatus 
                });
            } catch (err) {
                error.set('Failed to update processing status');
                throw err;
            }
        },

        cancelProcessing: async (userId, jobId) => {
            try {
                await updateProcessingStatus(userId, jobId, 'cancelled');
            } catch (err) {
                error.set('Failed to cancel processing');
                throw err;
            }
        },

        retryProcessing: async (userId, jobId) => {
            try {
                await updateProcessingStatus(userId, jobId, 'processing');
            } catch (err) {
                error.set('Failed to retry processing');
                throw err;
            }
        }
    };
}

export const jobStore = createJobStore();
export { sortedJobs, processingJobs, loading, error, sortConfig, searchText };