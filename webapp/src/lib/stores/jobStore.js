import { writable, derived } from 'svelte/store';
import { db } from '$lib/firebase';
import {
	collection,
	query,
	where,
	onSnapshot,
	doc,
	updateDoc,
	deleteDoc,
	orderBy,
	getDocs,
	limit
} from 'firebase/firestore';

// Create the main stores
const jobs = writable([]);
const loading = writable(true);
const error = writable(null);
const sortConfig = writable({
	column: 'AccumulatedScores.accumulatedScore',
	direction: 'desc'
});
const searchText = writable('');
const timeFilter = writable('recent');

// Store for batches
const batches = writable([]);

const getNestedValue = (obj, path) => {
	return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper function to check if a date is today
const isToday = (date) => {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
};

// Helper function to check if a date is within the last week
const isWithinLastWeek = (date) => {
	const weekAgo = new Date();
	weekAgo.setDate(weekAgo.getDate() - 7);
	return date >= weekAgo;
};

// Helper function to get job date
const getJobDate = (job) => {
	const dateValue =
		job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp;
	if (!dateValue) return new Date(0);

	if (typeof dateValue === 'string') {
		return new Date(dateValue);
	} else if (dateValue && dateValue.toDate) {
		return dateValue.toDate();
	}
	return new Date(0);
};

// Helper function to process job data
const processJobData = (jobDoc) => {
	const jobDataRaw = jobDoc.data() || {};

	return {
		id: jobDoc.id,
		companyInfo: {
			name: jobDataRaw.basicInfo?.company || 'Not found',
			logoUrl: jobDataRaw.basicInfo?.companyLogo || '',
			companyUrl: jobDataRaw.basicInfo?.companyUrl || ''
		},
		basicInfo: {
			...(jobDataRaw.basicInfo || {}),
			url: jobDataRaw.basicInfo?.url || ''
		},
		jobInfo: {
			jobTitle: jobDataRaw.title || jobDataRaw.basicInfo?.title || 'Not found',
			description: jobDataRaw.details?.description || 'Not found',
			descriptionHtml: jobDataRaw.details?.description || null,
			summary: jobDataRaw.details?.summary || null,
			location: jobDataRaw.basicInfo?.location || 'Not found',
			applyUrl:
				jobDataRaw.basicInfo?.applyLink || jobDataRaw.basicInfo?.url || jobDataRaw.url || '',
			postedDate: jobDataRaw.details?.postedDate || null,
			postedTimeAgo: jobDataRaw.details?.postedTimeAgo || null
		},
		details: {
			...(jobDataRaw.details || {}),
			url: jobDataRaw.details?.url || jobDataRaw.url || null
		},
		generalData: {
			status: jobDataRaw.processing?.status || 'Not processed',
			processingStatus: jobDataRaw.processing?.status || 'unknown',
			hidden: false,
			url: jobDataRaw.generalData?.url || jobDataRaw.url || null,
			timestamp:
				jobDataRaw.details?.postedDate ||
				jobDataRaw.jobInfo?.postedDate ||
				jobDataRaw.generalData?.timestamp
		},
		salary: jobDataRaw.salary || undefined,
		match: jobDataRaw.match || {},
		Score: {
			totalScore: jobDataRaw.match?.final_score || 0,
			summary:
				typeof jobDataRaw.match?.summary === 'string'
					? jobDataRaw.match.summary
					: 'No summary available'
		},
		AccumulatedScores: {
			accumulatedScore: jobDataRaw.match?.final_score || 0
		},
		matchResult: {
			keySkills: jobDataRaw.match?.evaluators
				? Object.values(jobDataRaw.match.evaluators).map((evaluator, index) => ({
						skill: `Skill ${index + 1}`,
						score: evaluator.score || 0,
						assessment: evaluator.reasoning || 'No assessment'
					}))
				: [],
			totalScore: jobDataRaw.match?.final_score || 0,
			summary:
				typeof jobDataRaw.match?.summary === 'string'
					? jobDataRaw.match.summary
					: 'No summary available'
		}
	};
};

// Derived store for sorted and filtered jobs
const sortedJobs = derived([jobs, sortConfig, searchText], ([$jobs, $sortConfig, $searchText]) => {
	let filteredJobs = $jobs;

	// Search filtering
	if ($searchText) {
		const searchLower = $searchText.toLowerCase();
		filteredJobs = filteredJobs.filter((job) => {
			return (
				(job?.basicInfo?.company || '').toLowerCase().includes(searchLower) ||
				(job?.basicInfo?.title || '').toLowerCase().includes(searchLower) ||
				(job?.details?.description || '').toLowerCase().includes(searchLower)
			);
		});
	}

	// Bookmarked filter and sort
	if ($sortConfig.column === 'bookmarked') {
		return [...filteredJobs]
			.filter((job) => (job.generalData?.status || '').toLowerCase() === 'bookmarked')
			.sort((a, b) => {
				const scoreA = a.AccumulatedScores?.accumulatedScore || 0;
				const scoreB = b.AccumulatedScores?.accumulatedScore || 0;
				return scoreB - scoreA;
			});
	}

	// Sorting
	return [...filteredJobs].sort((a, b) => {
		if ($sortConfig.column === 'generalData.timestamp') {
			const aDate = getJobDate(a);
			const bDate = getJobDate(b);
			return $sortConfig.direction === 'desc'
				? bDate.getTime() - aDate.getTime()
				: aDate.getTime() - bDate.getTime();
		}

		const aValue = getNestedValue(a, $sortConfig.column);
		const bValue = getNestedValue(b, $sortConfig.column);

		if ($sortConfig.column === 'AccumulatedScores.accumulatedScore') {
			const scoreA = typeof aValue === 'number' ? aValue : 0;
			const scoreB = typeof bValue === 'number' ? bValue : 0;
			return $sortConfig.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
		}

		const valA = (aValue || '').toString().toLowerCase();
		const valB = (bValue || '').toString().toLowerCase();

		if (!valA && !valB) return 0;
		if (!valA) return $sortConfig.direction === 'asc' ? -1 : 1;
		if (!valB) return $sortConfig.direction === 'asc' ? 1 : -1;

		return $sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
	});
});

function createJobStore() {
	let unsubscribeJobs = null;

	const { subscribe, set, update } = jobs;

	const store = {
		subscribe,
		init: async (userId, timeFilter = 'recent') => {
			if (!userId) {
				set([]);
				return;
			}

			loading.set(true);
			error.set(null);

			try {
				await store.loadJobsForTimeFilter(timeFilter, userId);
			} catch (err) {
				console.error('Error initializing jobs:', err);
				error.set(err);
			} finally {
				loading.set(false);
			}
		},

		loadJobsForTimeFilter: async (filterType, userId) => {
			if (!userId) return;

			loading.set(true);
			error.set(null);

			try {
				const jobsRef = collection(db, 'users', userId, 'scrapedJobs');
				let q;

				if (filterType === 'recent') {
					// Load jobs from the last 24 hours (matching email notification behavior)
					const twentyFourHoursAgo = new Date();
					twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
					
					console.log(`Loading jobs from last 24 hours since: ${twentyFourHoursAgo.toISOString()}`);
					
					// Query recent jobs with a reasonable limit, ordered by posted date
					q = query(
						jobsRef, 
						orderBy('details.postedDate', 'desc'),
						limit(100) // Reasonable limit to prevent excessive loading
					);
					
					// Get jobs and filter by 24-hour window in memory
					const snapshot = await getDocs(q);
					const recentJobs = [];
					
					snapshot.docs.forEach((doc) => {
						const jobDataRaw = doc.data();
						
						// Check if job is from last 24 hours using snapshotDate
						const snapshotDateStr = jobDataRaw.searchMetadata?.snapshotDate;
						let isRecent = false;
						
						if (snapshotDateStr) {
							const snapshotDate = new Date(snapshotDateStr);
							isRecent = snapshotDate >= twentyFourHoursAgo;
						} else {
							// Fallback to posted date for older jobs without snapshotDate
							const postedDate = jobDataRaw.details?.postedDate;
							if (postedDate) {
								const jobDate = typeof postedDate === 'string' ? new Date(postedDate) : 
											   (postedDate && postedDate.toDate ? postedDate.toDate() : new Date(0));
								isRecent = jobDate >= twentyFourHoursAgo;
							}
						}
						
						if (isRecent) {
							recentJobs.push(processJobData(doc));
						}
					});

					console.log(`Loaded ${recentJobs.length} jobs from last 24 hours (filtered from ${snapshot.size} total)`);
					set(recentJobs);
					return;
				} else if (filterType === 'seven') {
					// Load jobs from the past week
					const weekAgo = new Date();
					weekAgo.setDate(weekAgo.getDate() - 7);
					q = query(jobsRef, orderBy('details.postedDate', 'desc'));
					// We'll filter the past week jobs in memory since Firestore
					// doesn't support inequality filters with server timestamps
					const snapshot = await getDocs(q);
					const jobsList = snapshot.docs.map(processJobData).filter((job) => {
						const jobDate = getJobDate(job);
						return jobDate >= weekAgo;
					});
					set(jobsList);
					return;
				} else {
					// Load all jobs
					q = query(jobsRef, orderBy('details.postedDate', 'desc'));
				}

				const snapshot = await getDocs(q);
				const jobsList = snapshot.docs.map(processJobData);
				set(jobsList);
			} catch (err) {
				console.error('Error loading jobs for filter:', err);
				error.set(err);
			} finally {
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
			batches.set([]);
		}
	};

	return store;
}

const jobStore = createJobStore();

export { jobStore, sortedJobs, sortConfig, searchText, timeFilter, loading, error };
