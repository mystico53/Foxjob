<script>
    import { onMount } from 'svelte';
    import { scrapeStore, isLoading, totalJobs, currentBatch, initJobListener } from '$lib/stores/scrapeStore'
    
    let jobs = []
    
    scrapeStore.subscribe(value => {
      jobs = value;
      console.log('💫 Component received jobs update:', value.length);
    })
    
    onMount(() => {
      console.log('🏁 Component mounted, initializing listener');
      const unsubscribe = initJobListener('test_user');
      return unsubscribe;
    });
    
    function handleClick() {
      console.log('🔄 Reload button clicked');
      isLoading.set(true);
      initJobListener('test_user');
    }
</script>

<div class="container">
    <button 
      on:click={handleClick}
      class="load-button" 
      disabled={$isLoading}
    >
      {$isLoading ? 'Loading...' : 'Load Jobs'}
    </button>

    {#if $isLoading}
      <p>Loading data...</p>
    {:else if jobs.length === 0}
      <p>No jobs found</p>
    {:else}
      <div class="stats">
        <p>Total Jobs: {$totalJobs}</p>
        <p>Current Batch: {$currentBatch}</p>
      </div>
      
      <div class="jobs-list">
        {#each jobs as job (job.id)}
          <div class="job-card">
            <h3>{job.basicInfo?.title || 'No Title'}</h3>
            <p class="company">{job.basicInfo?.company || 'Unknown Company'}</p>
            <p class="location">{job.basicInfo?.location || 'Location not specified'}</p>
            <p class="posted">Posted: {new Date(job.searchMetadata?.processingDate).toLocaleDateString()}</p>
            {#if job.details?.employmentType}
              <p class="employment-type">{job.details.employmentType}</p>
            {/if}
            {#if job.details?.numApplicants}
              <p class="applicants">{job.details.numApplicants} applicants</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
</div>

<style>
    .container {
      padding: 1rem;
    }
    
    .load-button {
      padding: 0.5rem 1rem;
      margin-bottom: 1rem;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .load-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .stats {
      margin-bottom: 1rem;
    }
    
    .jobs-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    .job-card {
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .job-card h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
    }
    
    .job-card p {
      margin: 0.25rem 0;
      color: #666;
    }

    .company {
      font-weight: 500;
      color: #34495e;
    }

    .location {
      color: #7f8c8d;
    }

    .employment-type {
      display: inline-block;
      background-color: #e8f5e9;
      color: #2e7d32;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .applicants {
      font-size: 0.875rem;
      color: #95a5a6;
    }
</style>