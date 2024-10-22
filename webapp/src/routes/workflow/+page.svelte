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

<div class="container mx-auto p-4 space-y-4">
  <h1 class="text-2xl font-bold mb-6">Job Workflow</h1>
  
  {#if $error}
      <div class="p-4 bg-red-100 text-red-700 rounded">
          {$error}
      </div>
  {/if}
  
  {#if $loading}
      <div class="p-4 text-center">
          Loading jobs...
      </div>
  {/if}
  
  {#if $sortedJobs && $sortedJobs.length > 0}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      <div class="p-4 text-center text-gray-500">
          No jobs found.
      </div>
  {/if}
</div>