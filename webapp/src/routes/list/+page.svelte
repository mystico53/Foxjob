<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	
	let user = null;
	let jobData = [];
	let loading = true;
	let error = null;
	let sortColumn = 'Score.totalScore';
	let sortDirection = 'desc';
	
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
						generalData: jobDataRaw.generalData || {},
						Score: scoreData,
						matchResult: matchResult
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
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each jobData as job}
								<tr>
									<td>
										<button on:click={() => openJobLink(job.generalData?.url)} class="link-button">Visit Job</button>
									</td>
									<td>{job.companyInfo?.name || 'N/A'}</td>
									<td>{job.jobInfo?.jobTitle || 'N/A'}</td>
									<td>{job.companyInfo?.industry || 'N/A'}</td>
									<td>{typeof job.Score?.totalScore === 'number' ? Math.round(job.Score.totalScore) : 'N/A'}</td>
									<td>{formatDate(job.generalData?.timestamp)}</td>
									<td>
										<button on:click={() => hideJob(job.id)} class="hide-button">Hide</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p>No job data available.</p>
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
		.link-button {
			padding: 5px 10px;
			background-color: #4caf50;
			color: white;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			transition: background-color 0.3s;
		}
		.link-button:hover {
			background-color: #45a049;
		}
		.hide-button {
			padding: 5px 10px;
			background-color: #ff4d4d;
			color: white;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			transition: background-color 0.3s;
		}
		.hide-button:hover {
			background-color: #e60000;
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
	</style>