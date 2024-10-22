<script>
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { auth } from '$lib/firebase';
  import { jobStore } from '$lib/jobStore';
  
  export let job = {};
  export let handleNext;
  export let previousJob;
  export let isFirstJob;
  export let isLastJob;
  export let toggleStar;
  export let openJobLink;
  export let hideJobAndNext; // Added missing prop
  
  let isHiding = false;
  let currentStatus = job?.generalData?.status?.toLowerCase() || '';
  let showDescription = false; // State for toggling description

  // Update currentStatus whenever job changes
  $: if (job?.generalData?.status) {
    currentStatus = job.generalData.status.toLowerCase();
  }

  function formatDate(timestamp) {
      if (timestamp && timestamp.toDate) {
          const date = timestamp.toDate();
          return date.toLocaleString();
      }
      return 'N/A';
  }

  async function handleHide() { 
      try {
          isHiding = true;
          const userId = auth.currentUser?.uid;
          if (!userId) throw new Error('No user logged in');
          
          await jobStore.hideJob(userId, job.id);
          await hideJobAndNext(job.id); // Updated to use the correct prop
      } catch (error) {
          console.error('Error hiding job:', error);
      } finally {
          isHiding = false;
      }
  }

  async function handleStarToggle() {
      try {
          const newStatus = currentStatus === 'starred' ? 'read' : 'starred';
          await toggleStar(job.id);
          // Don't update local state immediately - let it update through the store
      } catch (error) {
          console.error('Error toggling star:', error);
      }
  }

  async function handleVisitJob() {
      if (job.generalData?.url) {
          openJobLink(job.generalData.url);
      }
  }

  function toggleDescription() {
    showDescription = !showDescription;
  }
</script>



<!-- Main card content -->
<div class="card p-6 max-w-4xl mx-auto space-y-8 mb-20">
  <!-- Header Section -->
  <div class="flex justify-between items-start">
    <!-- Company Info -->
    <div>
      <h1 class="h1">{job.companyInfo?.name || 'N/A'}</h1>
      <h2 class="h5 text-surface-600">{job.jobInfo?.jobTitle || 'N/A'}</h2>
      <!-- Meta Information -->
      <div class="flex flex-wrap gap-2 mt-4">
        <span class="chip variant-ghost-success inline-flex items-center gap-2">
          <iconify-icon icon="solar:buildings-3-bold"></iconify-icon>
          {job.companyInfo?.industry || 'N/A'}
        </span>
        <span class="chip variant-ghost-surface">
          <iconify-icon icon="solar:pin-bold"></iconify-icon>
          {job.jobInfo?.remoteType || 'N/A'}
        </span>
        <span class="chip variant-ghost-secondary">
          <iconify-icon icon="solar:money-bag-bold"></iconify-icon>
          {job.compensation || 'N/A'}
        </span>
        <span class="chip variant-ghost-primary">
          <iconify-icon icon="solar:calendar-mark-linear"></iconify-icon>
          {formatDate(job.generalData?.timestamp)}
        </span>
        {#if job.generalData?.status}
          <span class="chip bg-gradient-to-br variant-gradient-primary-secondary">
            <iconify-icon icon="solar:folder-with-files-bold"></iconify-icon>
            {currentStatus}
          </span>
        {/if}
      </div>
    </div>
    <!-- Radial Progress Score Display -->
    {#if job.matchResult?.totalScore !== undefined}
    <div class="flex items-center">
      <ProgressRadial 
        class="w-12"
        stroke={60} 
        font={150} 
        strokeLinecap=round 
        value={Math.round(job.matchResult.totalScore)}>
        {Math.round(job.matchResult.totalScore)}
      </ProgressRadial>
    </div>
    {/if}
  </div>

  <div class="flex gap-2">
    <button
      class="btn variant-filled-primary"
      on:click={handleVisitJob}
      disabled={isHiding}
    >
      Visit Job
    </button>
    <button
      class="btn variant-filled-secondary"
      on:click={toggleDescription}
    >
      {showDescription ? 'Show Match Results' : 'Show Description'}
    </button>
  </div>

  {#if !showDescription}
    <!-- Match Results Table -->
    {#if job.matchResult}
      <div class="card p-4">
        <h3 class="h5 mb-4">Match Results</h3>
        <table class="table table-hover">
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
                <td>{Math.round(skill.score)}</td>
                <td>{skill.assessment}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else}
    <!-- Description Section -->
    <div class="card p-4">
      <h3 class="h5 mb-4">Job Description</h3>
      <div class="prose max-w-none">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
          nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
    </div>
  {/if}
</div>

<!-- Fixed position action buttons -->
<div class="md:ml-80 fixed bottom-0 left-0 right-0 bg-surface-100 border-t p-4 z-10">
    <div class="max-w-4xl mx-auto flex gap-2 flex-wrap justify-center">
        <button
          class="btn variant-primary flex items-center gap-2"
          on:click={previousJob}
          disabled={isFirstJob || isHiding}
          >
          <iconify-icon icon="solar:map-arrow-left-bold"></iconify-icon>
        </button>
        
        <button
          class="btn variant-soft"
          on:click={handleHide}
          disabled={isHiding}
        >
          {isHiding ? 'Archiving...' : 'Not relevant'}
        </button>

        <button
          class="btn variant-filled"
          on:click={handleStarToggle}
          disabled={isHiding}
        >
          {#if currentStatus === 'starred'}
            Saved
          {:else}
            Save
          {/if}
        </button>

        <button
          class="btn variant-primary flex items-center gap-2"
          on:click={() => handleNext(job.id)}
          disabled={isLastJob || isHiding}
        >
          <iconify-icon icon="solar:map-arrow-right-bold"></iconify-icon>
        </button>
    </div>
</div>