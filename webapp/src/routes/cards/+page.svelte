<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { signOut } from 'firebase/auth';
    import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
    import { goto } from '$app/navigation';

    let user = null;
    let jobData = [];
    let loading = true;
    let deleting = false;
    let error = null;
    let sortColumn = 'timestamp';
    let sortDirection = 'desc';

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            user = currentUser;
            if (user) {
                await fetchJobData();
                testReadJobs();
                //await listUserCollections();
            } else {
                loading = false;
            }
        });

        return () => unsubscribe();
    });

    async function testReadJobs() {
  try {
    const jobsRef = collection(db, 'users', 'VCvUK0pLeDVXJ0JHJsNBwxLgvdO2', 'jobs');
    const jobsSnapshot = await getDocs(jobsRef);
    console.log(`Test Read: Retrieved ${jobsSnapshot.size} job(s)`);
    jobsSnapshot.forEach((doc) => {
      console.log(`Job ID: ${doc.id}`, doc.data());
    });
  } catch (error) {
    console.error('Test Read: Error fetching jobs:', error);
  }
}

async function fetchJobData() {
    console.log('fetchJobData: Function started');
    loading = true;       // Indicate loading state
    error = null;         // Reset any previous errors
    jobData = [];         // Initialize jobData array

    try {
        // Step 1: Reference to the 'jobs' collection under the current user
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        console.log(`fetchJobData: Created reference to jobs collection for user ID: ${user.uid}`);

        // Step 2: Fetch all job documents
        console.log('fetchJobData: Fetching job documents...');
        const jobsSnapshot = await getDocs(jobsRef);
        console.log(`fetchJobData: Retrieved ${jobsSnapshot.size} job(s)`);

        if (jobsSnapshot.empty) {
            console.log('fetchJobData: No jobs found for the user.');
            return; // Exit early if no jobs are found
        }

        // Extract job documents
        const jobDocs = jobsSnapshot.docs;
        console.log(`fetchJobData: Processing ${jobDocs.length} job document(s)`);

        // Step 3: Iterate over each job document to extract necessary fields
        const jobPromises = jobDocs.map(async (jobDoc, index) => {
            console.log(`fetchJobData: Processing job ${index + 1}/${jobDocs.length} with ID: ${jobDoc.id}`);
            try {
                const jobDataRaw = jobDoc.data();

                // Access 'summarized' field (ensure correct spelling)
                const summarizedData = jobDataRaw.summarized || jobDataRaw.sumamrized; // Handle both spellings

                if (!summarizedData) {
                    console.log(`fetchJobData: No summarized data found for job ID: ${jobDoc.id}`);
                    return null; // Skip this job if no summarized data
                }

                // Access 'Score' field
                const scoreData = jobDataRaw.Score;
                if (!scoreData) {
                    console.log(`fetchJobData: No score data found for job ID: ${jobDoc.id}`);
                    return null; // Skip this job if no score data
                }

                // Process Score Data into matchResult
                const matchResult = {
                    keySkills: [],
                    totalScore: scoreData.totalScore || 0, // Use existing totalScore
                    summary: scoreData.summary || ''
                };

                // Iterate over each requirement in Score
                Object.keys(scoreData).forEach(key => {
                    if (key.startsWith('Requirement')) {
                        const req = scoreData[key];
                        matchResult.keySkills.push({
                            skill: req.requirement,
                            score: req.score,
                            assessment: req.assessment
                        });
                        // Optionally, you can still accumulate individual scores if needed
                        // matchResult.totalScore += req.score;
                    }
                });

                // Structure the job data as per frontend requirements
                return {
                    id: jobDoc.id,
                    ...summarizedData, // Spread summarized fields
                    ...jobDataRaw,     // Include any additional fields from the main job document if necessary
                    matchResult: matchResult,
                    generalData: {
                        timestamp: jobDataRaw.timestamp,
                        url: jobDataRaw.url
                    }
                };
            } catch (jobError) {
                console.error(`fetchJobData: Error processing job ID ${jobDoc.id}:`, jobError);
                // Continue processing other jobs even if one fails
                return null;
            }
        });

        // Step 4: Await all job data fetches in parallel
        console.log('fetchJobData: Initiating parallel fetch of job data for all jobs...');
        const jobResults = await Promise.all(jobPromises);
        console.log('fetchJobData: All job data fetched');

        // Step 5: Filter out any null results (jobs that failed to fetch)
        jobData = jobResults.filter(job => job !== null);
        console.log(`fetchJobData: Aggregated total of ${jobData.length} job data entries`);

        if (jobData.length === 0) {
            console.log('fetchJobData: No job data available after processing.');
        }

        // Step 6: Sort the aggregated job data
        console.log(`fetchJobData: Sorting job data by column: ${sortColumn}, direction: ${sortDirection}`);
        sortData(sortColumn, sortDirection);
        console.log('fetchJobData: Sorting completed');

    } catch (err) {
        console.error('fetchJobData: Error fetching job data:', err);
        error = 'Failed to fetch job data. Please try again later.';
    } finally {
        loading = false; // Loading is complete
        console.log('fetchJobData: Function completed, loading set to false');
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

    async function deleteAllJobs() {
    if (!user) {
        alert('You must be logged in to perform this action.');
        return;
    }

    const confirmation = confirm('Are you sure you want to delete all your jobs? This action cannot be undone.');
    if (!confirmation) return;

    deleting = true;
    error = null;

    try {
        console.log('Attempting to delete jobs...');
        
        // Check both 'jobs' and 'processed' collections
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        const processedRef = collection(db, 'users', user.uid, 'processed');

        const jobsSnapshot = await getDocs(jobsRef);
        const processedSnapshot = await getDocs(processedRef);

        console.log(`Found ${jobsSnapshot.size} documents in 'jobs' collection`);
        console.log(`Found ${processedSnapshot.size} documents in 'processed' collection`);

        if (jobsSnapshot.empty && processedSnapshot.empty) {
            alert('No jobs to delete.');
            deleting = false;
            return;
        }

        let batch = writeBatch(db);
        let count = 0;
        const promises = [];

        const deleteDocuments = (snapshot) => {
            snapshot.forEach((docSnapshot) => {
                console.log(`Deleting document: ${docSnapshot.ref.path}`);
                batch.delete(docSnapshot.ref);
                count++;

                if (count === 500) {
                    promises.push(batch.commit());
                    batch = writeBatch(db);
                    count = 0;
                }
            });
        };

        deleteDocuments(jobsSnapshot);
        deleteDocuments(processedSnapshot);

        if (count > 0) {
            promises.push(batch.commit());
        }

        await Promise.all(promises);
        console.log('Deletion completed');
        await fetchJobData();
    } catch (err) {
        console.error('Error deleting jobs:', err);
        console.error('Error details:', err.code, err.message);
        error = 'Failed to delete jobs. Please try again.';
    } finally {
        deleting = false;
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
	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if user}
	<div class="header">
		<h1>Job List</h1>
		<div class="header-buttons">
			<button on:click={deleteAllJobs} class="delete-button" disabled={deleting}>
				{deleting ? 'Deleting...' : 'Delete All Jobs'}
			</button>
			<button on:click={handleLogout} class="logout-button">Log Out</button>
		</div>
	</div>

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
                    <!-- Card Header -->
                    <div class="card-header">
                        <!-- Company Name and Timestamp -->
                        <div class="header-top">
                            <h2>{job.companyInfo?.name || 'N/A'} - {job.jobInfo?.jobTitle || 'N/A'}</h2>
                            <span class="badge">{formatDate(job.timestamp)}</span>
                        </div>
        
                        <!-- Industry, Remote Type, Compensation in one row -->
                        <div class="header-meta">
                            <span class="badge">🚀 {job.companyInfo?.industry || 'N/A'}</span>
                            <span class="badge">📍 {job.jobInfo?.remoteType || 'N/A'}</span>
                            <span class="badge">💰 {job.compensation || 'N/A'}</span>
                        </div>
        
                        <!-- Company Focus -->
                        <p class="company-focus">About: {job.companyInfo?.companyFocus || 'N/A'}</p>
                        <p class="company-focus">Job: {job.jobInfo?.jobSummary || 'N/A'}</p>
                    </div>
        
                    <!-- Job Info -->
                    <div class="card-content">
                        <div class="skills-grid">
                            <div>
                                <h4>✅ What you'll do</h4>
                                <ul>
                                    {#each job.areasOfFun as area}
                                        <li>{area}</li>
                                    {/each}
                                </ul>
                            </div>
                            <div>
                                <h4>❓ Mandatory Skills</h4>
                                <ul>
                                    {#each job.mandatorySkills as skill}
                                        <li>{skill}</li>
                                    {/each}
                                </ul>
                            </div>
                        </div>
                    </div>
    					<!-- Match Results -->
					{#if job.matchResult}
						<div class="match-results">
							<h3>Match Results</h3>
							<table>
								<thead>
									<tr>
										<th>Key Skill</th>
										<th>Score</th>
										<th>Assessment</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td><strong>Total Score</strong></td>
										<td><strong>{job.matchResult.totalScore}</strong></td>
										<td>{job.matchResult.summary}</td>
									</tr>
                                    {#each job.matchResult.keySkills as skill}
										<tr>
											<td>{skill.skill}</td>
											<td>{skill.score}</td>
											<td>{skill.assessment}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
                    <div class="card-footer">
                        <button on:click={() => hideJob(job.id)} class="hide-button">Hide</button>
                        <button on:click={() => openJobLink(job.url)} class="view-button">View Job</button>
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
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		font-family: 'Helvetica Neue', Arial, sans-serif;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

    .header-meta {
		padding: 10px;
        display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.card-container {
		margin-top: 20px;
	}

	.card {
		background-color: #fff;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 20px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	}

	.card-header {
		background-color: #f0f0f0;
		padding: 20px;
		position: relative;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
        padding: 10px;
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1a1a1a;
	}

	.badge {
		background-color: #e2e8f0;
		padding: 5px 10px;
		border-radius: 15px;
		font-size: 0.8rem;
		color: #4a5568;
	}

	.company-focus {
		margin-top: 10px;
		font-size: 1.1rem;
		color: #4a5568;
	}

	.card-content {
		padding: 20px;
	}


	.skills-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.skills-grid h4 {
		font-weight: 600;
		margin-bottom: 10px;
		color: #1a1a1a;
	}

	.skills-grid ul {
		list-style-type: disc;
		padding-left: 20px;
		margin: 0;
		color: #1a1a1a;
		line-height: 1.6;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		padding: 15px;
		border-top: 1px solid #e2e8f0;
	}

	.hide-button,
	.view-button {
		padding: 10px 20px;
		border: none;
		border-radius: 25px;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.3s ease, box-shadow 0.3s ease;
	}

	.hide-button {
		background-color: #fff;
		color: #2d3748;
		border: 1px solid #cbd5e0;
	}

	.hide-button:hover {
		background-color: #f7fafc;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	}

	.view-button {
		background-color: #1a202c;
		color: white;
	}

	.view-button:hover {
		background-color: #2d3748;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
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

	.delete-button,
    .logout-button {
        padding: 10px 20px;
        border: none;
        border-radius: 25px;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
    }

    .delete-button {
        background-color: #dfbcbc; /* Red color */
        color: white;
    }

    .delete-button:hover {
        background-color: #dfbcbc; /* Darker red on hover */
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .delete-button:disabled {
        background-color: #795757;
        cursor: not-allowed;
    }

    .logout-button {
        background-color: #a0aec0; /* Gray color */
        color: white;
    }

    .logout-button:hover {
        background-color: #718096; /* Darker gray on hover */
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

	@media (max-width: 768px) {
		.card {
			margin-left: 10px;
			margin-right: 10px;
		}

		.skills-grid {
			grid-template-columns: 1fr;
		}
	}

	.match-results {
		margin-top: 20px;
		padding: 15px;
		background-color: #f8f9fa;
		border-radius: 8px;
	}

	.match-results h3 {
		margin-bottom: 10px;
		font-size: 1.2rem;
		color: #2d3748;
	}

	.match-results table {
		width: 100%;
		border-collapse: collapse;
	}

	.match-results th,
	.match-results td {
		padding: 8px;
		border: 1px solid #e2e8f0;
		text-align: left;
	}

	.match-results th {
		background-color: #edf2f7;
		font-weight: 600;
	}
</style>
