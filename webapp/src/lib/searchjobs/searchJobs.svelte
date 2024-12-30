<script>
  import { getCloudFunctionUrl } from '$lib/config/environment.config';

  let keywords = '';
  let location = '';
  let jobs = [];
  let loading = false;
  let error = null;

  async function searchJobs() {
    if (!keywords || !location) {
      error = 'Please enter both keywords and location';
      return;
    }

    loading = true;
    error = null;

    try {
      const response = await fetch(
        `${getCloudFunctionUrl('searchJobs')}?` +
        new URLSearchParams({
          keywords,
          location
        })
      );

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      jobs = data.jobs;
    } catch (err) {
      error = err.message || 'An error occurred';
    } finally {
      loading = false;
    }
  }
</script>

<div class="container mx-auto p-4">
  <div class="card p-4 space-y-4">
    <h2 class="h2">Job Search</h2>
    
    <!-- Search Form -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        type="text"
        class="input"
        bind:value={keywords}
        name="keywords"
        placeholder="Job title, keywords, or company"
      />
      <input
        type="text"
        class="input"
        bind:value={location}
        name="location"
        placeholder="City, state, or zip code"
      />
    </div>
    
    <button
      class="btn variant-filled-primary w-full"
      on:click={searchJobs}
      disabled={loading}
    >
      {loading ? 'Searching...' : 'Search Jobs'}
    </button>

    {#if error}
      <div class="alert variant-filled-error">{error}</div>
    {/if}

    <!-- Results -->
    <!-- Results -->
{#if jobs.length > 0}
<div class="space-y-4">
  {#each jobs as job}
    <div class="card variant-filled-surface p-4">
      <h3 class="h3">{job.title}</h3>
      <p class="font-bold">{job.company}</p>
      <p>{job.location}</p>
      {#if job.salary}
        <p class="text-success-500">{job.salary}</p>
      {/if}
      <p class="mt-2">{job.snippet}</p>
      {#if job.description}
        <details class="mt-4">
          <summary class="cursor-pointer font-semibold">View Full Description</summary>
          <div class="mt-2 whitespace-pre-line">{job.description}</div>
        </details>
      {/if}
      <a
        href={job.jobUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="btn variant-ghost-primary mt-2"
      >
        View Job
      </a>
    </div>
  {/each}
</div>
{/if}
  </div>
</div>