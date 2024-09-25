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
			<table>
				<thead>
					<tr>
						<th>Company Name</th>
						<th>Industry</th>
						<th>Compensation</th>
						<th>Job Summary</th>
					</tr>
				</thead>
				<tbody>
					{#each jobData as job}
						<tr>
							<td>{job.companyInfo?.name || 'N/A'}</td>
							<td>{job.companyInfo?.industry || 'N/A'}</td>
							<td>{job.companyInfo?.compensation || 'N/A'}</td>
							<td>{job.jobInfo?.jobSummary || 'N/A'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>No job data available.</p>
		{/if}
	{:else}
		<p>Please sign in to view your job list.</p>
	{/if}
</main>

<style>
	table {
		border-collapse: collapse;
		width: 100%;
		margin-top: 20px;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 8px;
		text-align: left;
	}
	th {
		background-color: #f2f2f2;
		font-weight: bold;
	}
	.error {
		color: red;
	}
</style>
