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

// Derived store for sorted and filtered jobs
const sortedJobs = derived(
    [jobs, sortConfig, searchText],
    ([$jobs, $sortConfig, $searchText]) => {
        let filteredJobs = $jobs;
        if ($searchText) {
            const searchLower = $searchText.toLowerCase();
            filteredJobs = $jobs.filter(job => {
                return (
                    job?.companyInfo?.name?.toLowerCase()?.includes(searchLower) ||
                    job?.jobInfo?.jobTitle?.toLowerCase()?.includes(searchLower) ||
                    job?.jobInfo?.description?.toLowerCase()?.includes(searchLower)
                );
            });
        }

        return [...filteredJobs].sort((a, b) => {
            const aValue = getNestedValue(a, $sortConfig.column);
            const bValue = getNestedValue(b, $sortConfig.column);

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

            const valA = (aValue || '').toLowerCase();
            const valB = (bValue || '').toLowerCase();
            
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
                const jobsRef = collection(db, 'users', userId, 'jobs');
                const jobsQuery = query(jobsRef, where('generalData.hidden', '==', false));

                unsubscribeJobs = onSnapshot(
                    jobsQuery,
                    async (jobsSnapshot) => {
                        const jobPromises = jobsSnapshot.docs.map(async (jobDoc) => {
                            const jobDataRaw = jobDoc.data() || {};

                            // Create the job object with all fields optional
                            return {
                                id: jobDoc.id,
                                ...jobDataRaw.summarized,
                                generalData: {
                                    ...jobDataRaw.generalData,
                                    status: jobDataRaw.generalData?.status,
                                    processingStatus: jobDataRaw.generalData?.processingStatus,
                                    hidden: jobDataRaw.generalData?.hidden,
                                    timestamp: jobDataRaw.generalData?.timestamp
                                },
                                Score: jobDataRaw.Score || {},
                                matchResult: {
                                    keySkills: jobDataRaw.Score ? 
                                        Object.keys(jobDataRaw.Score)
                                            .filter(key => key.startsWith('Requirement'))
                                            .map(key => ({
                                                skill: jobDataRaw.Score[key]?.requirement,
                                                score: jobDataRaw.Score[key]?.score,
                                                assessment: jobDataRaw.Score[key]?.assessment
                                            })) : [],
                                    totalScore: jobDataRaw.Score?.totalScore,
                                    summary: jobDataRaw.Score?.summary
                                },
                                SkillAssessment: {
                                    DomainExpertise: jobDataRaw.SkillAssessment?.DomainExpertise || {},
                                    Hardskills: jobDataRaw.SkillAssessment?.Hardskills || {},
                                    Softskills: jobDataRaw.SkillAssessment?.Softskills || {}
                                },
                                verdict: jobDataRaw.verdict,
                                AccumulatedScores: jobDataRaw.AccumulatedScores || {}
                            };
                        });

                        const jobResults = await Promise.all(jobPromises);
                        // Remove the filter that was excluding null jobs
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