<script>
	import { onMount, onDestroy } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import JobDetailsOverlay from '../../lib/JobDetailsOverlay.svelte';
	import Toast from './Toast.svelte';
	let user = null;
	let jobData = [];
	let loading = true;
	let error = null;
	let sortColumn = 'Score.totalScore';
	let sortDirection = 'desc';

	let showOverlay = false;
	let currentJobIndex = 0;

	let toastMessage = '';
	let showToast = false;
	let toastDuration = 2000; // 3 seconds

	let unsubscribeAuth = null;
	let unsubscribeJobs = null;

	onMount(() => {
		unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
			user = currentUser;
			if (user) {
				await setupJobListener();
			} else {
				loading = false;
			}
		});
	});

	onDestroy(() => {
		if (unsubscribeAuth) unsubscribeAuth();
		if (unsubscribeJobs) unsubscribeJobs();
	});

	async function setupJobListener() {
		loading = true;
		error = null;
		jobData = [];

		try {
			const jobsRef = collection(db, 'users', user.uid, 'jobs');
			// Create a query to exclude hidden jobs
			const jobsQuery = query(jobsRef, where('generalData.hidden', '==', false));
			console.log(
				`setupJobListener: Listening to jobs collection for user ID: ${user.uid} excluding hidden jobs`
			);

			unsubscribeJobs = onSnapshot(
				jobsQuery,
				async (jobsSnapshot) => {
					console.log(`setupJobListener: Jobs collection updated with ${jobsSnapshot.size} job(s)`);

					if (jobsSnapshot.empty) {
						console.log('setupJobListener: No jobs found for the user.');
						jobData = [];
						loading = false;
						return;
					}

					const jobDocs = jobsSnapshot.docs;
					console.log(`setupJobListener: Processing ${jobDocs.length} job document(s)`);

					const jobPromises = jobDocs.map(async (jobDoc, index) => {
						console.log(
							`setupJobListener: Processing job ${index + 1}/${jobDocs.length} with ID: ${jobDoc.id}`
						);
						try {
							const jobDataRaw = jobDoc.data();
							console.log(`Job Data Raw for ID ${jobDoc.id}:`, jobDataRaw);

							const summarizedData = jobDataRaw.summarized;
							console.log(`Summarized Data for ID ${jobDoc.id}:`, summarizedData);

							if (!summarizedData) {
								console.log(`setupJobListener: No summarized data found for job ID: ${jobDoc.id}`);
								return null;
							}

							const scoreData = jobDataRaw.Score;
							if (!scoreData) {
								console.log(`setupJobListener: No score data found for job ID: ${jobDoc.id}`);
								return null;
							}

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
									status: jobDataRaw.generalData?.status || '' // Ensure status is included
								},
								Score: scoreData,
								matchResult: matchResult
							};
						} catch (jobError) {
							console.error(`setupJobListener: Error processing job ID ${jobDoc.id}:`, jobError);
							return null;
						}
					});

					console.log('setupJobListener: Initiating parallel fetch of job data for all jobs...');
					const jobResults = await Promise.all(jobPromises);
					console.log('setupJobListener: All job data fetched');

					jobData = jobResults.filter((job) => job !== null);
					console.log(`setupJobListener: Aggregated total of ${jobData.length} job data entries`);

					if (jobData.length === 0) {
						console.log('setupJobListener: No job data available after processing.');
					}

					console.log(
						`setupJobListener: Sorting job data by column: ${sortColumn}, direction: ${sortDirection}`
					);
					sortData(sortColumn, sortDirection);
					console.log('setupJobListener: Sorting completed');

					loading = false;
				},
				(err) => {
					console.error('setupJobListener: Error listening to jobs collection:', err);
					error = 'Failed to listen to job data. Please try again later.';
					loading = false;
				}
			);
		} catch (err) {
			console.error('setupJobListener: Error setting up job listener:', err);
			error = 'Failed to set up job listener. Please try again later.';
			loading = false;
		}
	}

	async function handleLogout() {
		try {
			if (unsubscribeJobs) unsubscribeJobs();
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
		jobData = [...jobData];
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
			await updateDoc(jobRef, { 'generalData.hidden': true });
			// No need to manually filter jobData since onSnapshot will handle updates
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
			const jobIndex = jobData.findIndex((job) => job.id === jobId);
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
	/*
	async function markAsReadAndNext(jobId) {
		const job = jobData.find((job) => job.id === jobId);
		if (job && job.generalData?.status.toLowerCase() === 'new') {
			await updateJobStatus(jobId, 'Read');
		}
		nextJob();
	}
	*/

	async function hideJobAndNext(jobId) {
		try {
			const jobIndex = jobData.findIndex((job) => job.id === jobId);
			if (jobIndex === -1) return;

			await hideJob(jobId); // Hide the job

			// Show toast notification
			toastMessage = 'Job has been hidden successfully.';
			showToast = true;

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

	function dismissToast() {
		showToast = false;
	}

	// Refactored toggleBookmark function using updateJobStatus
	async function toggleBookmark(jobId) {
		try {
			const jobIndex = jobData.findIndex((job) => job.id === jobId);
			if (jobIndex === -1) return;

			const currentStatus = jobData[jobIndex].generalData?.status || '';
			const newStatus = currentStatus.toLowerCase() === 'bookmarked' ? '' : 'bookmarked';

			await updateJobStatus(jobId, newStatus);
		} catch (err) {
			console.error('Error updating job status:', err);
			error = 'Failed to update job status. Please try again.';
		}
	}

	function getStatusDisplay(job) {
		const status = job.generalData?.status;
		console.log('Status for job', job.id, ':', status);

		if (!status) return '';

		switch (status.toLowerCase()) {
			case 'bookmarked':
				return 'bookmarked';

			default:
				return status;
		}
	}

	function getScoreColor(score) {
		// Define color stops
		const colorStops = [
			{ score: 40, color: { r: 255, g: 107, b: 107 } }, // #ff6b6b
			{ score: 60, color: { r: 244, g: 211, b: 94 } }, // #f4d35e
			{ score: 100, color: { r: 111, g: 219, b: 111 } } // #6fdb6f
		];

		// Find the two color stops that the score falls between
		let lowerStop = colorStops[0];
		let upperStop = colorStops[colorStops.length - 1];
		for (let i = 0; i < colorStops.length - 1; i++) {
			if (score >= colorStops[i].score && score <= colorStops[i + 1].score) {
				lowerStop = colorStops[i];
				upperStop = colorStops[i + 1];
				break;
			}
		}

		// Calculate the percentage between the two color stops
		const range = upperStop.score - lowerStop.score;
		const percent = range === 0 ? 1 : (score - lowerStop.score) / range;

		// Interpolate between the two colors
		const r = Math.round(lowerStop.color.r + percent * (upperStop.color.r - lowerStop.color.r));
		const g = Math.round(lowerStop.color.g + percent * (upperStop.color.g - lowerStop.color.g));
		const b = Math.round(lowerStop.color.b + percent * (upperStop.color.b - lowerStop.color.b));

		return `rgb(${r}, ${g}, ${b})`;
	}
</script>

<main class="dashboard-container">
	<div class="content-wrapper">
		{#if loading}
			<p>Loading...</p>
		{:else if error}
			<p class="error">{error}</p>
		{:else if user}
			<div class="header">
				<h2 class="h2">Job List</h2>
				<button on:click={handleLogout} class="btn variant-filled-secondary">Log Out</button>
			</div>

			{#if jobData.length > 0}
				<div class="table-container">
					<table class="table-hover table">
						<thead>
							<tr>
								<th>No.</th>
								<th>Link</th>
								<th on:click={() => handleSort('generalData.status')}>
									Status {sortColumn === 'generalData.status'
										? sortDirection === 'asc'
											? '▲'
											: '▼'
										: ''}
								</th>
								<th on:click={() => handleSort('companyInfo.name')}>
									Company Name {sortColumn === 'companyInfo.name'
										? sortDirection === 'asc'
											? '▲'
											: '▼'
										: ''}
								</th>
								<th on:click={() => handleSort('jobInfo.jobTitle')}>
									Job Title {sortColumn === 'jobInfo.jobTitle'
										? sortDirection === 'asc'
											? '▲'
											: '▼'
										: ''}
								</th>
								<th on:click={() => handleSort('companyInfo.industry')}>
									Industry {sortColumn === 'companyInfo.industry'
										? sortDirection === 'asc'
											? '▲'
											: '▼'
										: ''}
								</th>
								<th on:click={() => handleSort('Score.totalScore')}>
									Score {sortColumn === 'Score.totalScore'
										? sortDirection === 'asc'
											? '▲'
											: '▼'
										: ''}
								</th>
								<th on:click={() => handleSort('generalData.timestamp')}>
									Date Added {sortColumn === 'generalData.timestamp'
										? sortDirection === 'asc'
											? '▲'
											: '▼'
										: ''}
								</th>
							</tr>
						</thead>
						<tbody>
							{#each jobData as job, index}
								<tr>
									<td>{index + 1}</td>
									<td>
										<button on:click={() => showDetails(index)} class="details-button"
											>Details</button
										>
									</td>
									<td>{getStatusDisplay(job)}</td>
									<td>{job.companyInfo?.name || 'N/A'}</td>
									<td>{job.jobInfo?.jobTitle || 'N/A'}</td>
									<td>{job.companyInfo?.industry || 'N/A'}</td>
									<td>
										{#if typeof job.Score?.totalScore === 'number'}
											{@const score = Math.round(job.Score.totalScore)}
											{@const normalizedScore = score / 100}
											{@const circumference = 2 * Math.PI * 22}
											{@const initialOffset = circumference}
											{@const finalOffset = circumference * (1 - normalizedScore)}
											<div class="score-cell">
												<svg class="score-circle" viewBox="0 0 50 50">
													<circle
														cx="25"
														cy="25"
														r="22"
														fill="none"
														stroke="#e6e6e6"
														stroke-width="6"
													/>
													<circle
														cx="25"
														cy="25"
														r="22"
														fill="none"
														stroke={getScoreColor(score)}
														stroke-width="6"
														stroke-dasharray={circumference}
														style="--initial-offset: {initialOffset}; --final-offset: {finalOffset};"
														class="animate-fill"
													/>
												</svg>
												<span class="score-text">{score}</span>
											</div>
										{:else}
											N/A
										{/if}
									</td>
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
					{closeOverlay}
					handleNext={markAsReadAndNext}
					{previousJob}
					isFirstJob={currentJobIndex === 0}
					isLastJob={currentJobIndex === jobData.length - 1}
					{toggleBookmark}
					{hideJobAndNext}
					{openJobLink}
				/>
			{/if}

			<!-- Toast Notification -->
			<Toast
				message={toastMessage}
				visible={showToast}
				duration={toastDuration}
				on:dismiss={dismissToast}
			/>
		{:else}
			<p>Please sign in to view your job list.</p>
		{/if}
	</div>
</main>

<style>
	.dashboard-container {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.content-wrapper {
		width: 100%;
		max-width: 1200px;
		padding: 0 20px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.error {
		color: red;
	}

	.score-cell {
		position: relative;
		width: 50px;
		height: 50px;
	}

	.score-cell svg {
		transform: rotate(-90deg);
		width: 50px;
		height: 50px;
	}

	.score-cell {
		width: 50px;
		height: 50px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.score-circle {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.score-text {
		position: absolute;
		font-size: 14px;
		font-weight: bold;
	}

	@keyframes progress {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes fillup {
		from {
			stroke-dashoffset: var(--initial-offset);
		}
		to {
			stroke-dashoffset: var(--final-offset);
		}
	}

	.animate-fill {
		animation: fillup 1000ms ease-out forwards;
	}
</style>
