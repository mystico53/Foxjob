<script>
  import { onMount, onDestroy } from 'svelte';
  import { auth } from '$lib/firebase';
  import { jobStore, sortedJobs, loading, error } from '$lib/jobStore';
  import JobCard from '$lib/JobCard.svelte';
  
  let currentUser = null;
  
  onMount(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
          currentUser = user;
          if (user) {
              jobStore.init(user.uid);
          }
      });
      
      return () => {
          unsubscribe();
          jobStore.cleanup();
      };
  });
  
  function handleJobClick(job) {
      console.log('Job clicked:', job);
      // Add your navigation or detail view logic here
  }
</script>

<!-- Your navbar remains at its current position -->
<slot name="header" />

<!-- Main content area below navbar -->
<div class="page-content">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="p-4">
      <h1 class="h3 mb-6">Job Workflow</h1>
      
      {#if $error}
        <div class="alert variant-filled-error">
          {$error}
        </div>
      {/if}
      
      {#if $loading}
        <div class="flex justify-center p-4">
          <div class="loading loading-spinner loading-md" />
        </div>
      {/if}
      
      {#if $sortedJobs && $sortedJobs.length > 0}
        <div class="flex flex-col gap-4">
          {#each $sortedJobs as job (job.id)}
            <JobCard
              companyName={job.companyInfo?.name || 'Unknown Company'}
              jobTitle={job.jobInfo?.jobTitle || 'No Title'}
              score={job.Score?.totalScore}
              status={job.generalData?.status}
              handleClick={() => handleJobClick(job)}
            />
          {/each}
        </div>
      {:else if !$loading}
        <div class="text-center text-surface-400-500-token p-4">
          No jobs found.
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main content area -->
  <main class="main-content">
    <!-- Your main content goes here -->
    <div class="placeholder">Select a job to view details</div>
  </main>
</div>

<style>
  /* Assuming your navbar height is 64px - adjust this value to match your navbar height */
  :global(body) {
    overflow-y: hidden;
  }

  .page-content {
    display: flex;
    height: calc(100vh - 64px); /* Adjust 64px to match your navbar height */
    width: 100%;
    position: fixed;
    top: 64px; /* Adjust to match your navbar height */
    left: 0;
  }

  .sidebar {
    width: 20rem; /* 320px */
    height: 100%;
    border-right: 1px solid var(--color-surface-300);
    overflow-y: auto;
    background: var(--color-surface-100);
  }

  .main-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    background: var(--color-surface-100);
  }

  /* For mobile responsiveness */
  @media (max-width: 768px) {
    .sidebar {
      width: 100%;
      position: fixed;
      left: 0;
      z-index: 10;
    }

    .main-content {
      margin-left: 0;
    }
  }
</style>