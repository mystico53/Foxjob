<script>
    // Props
    export let job = {};
    export let handleNext;
    export let previousJob;
    export let isFirstJob;
    export let isLastJob;
    export let toggleStar;
    export let hideJobAndNext;
    export let openJobLink;
    
    let isHiding = false;
    
    function getScoreColor(score) {
        const colorStops = [
            { score: 40, color: { r: 255, g: 107, b: 107 } },
            { score: 60, color: { r: 244, g: 211, b: 94 } },
            { score: 100, color: { r: 111, g: 219, b: 111 } }
        ];

        let lowerStop = colorStops[0];
        let upperStop = colorStops[colorStops.length - 1];
        
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (score >= colorStops[i].score && score <= colorStops[i + 1].score) {
                lowerStop = colorStops[i];
                upperStop = colorStops[i + 1];
                break;
            }
        }

        const range = upperStop.score - lowerStop.score;
        const percent = range === 0 ? 1 : (score - lowerStop.score) / range;

        const r = Math.round(lowerStop.color.r + percent * (upperStop.color.r - lowerStop.color.r));
        const g = Math.round(lowerStop.color.g + percent * (upperStop.color.g - lowerStop.color.g));
        const b = Math.round(lowerStop.color.b + percent * (upperStop.color.b - lowerStop.color.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

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

<div class="card p-6 max-w-4xl mx-auto space-y-8">
    <!-- Header Section -->
    <div class="flex justify-between items-start">
      <!-- Company Info -->
      <div>
        <h1 class="h4">{job.companyInfo?.name || 'N/A'}</h1>
        <h2 class="h5 text-surface-600">{job.jobInfo?.jobTitle || 'N/A'}</h2>
        <!-- Meta Information -->
        <div class="flex flex-wrap gap-2 mt-4">
          <span class="chip variant-filled">{job.companyInfo?.industry || 'N/A'}</span>
          <span class="chip variant-filled">{job.jobInfo?.remoteType || 'N/A'}</span>
          <span class="chip variant-filled">{job.compensation || 'N/A'}</span>
          <span class="chip variant-filled">{formatDate(job.generalData?.timestamp)}</span>
          {#if job.generalData?.status}
            <span class="chip variant-filled-primary">{job.generalData.status}</span>
          {/if}
        </div>
      </div>
      <!-- Score Display -->
      {#if job.matchResult?.totalScore !== undefined}
        <div class="flex items-center">
          <div class="text-center">
            <span class="text-2xl font-bold">{Math.round(job.matchResult.totalScore)}</span>
            <p>Score</p>
          </div>
        </div>
      {/if}
    </div>
  
    <!-- Company Focus and Job Summary -->
    {#if job.companyInfo?.companyFocus || job.jobInfo?.jobSummary}
      <div class="card variant-glass p-4">
        {#if job.companyInfo?.companyFocus}
          <p class="mb-4">{job.companyInfo.companyFocus}</p>
        {/if}
        {#if job.jobInfo?.jobSummary}
          <p>{job.jobInfo.jobSummary}</p>
        {/if}
      </div>
    {/if}
  
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
            <tr>
              <td><strong>Total Score</strong></td>
              <td><strong>{Math.round(job.matchResult.totalScore)}</strong></td>
              <td>{job.matchResult.summary}</td>
            </tr>
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
  
    <!-- Action Buttons -->
    <div class="flex gap-2 flex-wrap justify-center">
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