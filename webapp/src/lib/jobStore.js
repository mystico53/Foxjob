

import { writable, derived } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';

// Create the main stores
const jobs = writable([]);
const loading = writable(true);
const error = writable(null);
const sortConfig = writable({
    column: 'Score.totalScore',
    direction: 'desc'
});

// Derived store for sorted jobs
const sortedJobs = derived(
    [jobs, sortConfig],
    ([$jobs, $sortConfig]) => {
        return [...$jobs].sort((a, b) => {
            let aValue = $sortConfig.column.split('.').reduce((obj, key) => obj && obj[key], a);
            let bValue = $sortConfig.column.split('.').reduce((obj, key) => obj && obj[key], b);

            if ($sortConfig.column === 'generalData.timestamp') {
                aValue = a.generalData?.timestamp?.toDate?.() || new Date(0);
                bValue = b.generalData?.timestamp?.toDate?.() || new Date(0);
            }

            if (aValue < bValue) return $sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return $sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
);

// Store actions
function createJobStore() {
    let unsubscribeJobs = null;

    const { subscribe, set, update } = jobs;

    return {
        subscribe,
        
        // Initialize job listener
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
                                matchResult: matchResult
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

        // Update job status
        updateStatus: async (userId, jobId, newStatus) => {
            try {
                const jobRef = doc(db, 'users', userId, 'jobs', jobId);
                await updateDoc(jobRef, { 'generalData.status': newStatus });
            } catch (err) {
                error.set('Failed to update job status');
                throw err;
            }
        },

        // Hide job
        hideJob: async (userId, jobId) => {
            try {
                const jobRef = doc(db, 'users', userId, 'jobs', jobId);
                await updateDoc(jobRef, { 'generalData.hidden': true });
            } catch (err) {
                error.set('Failed to hide job');
                throw err;
            }
        },

        // Clean up
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

export const jobStore = createJobStore(); // Removed the extra dot

export {sortedJobs, loading, error, sortConfig };