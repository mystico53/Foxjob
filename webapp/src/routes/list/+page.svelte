<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, getDocs } from 'firebase/firestore';
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
			jobData = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
			sortData(sortColumn, sortDirection);
		} catch (err) {
			console.error('Error fetching job data:', err);
			error = 'Failed to fetch job data. Please try again later.';
		} finally {
			loading = false;
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
		return `<ul>${arr.map((item) => `<li>${item}</li>`).join('')}</ul>`;
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

		{#if jobData.length > 0}
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th on:click={() => handleSort('companyInfo.name')}>
								Company Name {sortColumn === 'companyInfo.name'
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
							<th on:click={() => handleSort('companyInfo.companyFocus')}>
								Company Focus {sortColumn === 'companyInfo.companyFocus'
									? sortDirection === 'asc'
										? '▲'
										: '▼'
									: ''}
							</th>
							<th on:click={() => handleSort('companyInfo.compensation')}>
								Compensation {sortColumn === 'companyInfo.compensation'
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
							<th on:click={() => handleSort('jobInfo.jobSummary')}>
								Job Summary {sortColumn === 'jobInfo.jobSummary'
									? sortDirection === 'asc'
										? '▲'
										: '▼'
									: ''}
							</th>
							<th on:click={() => handleSort('jobInfo.remoteType')}>
								Remote Type {sortColumn === 'jobInfo.remoteType'
									? sortDirection === 'asc'
										? '▲'
										: '▼'
									: ''}
							</th>
							<th>Areas of Fun</th>
							<th>Mandatory Skills</th>
							<th on:click={() => handleSort('timestamp')}>
								Timestamp {sortColumn === 'timestamp' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each jobData as job}
							<tr>
								<td>{job.companyInfo?.name || 'N/A'}</td>
								<td>{job.companyInfo?.industry || 'N/A'}</td>
								<td>{job.companyInfo?.companyFocus || 'N/A'}</td>
								<td>{job.companyInfo?.compensation || 'N/A'}</td>
								<td>{job.jobInfo?.jobTitle || 'N/A'}</td>
								<td>{job.jobInfo?.jobSummary || 'N/A'}</td>
								<td>{job.jobInfo?.remoteType || 'N/A'}</td>
								<td>{@html formatArray(job.areasOfFun)}</td>
								<td>{@html formatArray(job.mandatorySkills)}</td>
								<td>{formatDate(job.timestamp)}</td>
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
	th,
	td {
		border: 1px solid #ddd;
		padding: 12px;
		text-align: left;
		vertical-align: top;
		word-wrap: break-word;
		max-width: 300px;
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
	td ul {
		margin: 0;
		padding-left: 20px;
	}
	.error {
		color: red;
	}
</style>
