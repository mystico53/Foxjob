<!-- BatchJobsList.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
  import { fade } from 'svelte/transition';
  
  // Props
  export let selectedBatch = null;
  export let userId = null;
  
  // State
  let jobs = [];
  let isLoading = false;
  let error = null;
  
  // Initialize DB
  const db = getFirestore();
  
  // Watch for changes in the selected batch
  $: if (selectedBatch && userId) {
    loadBatchJobs(selectedBatch, userId);
  } else {
    jobs = [];
  }
  
  async function loadBatchJobs(batch, userId) {
    if (!batch || !batch.jobIds || !userId) {
      jobs = [];
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      // Fetch jobs by their IDs from the batch
      const jobPromises = batch.jobIds.map(jobId => 
        getDoc(doc(db, 'users', userId, 'scrapedJobs', jobId))
      );
      
      const jobSnapshots = await Promise.all(jobPromises);
      
      // Process the job data
      jobs = jobSnapshots
        .filter(doc => doc.exists()) // Filter out any that don't exist
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || data.basicInfo?.title || 'No Title',
            company: data.basicInfo?.company || 'Unknown Company',
            finalScore: data.match?.final_score || 0,
            // Additional fields that might be useful
            location: data.basicInfo?.location || 'No Location',
            url: data.basicInfo?.url || '',
            // Raw data for debugging
            rawData: data
          };
        });
      
      isLoading = false;
    } catch (err) {
      console.error('Error loading batch jobs:', err);
      error = `Failed to load jobs: ${err.message}`;
      isLoading = false;
    }
  }
</script>

<div class="card p-4">
  <h2 class="h3 mb-4">
    {selectedBatch ? `Jobs in Batch ${selectedBatch.id.substring(0, 8)}...` : 'Select a Batch to View Jobs'}
    {selectedBatch ? `(${jobs.length} of ${selectedBatch.jobIds?.length || 0})` : ''}
  </h2>
  
  {#if isLoading}
    <div class="p-4 text-center">Loading jobs...</div>
  {:else if error}
    <div class="p-4 bg-error-500/20 text-error-500 rounded">
      {error}
    </div>
  {:else if !selectedBatch}
    <div class="p-4 text-center">
      <p>Select a batch from the table to view its jobs.</p>
    </div>
  {:else if jobs.length === 0}
    <div class="p-4 text-center">
      <p>No jobs found in this batch.</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="table table-compact w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Job Title</th>
            <th>Company</th>
            <th>Location</th>
            <th>Match Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each jobs as job}
            <tr transition:fade={{duration: 200}}>
              <td title={job.id}>{job.id.substring(0, 8)}...</td>
              <td>{job.title}</td>
              <td>{job.company}</td>
              <td>{job.location}</td>
              <td class="font-semibold {job.finalScore >= 80 ? 'text-success-500' : 
                          job.finalScore >= 60 ? 'text-warning-500' : 'text-error-500'}">
                {Math.round(job.finalScore * 100) / 100}
              </td>
              <td>
                {#if job.url}
                  <a href={job.url} target="_blank" rel="noopener noreferrer" 
                     class="btn btn-sm variant-soft">
                    View Job
                  </a>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div> 