<script>
  import { onMount, onDestroy } from 'svelte';
  import { auth } from '$lib/firebase';
  import { jobStore, sortedJobs, loading, error } from '$lib/jobStore';
  import JobCard from '$lib/JobCard.svelte';
  import CardDetails from '$lib/CardDetails.svelte';
  import SortControls from '$lib/SortControls.svelte';

  let currentUser = null;
  let selectedJob = null;
  let selectedJobIndex = -1;
  let sidebar;

  // Update selectedJob whenever sortedJobs changes to keep it in sync
  $: if (selectedJob && $sortedJobs) {
    const updatedJob = $sortedJobs.find(j => j.id === selectedJob.id);
    if (updatedJob) {
      selectedJob = updatedJob;
    }
  }

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
    selectedJob = job;
    selectedJobIndex = $sortedJobs.findIndex((j) => j.id === job.id);

    if (window.innerWidth <= 768) {
      sidebar.style.transform = 'translateX(-100%)';
    }
  }

  function handleNext(jobId) {
    if (selectedJobIndex < $sortedJobs.length - 1) {
      selectedJobIndex++;
      selectedJob = $sortedJobs[selectedJobIndex];
    }
  }

  function handlePrevious() {
    if (selectedJobIndex > 0) {
      selectedJobIndex--;
      selectedJob = $sortedJobs[selectedJobIndex];
    }
  }

  async function toggleStar(jobId) {
    try {
      if (!currentUser?.uid) throw new Error('No user logged in');
      const jobToUpdate = $sortedJobs.find(j => j.id === jobId);
      if (!jobToUpdate) throw new Error('Job not found');
      
      const newStatus = jobToUpdate.generalData?.status?.toLowerCase() === 'starred' ? 'read' : 'starred';
      await jobStore.updateStatus(currentUser.uid, jobId, newStatus);
      // The store will automatically update through Firebase onSnapshot
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  }

async function hideJobAndNext(jobId) {
  try {
    if (!currentUser?.uid) throw new Error('No user logged in');
    await jobStore.hideJob(currentUser.uid, jobId);
    handleNext(jobId);
  } catch (error) {
    console.error('Error hiding job:', error);
  }
}

  function openJobLink(url) {
      window.open(url, '_blank');
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

<!-- Main Content -->
<div class="flex flex-col md:flex-row h-[calc(100vh-64px)] w-full fixed top-[64px] left-0">
  <!-- Sidebar -->
  <aside
    class="w-full md:w-80 h-full border-r overflow-y-auto bg-surface-100 transition-transform transform md:translate-x-0"
    bind:this={sidebar}
  >
    <SortControls />
    <div class="p-4">
      {#if $loading}
        <div class="flex justify-center p-4">
          <span class="loading loading-spinner loading-lg text-primary-500"></span>
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
                timestamp={job.generalData?.timestamp?.toDate()}
                handleClick={() => handleJobClick(job)}
                isSelected={selectedJob?.id === job.id}
            />
          {/each}
        </div>
      {:else if !$loading}
        <div class="text-center text-surface-400 p-4">
          No jobs found.
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main content area -->
  <main class="flex-1 p-4 overflow-y-auto bg-surface-100">
    {#if selectedJob}
      <CardDetails
        job={selectedJob}
        handleNext={handleNext}
        previousJob={handlePrevious}
        isFirstJob={selectedJobIndex === 0}
        isLastJob={selectedJobIndex === $sortedJobs.length - 1}
        toggleStar={toggleStar}
        hideJobAndNext={hideJobAndNext}
        openJobLink={openJobLink}
      />
    {:else}
      <div class="flex items-center justify-center h-full">
        <div class="text-surface-400 text-center">
          <div class="text-4xl mb-2">👈</div>
          <div>Select a job to view details</div>
        </div>
      </div>
    {/if}
  </main>
</div>

<!-- Mobile navigation button -->
<button
  class="md:hidden fixed bottom-4 right-4 z-20 bg-primary-500 text-white p-3 rounded-full shadow-lg"
  on:click={handleMobileNav}
>
  {#if selectedJob}
    <!-- Left Arrow Icon -->
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
  {:else}
    <!-- Right Arrow Icon -->
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  {/if}
</button>

<style>
  /* Remove custom styles unless necssary */
</style>