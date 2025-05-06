<!-- BatchJobsList.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { getFirestore, collection, getDocs, doc, getDoc, where, query } from 'firebase/firestore';
  import { fade } from 'svelte/transition';
  
  // Props
  export let selectedBatch = null;
  export let userId = null;
  
  // State
  let jobs = [];
  let isLoading = false;
  let error = null;
  let emailRequest = null;
  
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
  <h2 class="h3 mb-4">
    {selectedBatch ? `Jobs in Batch ${selectedBatch.id.substring(0, 8)}...` : 'Select a Batch to View Jobs'}
    {selectedBatch ? `(${jobs.length} of ${selectedBatch.jobIds?.length || 0})` : ''}
  </h2>
  
  <!-- Add email request info section -->
  {#if selectedBatch && selectedBatch.emailSent}
    <div class="card variant-soft-primary p-4 mb-4">
      <h3 class="h4 mb-2">Email Status</h3>
      {#if emailRequest}
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Email ID:</strong></div>
          <div>{emailRequest.id}</div>
          
          <div><strong>Status:</strong></div>
          <div class={
            emailRequest.status === 'sent' ? 'text-success-500' :
            emailRequest.status === 'error' ? 'text-error-500' :
            emailRequest.status === 'pending' ? 'text-warning-500' :
            'text-surface-900-50-token'
          }>
            {emailRequest.status || 'Unknown'}
          </div>
          
          <div><strong>Recipient:</strong></div>
          <div>{emailRequest.to || 'Unknown'}</div>
          
          <div><strong>Sent At:</strong></div>
          <div>{emailRequest.sentAt ? new Date(emailRequest.sentAt.toDate()).toLocaleString() : 'N/A'}</div>
          
          <div><strong>Opened:</strong></div>
          <div class={emailRequest.opened ? 'text-success-500' : 'text-surface-900-50-token'}>
            {emailRequest.opened ? `Yes (${emailRequest.openCount || 1} times)` : 'No'}
          </div>
          
          <div><strong>Clicked:</strong></div>
          <div class={emailRequest.clicked ? 'text-success-500' : 'text-surface-900-50-token'}>
            {emailRequest.clicked ? `Yes (${emailRequest.clickCount || 1} times)` : 'No'}
          </div>
          
          <div><strong>Delivery:</strong></div>
          <div class={
            emailRequest.bounced ? 'text-error-500' :
            emailRequest.delivered ? 'text-success-500' :
            'text-surface-900-50-token'
          }>
            {emailRequest.bounced ? 'Bounced' : 
             emailRequest.dropped ? 'Dropped' :
             emailRequest.delivered ? 'Delivered' :
             emailRequest.deferred ? 'Deferred' :
             emailRequest.processed ? 'Processed' : 'Unknown'}
          </div>
        </div>
      {:else}
        <p>Email was sent, but no email record found.</p>
      {/if}
    </div>
  {/if}
  
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