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
	let sortColumn = 'timestamp';
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
		loading = true;
		error = null;
		try {
			const processedRef = collection(db, 'users', user.uid, 'processed');
			const querySnapshot = await getDocs(processedRef);
			jobData = querySnapshot.docs
				.map((doc) => ({
					id: doc.id,
					...doc.data(),
					hidden: doc.data().hidden || false
				}))
				.filter((job) => !job.hidden);
			sortData(sortColumn, sortDirection);
		} catch (err) {
			console.error('Error fetching job data:', err);
			error = 'Failed to fetch job data. Please try again later.';
		} finally {
			loading = false;
		}
	}

	async function hideJob(jobId) {
		try {
			const jobRef = doc(db, 'users', user.uid, 'processed', jobId);
			await updateDoc(jobRef, { hidden: true });
			jobData = jobData.filter((job) => job.id !== jobId);
		} catch (err) {
			console.error('Error hiding job:', err);
			error = 'Failed to hide job. Please try again.';
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

	function formatArray(arr) {
		if (!arr) return 'N/A';
		return arr.join(', ');
	}

	function formatDate(timestamp) {
		if (timestamp && timestamp.toDate) {
			return timestamp.toDate().toLocaleString();
		}
		return 'N/A';
	}

	function sortData(column, direction) {
		sortColumn = column;
		sortDirection = direction;

		jobData = jobData.sort((a, b) => {
			let aValue = column.split('.').reduce((obj, key) => obj && obj[key], a);
			let bValue = column.split('.').reduce((obj, key) => obj && obj[key], b);

			if (column === 'timestamp') {
				aValue = a.timestamp?.toDate?.() || new Date(0);
				bValue = b.timestamp?.toDate?.() || new Date(0);
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
</script>

<main>
	<h1>Job List</h1>
	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if user}
		<p>Welcome to your job list, {user.displayName}!</p>
		<button on:click={handleLogout}>Log Out</button>

		<div class="sort-controls">
			<label for="sort-select">Sort by:</label>
			<select id="sort-select" bind:value={sortColumn} on:change={() => handleSort(sortColumn)}>
				<option value="companyInfo.name">Company Name</option>
				<option value="companyInfo.industry">Industry</option>
				<option value="jobInfo.jobTitle">Job Title</option>
				<option value="timestamp">Date Added</option>
			</select>
			<button on:click={() => handleSort(sortColumn)}>
				{sortDirection === 'asc' ? '▲' : '▼'}
			</button>
		</div>

		{#if jobData.length > 0}
			<div class="card-container">
				{#each jobData as job}
					<div class="card">
						<h2>{job.companyInfo?.name || 'N/A'}</h2>
						<p><strong>Industry:</strong> {job.companyInfo?.industry || 'N/A'}</p>
						<p><strong>Company Focus:</strong> {job.companyInfo?.companyFocus || 'N/A'}</p>
						<p><strong>Job Title:</strong> {job.jobInfo?.jobTitle || 'N/A'}</p>
						<p><strong>Compensation:</strong> {job.compensation || 'N/A'}</p>
						<p><strong>Remote Type:</strong> {job.jobInfo?.remoteType || 'N/A'}</p>
						<p><strong>Job Summary:</strong> {job.jobInfo?.jobSummary || 'N/A'}</p>
						<p><strong>Areas of Fun:</strong> {formatArray(job.areasOfFun)}</p>
						<p><strong>Mandatory Skills:</strong> {formatArray(job.mandatorySkills)}</p>
						<p><strong>Date Added:</strong> {formatDate(job.timestamp)}</p>
						<div class="button-container">
							<button on:click={() => openJobLink(job.url)} class="link-button">View Job</button>
							<button on:click={() => hideJob(job.id)} class="hide-button">Hide Job</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p>No job data available.</p>
		{/if}
	{:else}
		<p>Please sign in to view your job list.</p>
	{/if}
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}
	.card-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		padding: 20px 0;
	}
	.card {
		width: 50%;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		background-color: #fff;
		transition: box-shadow 0.3s ease;
	}
	.card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	.card h2 {
		margin-top: 0;
		color: #333;
	}
	.card p {
		margin: 10px 0;
	}
	.button-container {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
	}
	.link-button,
	.hide-button {
		padding: 10px 15px;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.3s;
	}
	.link-button {
		background-color: #4caf50;
	}
	.link-button:hover {
		background-color: #45a049;
	}
	.hide-button {
		background-color: #f44336;
	}
	.hide-button:hover {
		background-color: #d32f2f;
	}
	.sort-controls {
		margin: 20px 0;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.sort-controls select,
	.sort-controls button {
		padding: 5px 10px;
		border-radius: 4px;
		border: 1px solid #ddd;
	}
	.error {
		color: red;
	}
	@media (max-width: 768px) {
		.card {
			width: 100%;
		}
	}
</style>