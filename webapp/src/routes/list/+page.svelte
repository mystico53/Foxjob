<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import JobDetailsOverlay from '../../lib/JobDetailsOverlay.svelte'; 
	
	let user = null;
	let jobData = [];
	let loading = true;
	let error = null;
	let sortColumn = 'Score.totalScore';
	let sortDirection = 'desc';

	let showOverlay = false;
	let currentJobIndex = 0;

	
	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			user = currentUser;
			if (user) {
				await fetchJobData();
			} else {
				loading = false;
			}
		});
	
		return () => unsubscribe();
	});
	
	async function fetchJobData() {
    console.log('fetchJobData: Function started');
    loading = true;
    error = null;
    jobData = [];

    try {
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        console.log(`fetchJobData: Created reference to jobs collection for user ID: ${user.uid}`);

        const jobsSnapshot = await getDocs(jobsRef);
        console.log(`fetchJobData: Retrieved ${jobsSnapshot.size} job(s)`);

        if (jobsSnapshot.empty) {
            console.log('fetchJobData: No jobs found for the user.');
            return;
        }

        const jobDocs = jobsSnapshot.docs;
        console.log(`fetchJobData: Processing ${jobDocs.length} job document(s)`);

        const jobPromises = jobDocs.map(async (jobDoc, index) => {
            console.log(`fetchJobData: Processing job ${index + 1}/${jobDocs.length} with ID: ${jobDoc.id}`);
            try {
                const jobDataRaw = jobDoc.data();
                console.log(`Job Data Raw for ID ${jobDoc.id}:`, jobDataRaw);

                const summarizedData = jobDataRaw.summarized;
                console.log(`Summarized Data for ID ${jobDoc.id}:`, summarizedData);

                if (!summarizedData) {
                    console.log(`fetchJobData: No summarized data found for job ID: ${jobDoc.id}`);
                    return null;
                }

                const scoreData = jobDataRaw.Score;
                if (!scoreData) {
                    console.log(`fetchJobData: No score data found for job ID: ${jobDoc.id}`);
                    return null;
                }

                const matchResult = {
                    keySkills: [],
                    totalScore: scoreData.totalScore || 0,
                    summary: scoreData.summary || ''
                };

                Object.keys(scoreData).forEach(key => {
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
                        status: jobDataRaw.generalData?.status || '' // Ensure status is included
                    },
                    Score: scoreData,
                    matchResult: matchResult,
                    // Remove or clarify this line to avoid confusion:
                    // status: jobDataRaw.status || '' 
                    // If 'status' is only within 'generalData', remove the above line
                };
            } catch (jobError) {
                console.error(`fetchJobData: Error processing job ID ${jobDoc.id}:`, jobError);
                return null;
            }
        });

        console.log('fetchJobData: Initiating parallel fetch of job data for all jobs...');
        const jobResults = await Promise.all(jobPromises);
        console.log('fetchJobData: All job data fetched');

        jobData = jobResults.filter(job => job !== null);
        console.log(`fetchJobData: Aggregated total of ${jobData.length} job data entries`);

        if (jobData.length === 0) {
            console.log('fetchJobData: No job data available after processing.');
        }

        console.log(`fetchJobData: Sorting job data by column: ${sortColumn}, direction: ${sortDirection}`);
        sortData(sortColumn, sortDirection);
        console.log('fetchJobData: Sorting completed');

    } catch (err) {
        console.error('fetchJobData: Error fetching job data:', err);
        error = 'Failed to fetch job data. Please try again later.';
    } finally {
        loading = false;
        console.log('fetchJobData: Function completed, loading set to false');
    }
}
	
	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/');
		} catch (err) {
			console.error('Error signing out:', err);
			error = 'Failed to sign out. Please try again.';
		}
	}
	
	function formatDate(timestamp) {
		if (timestamp && timestamp.toDate) {
			const date = timestamp.toDate();
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = String(date.getFullYear()).slice(-2);
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			const seconds = String(date.getSeconds()).padStart(2, '0');
			return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
		}
		return 'N/A';
	}
	
	function sortData(column, direction) {
		sortColumn = column;
		sortDirection = direction;
	
		jobData = jobData.sort((a, b) => {
			let aValue = column.split('.').reduce((obj, key) => obj && obj[key], a);
			let bValue = column.split('.').reduce((obj, key) => obj && obj[key], b);
	
			if (column === 'generalData.timestamp') {
				aValue = a.generalData?.timestamp?.toDate?.() || new Date(0);
				bValue = b.generalData?.timestamp?.toDate?.() || new Date(0);
			}
	
			if (aValue < bValue) return direction === 'asc' ? -1 : 1;
			if (aValue > bValue) return direction === 'asc' ? 1 : -1;
			return 0;
		});
	}
	
	function handleSort(column) {
		const newDirection = column === sortColumn && sortDirection === 'asc' ? 'desc' : 'asc';
		sortData(column, newDirection);
	}
	
	function openJobLink(url) {
		if (url) {
			window.open(url, '_blank');
		}
	}
	
	async function hideJob(jobId) {
		try {
			const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
			await updateDoc(jobRef, { hidden: true });
			jobData = jobData.filter((job) => job.id !== jobId);
		} catch (err) {
			console.error('Error hiding job:', err);
			error = 'Failed to hide job. Please try again.';
		}
	}

	function showDetails(index) {
		currentJobIndex = index;
		showOverlay = true;
	}

	function closeOverlay() {
		showOverlay = false;
	}

	function nextJob() {
		if (currentJobIndex < jobData.length - 1) {
			currentJobIndex++;
		}
	}

	function previousJob() {
		if (currentJobIndex > 0) {
			currentJobIndex--;
		}
	}

	// Generic status updater function
    async function updateJobStatus(jobId, newStatus) {
        try {
            const jobIndex = jobData.findIndex(job => job.id === jobId);
            if (jobIndex === -1) return;

            const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
            await updateDoc(jobRef, { 'generalData.status': newStatus });

            // Update local state immutably
            jobData[jobIndex] = {
                ...jobData[jobIndex],
                generalData: {
                    ...jobData[jobIndex].generalData,
                    status: newStatus
                }
            };
            jobData = [...jobData]; // Trigger reactivity

            console.log(`Job ${jobId} status updated to: ${newStatus}`);
        } catch (err) {
            console.error('Error updating job status:', err);
            error = 'Failed to update job status. Please try again.';
        }
    }

    // Function to mark as "Read" if status is "New" and navigate to next job
    async function markAsReadAndNext(jobId) {
        const job = jobData.find(job => job.id === jobId);
        if (job && job.generalData?.status.toLowerCase() === 'new') {
            await updateJobStatus(jobId, 'Read');
        }
        nextJob();
    }

	async function hideJobAndNext(jobId) {
    try {
        const jobIndex = jobData.findIndex(job => job.id === jobId);
        if (jobIndex === -1) return;

        await hideJob(jobId); // Hide the job

        // After hiding, decide where to navigate next
        if (jobIndex < jobData.length - 1) {
            // If not the last job, stay at the same index since the list has shifted
            // currentJobIndex remains the same
        } else if (jobData.length > 0) {
            // If it was the last job, move to the previous one
            currentJobIndex = jobData.length - 1;
        } else {
            // No jobs left, close the overlay
            closeOverlay();
        }
    } catch (err) {
        console.error('Error hiding job and moving to next:', err);
        error = 'Failed to hide job. Please try again.';
    }
}

    // Refactored toggleStar function using updateJobStatus
    async function toggleStar(jobId) {
        try {
            const jobIndex = jobData.findIndex(job => job.id === jobId);
            if (jobIndex === -1) return;

            const currentStatus = jobData[jobIndex].generalData?.status || '';
            const newStatus = currentStatus.toLowerCase() === 'starred' ? '' : 'starred';

            await updateJobStatus(jobId, newStatus);
        } catch (err) {
            console.error('Error updating job status:', err);
            error = 'Failed to update job status. Please try again.';
        }
    }

    // Enhanced getStatusDisplay function to include "Read" status
    function getStatusDisplay(job) {
        const status = job.generalData?.status;
        console.log('Status for job', job.id, ':', status);

        if (!status) return '';

        switch(status.toLowerCase()) {
            case 'starred':
                return '⭐ Starred';
            case 'new':
                return '🆕 New';
            case 'read':
                return '📖 Read';
            default:
                return status;
        }
    }
</script>

<main>
    {#if loading}
        <p>Loading...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else if user}
        <div class="header">
            <h1>Job List</h1>
            <button on:click={handleLogout} class="logout-button">Log Out</button>
        </div>

        {#if jobData.length > 0}
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Link</th>
                            <th on:click={() => handleSort('generalData.status')}>
                                Status {sortColumn === 'generalData.status' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th on:click={() => handleSort('companyInfo.name')}>
                                Company Name {sortColumn === 'companyInfo.name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th on:click={() => handleSort('jobInfo.jobTitle')}>
                                Job Title {sortColumn === 'jobInfo.jobTitle' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th on:click={() => handleSort('companyInfo.industry')}>
                                Industry {sortColumn === 'companyInfo.industry' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th on:click={() => handleSort('Score.totalScore')}>
                                Score {sortColumn === 'Score.totalScore' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th on:click={() => handleSort('generalData.timestamp')}>
                                Date Added {sortColumn === 'generalData.timestamp' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each jobData as job, index}
                            <tr>
                                <td>
                                    <button on:click={() => showDetails(index)} class="details-button">Details</button>
                                </td>
                                <td>{getStatusDisplay(job)}</td>
                                <td>{job.companyInfo?.name || 'N/A'}</td>
                                <td>{job.jobInfo?.jobTitle || 'N/A'}</td>
                                <td>{job.companyInfo?.industry || 'N/A'}</td>
                                <td>{typeof job.Score?.totalScore === 'number' ? Math.round(job.Score.totalScore) : 'N/A'}</td>
                                <td>{formatDate(job.generalData?.timestamp)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <p>No job data available.</p>
        {/if}

        {#if showOverlay && jobData[currentJobIndex]}
            <JobDetailsOverlay
                job={jobData[currentJobIndex]}
                closeOverlay={closeOverlay}
                handleNext={markAsReadAndNext}
                previousJob={previousJob}
                isFirstJob={currentJobIndex === 0}
                isLastJob={currentJobIndex === jobData.length - 1}
                toggleStar={toggleStar}
				hideJobAndNext={hideJobAndNext}
				openJobLink={openJobLink}
            />
        {/if}
    {:else}
        <p>Please sign in to view your job list.</p>
    {/if}
</main>
	
	<style>
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20px;
		}
		.table-container {
			overflow-x: auto;
			max-width: 100%;
		}
		table {
			border-collapse: separate;
			border-spacing: 0;
			width: 100%;
			margin-top: 20px;
		}
		th, td {
			border: 1px solid #ddd;
			padding: 12px;
			text-align: left;
			vertical-align: middle;
			word-wrap: break-word;
		}
		th {
			background-color: #f2f2f2;
			font-weight: bold;
			position: sticky;
			top: 0;
			z-index: 10;
			cursor: pointer;
		}
		th:hover {
			background-color: #e6e6e6;
		}
		.error {
			color: red;
		}
		.logout-button {
			padding: 10px 20px;
			background-color: #a0aec0;
			color: white;
			border: none;
			border-radius: 25px;
			cursor: pointer;
			transition: background-color 0.3s ease, box-shadow 0.3s ease;
		}
		.logout-button:hover {
			background-color: #718096;
			box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		}

		.details-button {
		padding: 5px 10px;
		background-color: #3498db;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.3s;
		margin-left: 5px;
	}
	.details-button:hover {
		background-color: #2980b9;
	}
	</style>