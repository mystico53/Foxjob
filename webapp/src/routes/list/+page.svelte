<script>
	import { onMount, onDestroy } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { collection, onSnapshot, query, where } from 'firebase/firestore';
  
	let user = null;
	let jobData = [];
	let loading = true;
	let error = null;
	let sortColumn = 'Score.totalScore';
	let sortDirection = 'desc';
  
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
		const jobsQuery = query(jobsRef, where('generalData.hidden', '==', false));
  
		unsubscribeJobs = onSnapshot(
		  jobsQuery,
		  async (jobsSnapshot) => {
			if (jobsSnapshot.empty) {
			  jobData = [];
			  loading = false;
			  return;
			}
  
			const jobPromises = jobsSnapshot.docs.map(async (jobDoc) => {
			  try {
				const jobDataRaw = jobDoc.data();
				const summarizedData = jobDataRaw.summarized;
				
				if (!summarizedData || !jobDataRaw.Score) {
				  return null;
				}
  
				return {
				  id: jobDoc.id,
				  ...summarizedData,
				  generalData: {
					...jobDataRaw.generalData,
					status: jobDataRaw.generalData?.status || ''
				  },
				  Score: jobDataRaw.Score
				};
			  } catch (jobError) {
				console.error(`Error processing job ID ${jobDoc.id}:`, jobError);
				return null;
			  }
			});
  
			const jobResults = await Promise.all(jobPromises);
			jobData = jobResults.filter((job) => job !== null);
			sortData(sortColumn, sortDirection);
			loading = false;
		  },
		  (err) => {
			console.error('Error listening to jobs collection:', err);
			error = 'Failed to load jobs. Please try again later.';
			loading = false;
		  }
		);
	  } catch (err) {
		console.error('Error setting up job listener:', err);
		error = 'Failed to set up job listener. Please try again later.';
		loading = false;
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
  
	function getStatusDisplay(job) {
	  const status = job.generalData?.status;
	  if (!status) return '';
	  return status.toLowerCase() === 'bookmarked' ? 'bookmarked' : status;
	}
  </script>
  
  <main>
	<div class="table-container">
	  {#if loading}
		<p>Loading...</p>
	  {:else if error}
		<p class="error">{error}</p>
	  {:else if !user}
		<p>Please sign in to view your job list.</p>
	  {:else if jobData.length === 0}
		<p>No job data available.</p>
	  {:else}
		<table>
		  <thead>
			<tr>
			  <th>No.</th>
			  <th on:click={() => handleSort('generalData.status')}>
				Status {sortColumn === 'generalData.status' ? sortDirection === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('companyInfo.name')}>
				Company Name {sortColumn === 'companyInfo.name' ? sortDirection === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('jobInfo.jobTitle')}>
				Job Title {sortColumn === 'jobInfo.jobTitle' ? sortDirection === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('companyInfo.industry')}>
				Industry {sortColumn === 'companyInfo.industry' ? sortDirection === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('Score.totalScore')}>
				Score {sortColumn === 'Score.totalScore' ? sortDirection === 'asc' ? '▲' : '▼' : ''}
			  </th>
			  <th on:click={() => handleSort('generalData.timestamp')}>
				Date Added {sortColumn === 'generalData.timestamp' ? sortDirection === 'asc' ? '▲' : '▼' : ''}
			  </th>
			</tr>
		  </thead>
		  <tbody>
			{#each jobData as job, index}
			  <tr>
				<td>{index + 1}</td>
				<td>{getStatusDisplay(job)}</td>
				<td>{job.companyInfo?.name || 'N/A'}</td>
				<td>{job.jobInfo?.jobTitle || 'N/A'}</td>
				<td>{job.companyInfo?.industry || 'N/A'}</td>
				<td>{job.Score?.totalScore ? Math.round(job.Score.totalScore) : 'N/A'}</td>
				<td>{formatDate(job.generalData?.timestamp)}</td>
			  </tr>
			{/each}
		  </tbody>
		</table>
	  {/if}
	</div>
  </main>
  
  <style>
	.table-container {
	  width: 100%;
	  overflow-x: auto;
	}
  
	table {
	  width: 100%;
	  border-collapse: collapse;
	}
  
	th, td {
	  padding: 8px;
	  border: 1px solid #ddd;
	  text-align: left;
	}
  
	th {
	  cursor: pointer;
	  background-color: #f5f5f5;
	}
  
	tr:nth-child(even) {
	  background-color: #f9f9f9;
	}
  
	tr:hover {
	  background-color: #f0f0f0;
	}
  
	.error {
	  color: red;
	}
  </style>