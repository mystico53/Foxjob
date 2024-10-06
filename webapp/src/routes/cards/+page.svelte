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
            const jobs = querySnapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    hidden: doc.data().hidden || false
                }))
                .filter((job) => !job.hidden);

            // Fetch scores for each job in parallel
            const jobsWithScores = await Promise.all(jobs.map(async (job) => {
                try {
                    const scoreDocRef = doc(db, 'users', user.uid, 'jobs', job.id, 'score', 'document');
                    const scoreDoc = await getDoc(scoreDocRef);
                    if (scoreDoc.exists()) {
                        return { ...job, matchResult: scoreDoc.data() };
                    } else {
                        return job; // No score available
                    }
                } catch (err) {
                    console.error(`Error fetching score for job ${job.id}:`, err);
                    return job; // Proceed without score
                }
            }));

            jobData = jobsWithScores;
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
            const processedRef = collection(db, 'users', user.uid, 'processed');
            const querySnapshot = await getDocs(processedRef);

            if (querySnapshot.empty) {
                alert('No jobs to delete.');
                deleting = false;
                return;
            }

            let batch = writeBatch(db);
            let count = 0;
            const promises = [];

            querySnapshot.forEach((docSnapshot) => {
                batch.delete(docSnapshot.ref);
                count++;

                if (count === 500) {
                    promises.push(batch.commit());
                    batch = writeBatch();
                    count = 0;
                }
            });

            if (count > 0) {
                promises.push(batch.commit());
            }

            await Promise.all(promises);
            await fetchJobData();
        } catch (err) {
            console.error('Error deleting all jobs:', err);
            error = 'Failed to delete all jobs. Please try again.';
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
        
                    <!-- Card Footer -->
                    <div class="card-footer">
                        <button on:click={() => hideJob(job.id)} class="hide-button">Hide</button>
                        <button on:click={() => openJobLink(job.url)} class="view-button">View Job</button>
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
									{#each job.matchResult.keySkills as skill}
										<tr>
											<td>{skill.skill}</td>
											<td>{skill.score}</td>
											<td>{skill.assessment}</td>
										</tr>
									{/each}
									<tr>
										<td><strong>Total Score</strong></td>
										<td><strong>{job.matchResult.totalScore}</strong></td>
										<td>{job.matchResult.summary}</td>
									</tr>
								</tbody>
							</table>
						</div>
					{/if}
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

	.match-button {
        padding: 10px 20px;
        border: none;
        border-radius: 25px;
        font-size: 1rem;
        cursor: pointer;
        background-color: #3182ce; /* Blue color */
        color: white;
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
    }

	.match-button:hover {
        background-color: #2b6cb0; /* Darker blue on hover */
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
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
