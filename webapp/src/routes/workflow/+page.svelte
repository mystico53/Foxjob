<script>
  import { onMount, onDestroy } from 'svelte';
  import { auth } from '$lib/firebase';
  import { jobStore, sortedJobs, loading, error } from '$lib/jobStore';
  import JobCard from '$lib/JobCard.svelte';
  import JobDetails from '$lib/CardDetails.svelte';  // Add this import
  
  let currentUser = null;
  let selectedJob = null;  // Add this state
  
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
      selectedJob = job;  // Update selected job when clicked
      
      // For mobile: hide sidebar when a job is selected
      if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) {
              sidebar.style.transform = 'translateX(-100%)';
          }
      }
  }

  // Add mobile navigation handler
  function handleMobileNav() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
          const isHidden = sidebar.style.transform === 'translateX(-100%)';
          sidebar.style.transform = isHidden ? 'translateX(0)' : 'translateX(-100%)';
      }
  }
</script>

<!-- Your navbar remains at its current position -->
<slot name="header" />

<!-- Mobile navigation button -->
<button 
    class="md:hidden fixed bottom-4 right-4 z-20 bg-primary-500 text-white p-3 rounded-full shadow-lg"
    on:click={handleMobileNav}
>
    {#if selectedJob}
        <span class="text-xl">←</span>
    {:else}
        <span class="text-xl">→</span>
    {/if}
</button>

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
    {#if selectedJob}
        <JobDetails
            companyName={selectedJob.companyInfo?.name || 'Unknown Company'}
            jobTitle={selectedJob.jobInfo?.jobTitle || 'No Title'}
            score={selectedJob.Score?.totalScore}
            status={selectedJob.generalData?.status}
            companyInfo={selectedJob.companyInfo}
            jobInfo={selectedJob.jobInfo}
            generalData={selectedJob.generalData}
        />
    {:else}
        <div class="flex items-center justify-center h-full">
            <div class="text-surface-400-500-token text-center">
                <div class="text-4xl mb-2">👈</div>
                <div>Select a job to view details</div>
            </div>
        </div>
    {/if}
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
    transition: transform 0.3s ease-in-out;
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