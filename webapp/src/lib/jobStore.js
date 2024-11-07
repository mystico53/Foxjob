// jobStore.js
import { writable, derived } from 'svelte/store';
import { db } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

// Create the main stores
const jobs = writable([]);
const loading = writable(true);
const error = writable(null);
const sortConfig = writable({
    column: 'Score.totalScore',
    direction: 'desc'
});
const searchText = writable('');

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
        // Then sort the filtered results
        return [...filteredJobs].sort((a, b) => {
            if ($sortConfig.column === 'Score.totalScore') {
                const scoreA = a.Score?.totalScore || 0;
                const scoreB = b.Score?.totalScore || 0;
                return scoreB - scoreA; // Higher scores first
            }
        
            // Default sort by date (timestamp)
            const aDate = a.generalData?.timestamp?.toDate?.() || new Date(0);
            const bDate = b.generalData?.timestamp?.toDate?.() || new Date(0);
            return bDate - aDate; // Newer dates first
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
                        // In your jobStore.js, update the job mapping section:
                    const jobPromises = jobsSnapshot.docs.map(async (jobDoc) => {
                        const jobDataRaw = jobDoc.data();
                        console.log("Raw job data:", jobDataRaw);
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

                        // Return the complete job object with SkillAssessment exactly as it is in Firestore
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
        }
    };
}

export const jobStore = createJobStore();
export { sortedJobs, loading, error, sortConfig, searchText };