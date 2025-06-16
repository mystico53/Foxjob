<!-- BatchJobsList.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { getFirestore, collection, getDocs, doc, getDoc, where, query } from 'firebase/firestore';
  import { fade } from 'svelte/transition';
  import EmailRequestDetails from './EmailRequestDetails.svelte';
  
  // Props
  export let selectedBatch = null;
  export let userId = null;
  
  // State
  let jobs = [];
  let isLoading = false;
  let error = null;
  let emailRequest = null;
  let isEmailExpanded = false;
  
  // Initialize DB
  const db = getFirestore();
  
  // Watch for changes in the selected batch
  $: if (selectedBatch && userId) {
    loadBatchJobs(selectedBatch, userId);
    loadEmailRequest(selectedBatch);
  } else {
    jobs = [];
    emailRequest = null;
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
  
  async function loadEmailRequest(batch) {
    if (!batch) {
      emailRequest = null;
      return;
    }
    
    console.log(`Loading email request for batch ${batch.id}`);
    
    try {
      // Track whether we found the email request
      let found = false;
      
      // First try to get emailRequestId directly from batch
      if (batch.emailRequestId) {
        console.log(`Batch has emailRequestId: ${batch.emailRequestId}`);
        const emailDoc = await getDoc(doc(db, 'emailRequests', batch.emailRequestId));
        if (emailDoc.exists()) {
          emailRequest = { id: emailDoc.id, ...emailDoc.data() };
          console.log(`Found email request by ID: ${emailDoc.id}`);
          found = true;
        } else {
          console.warn(`Email request with ID ${batch.emailRequestId} not found`);
        }
      } else {
        console.log('Batch does not have emailRequestId field');
      }
      
      // If not found, query the emailRequests collection by batchId
      if (!found) {
        console.log(`Querying emailRequests collection for batchId: ${batch.id}`);
        try {
          const emailQuery = query(
            collection(db, 'emailRequests'),
            where('batchId', '==', batch.id)
          );
          
          const querySnapshot = await getDocs(emailQuery);
          
          if (!querySnapshot.empty) {
            const emailDoc = querySnapshot.docs[0];
            emailRequest = { id: emailDoc.id, ...emailDoc.data() };
            console.log(`Found email request by batch ID query: ${emailDoc.id}`);
            found = true;
          } else {
            console.log(`No email requests found with batchId: ${batch.id}`);
          }
        } catch (queryErr) {
          console.error('Error querying email requests by batchId:', queryErr);
        }
      }
      
      // If still not found but emailSent is true, we'll show a message to the user
      if (!found) {
        if (batch.emailSent) {
          console.warn(`Batch ${batch.id} has emailSent=true but no email request found`);
        } else {
          console.log(`Batch ${batch.id} has emailSent=${batch.emailSent}, no email request expected`);
        }
        emailRequest = null;
      }
    } catch (err) {
      console.error('Error loading email request:', err);
      emailRequest = null;
    }
  }
</script>

<div class="card p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="h3">
      {selectedBatch ? `Jobs in Batch ${selectedBatch.id.substring(0, 8)}...` : 'Select a Batch to View Jobs'}
      {selectedBatch ? `(${jobs.length} of ${selectedBatch.jobIds?.length || 0})` : ''}
    </h2>
    
    {#if selectedBatch && selectedBatch.emailSent}
      <button 
        class="btn variant-soft-primary"
        on:click={() => isEmailExpanded = !isEmailExpanded}
      >
        {isEmailExpanded ? 'Hide Email' : 'Show Email'}
      </button>
    {/if}
  </div>
  
  <!-- Add email request info section -->
  {#if selectedBatch && selectedBatch.emailSent && isEmailExpanded}
    <EmailRequestDetails 
      emailRequest={emailRequest} 
      isExpanded={true}
    />
  {/if}
  
  <!-- Jobs list -->
  {#if isLoading}
    <div class="text-center py-4">
      <div class="spinner"></div>
      <p class="mt-2">Loading jobs...</p>
    </div>
  {:else if error}
    <div class="alert alert-error">
      {error}
    </div>
  {:else if jobs.length === 0}
    <div class="text-center py-4">
      <p class="text-surface-900-50-token">No jobs found in this batch.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each jobs as job}
        <div class="card variant-soft p-4">
          <h3 class="h4 mb-2">{job.title}</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Company:</strong></div>
            <div>{job.company}</div>
            
            <div><strong>Location:</strong></div>
            <div>{job.location}</div>
            
            <div><strong>Match Score:</strong></div>
            <div class="text-success-500">{job.finalScore}%</div>
            
            {#if job.url}
              <div><strong>URL:</strong></div>
              <div>
                <a href={job.url} target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:underline">
                  View Job
                </a>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style> 