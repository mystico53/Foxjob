<script>
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    
    export let job = {};
    export let handleNext;
    export let previousJob;
    export let isFirstJob;
    export let isLastJob;
    export let toggleStar;
    export let hideJobAndNext;
    export let openJobLink;
    
    let isHiding = false;

    function formatDate(timestamp) {
        if (timestamp && timestamp.toDate) {
            const date = timestamp.toDate();
            return date.toLocaleString();
        }
        return 'N/A';
    }

    async function handleHide() { 
        isHiding = true;
        await hideJobAndNext(job.id);
        isHiding = false;
    }

    async function handleVisitJob() {
        if (job.generalData?.url) {
            openJobLink(job.generalData.url);
        }
    }
</script>

<!-- Main card content -->
<div class="card p-6 max-w-4xl mx-auto space-y-8 mb-20"> <!-- Added margin bottom to prevent overlap with fixed buttons -->
    <!-- Header Section -->
    <div class="flex justify-between items-start">
      <!-- Company Info -->
      <div>
        <h1 class="h1">{job.companyInfo?.name || 'N/A'}</h1>
        <h2 class="h5 text-surface-600">{job.jobInfo?.jobTitle || 'N/A'}</h2>
        <!-- Meta Information -->
        <div class="flex flex-wrap gap-2 mt-4">
          <span class="chip bg-gradient-to-br variant-gradient-primary-secondary">{job.companyInfo?.industry || 'N/A'}</span>
          <span class="chip bg-gradient-to-br variant-gradient-primary-secondary">{job.jobInfo?.remoteType || 'N/A'}</span>
          <span class="chip bg-gradient-to-br variant-gradient-primary-secondary">{job.compensation || 'N/A'}</span>
          <span class="chip bg-gradient-to-br variant-gradient-primary-secondary">{formatDate(job.generalData?.timestamp)}</span>
          {#if job.generalData?.status}
            <span class="chip bg-gradient-to-br variant-gradient-primary-secondary">{job.generalData.status}</span>
          {/if}
        </div>
      </div>
      <!-- Radial Progress Score Display -->
      {#if job.matchResult?.totalScore !== undefined}
      <div class="flex items-center">
        <ProgressRadial stroke={60} font={75} strokeLinecap=round value={Math.round(job.matchResult.totalScore)}>
          {Math.round(job.matchResult.totalScore)}
        </ProgressRadial>
      </div>
      {/if}
    </div>
  
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
</div>

<!-- Fixed position action buttons -->
<div class="md:ml-80 fixed bottom-0 left-0 right-0 bg-surface-100 border-t p-4 z-10">
    <div class="max-w-4xl mx-auto flex gap-2 flex-wrap justify-center">
        <button
          class="btn variant-filled"
          on:click={previousJob}
          disabled={isFirstJob || isHiding}
        >
          Previous
        </button>
        <button
          class="btn variant-soft"
          on:click={() => toggleStar(job.id)}
          disabled={isHiding}
        >
          {job.generalData?.status?.toLowerCase() === 'starred' ? '⭐ Unstar' : '☆ Star'}
        </button>
        <button
          class="btn variant-filled-error"
          on:click={handleHide}
          disabled={isHiding}
        >
          {isHiding ? 'Hiding...' : 'Hide'}
        </button>
        <button
          class="btn variant-filled-primary"
          on:click={handleVisitJob}
          disabled={isHiding}
        >
          Visit Job
        </button>
        <button
          class="btn variant-filled"
          on:click={() => handleNext(job.id)}
          disabled={isLastJob || isHiding}
        >
          Next
        </button>
    </div>
</div>