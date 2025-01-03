<script>
  import { onMount, onDestroy } from 'svelte';
  import { getCloudFunctionUrl } from '$lib/config/environment.config';
  import { jobStore, isLoading, initJobListener } from '$lib/stores/scrapeStore';
  import { auth } from '$lib/firebase';
  import { db } from '$lib/firebase'; 

  let keywords = '';
  let location = '';
  let jobType = '';
  let datePosted = '';
  let radius = '';
  let salary = '';
  let experience = '';
  let remote = false;
  let jobs = [];
  let loading = false;
  let error = null;
  let totalJobs = 0;
  let unsubscribe;

  // Add this to initialize the listener when component mounts
  onMount(() => {
    if (auth.currentUser) {
      unsubscribe = initJobListener(db, auth.currentUser.uid);
    }
  });
  
  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  const jobTypes = [
    { value: 'fulltime', label: 'Full-time' },
    { value: 'parttime', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'temporary', label: 'Temporary' },
    { value: 'internship', label: 'Internship' }
  ];

  const dateOptions = [
    { value: '1', label: 'Last 24 hours' },
    { value: '3', label: 'Last 3 days' },
    { value: '7', label: 'Last 7 days' },
    { value: '14', label: 'Last 14 days' }
  ];

  const radiusOptions = [
    { value: '5', label: 'Within 5 miles' },
    { value: '10', label: 'Within 10 miles' },
    { value: '25', label: 'Within 25 miles' },
    { value: '50', label: 'Within 50 miles' }
  ];

  const salaryOptions = [
    { value: '30000', label: '$30,000+' },
    { value: '50000', label: '$50,000+' },
    { value: '75000', label: '$75,000+' },
    { value: '100000', label: '$100,000+' },
    { value: '125000', label: '$125,000+' },
    { value: '150000', label: '$150,000+' }
  ];

  const experienceLevels = [
    { value: 'entry_level', label: 'Entry Level' },
    { value: 'mid_level', label: 'Mid Level' },
    { value: 'senior_level', label: 'Senior Level' }
  ];

  async function searchJobs() {
    if (!keywords) {
      error = 'Please enter keywords to search';
      return;
    }

    if (!auth.currentUser) {
      error = 'You must be logged in to search jobs';
      return;
    }

    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        keywords,
        uid: auth.currentUser.uid,
        ...(location && { location }),
        ...(jobType && { jobType }),
        ...(datePosted && { datePosted }),
        ...(radius && { radius }),
        ...(salary && { salary }),
        ...(experience && { experience }),
        ...(remote && { remote: 'true' })
      });

      const response = await fetch(
        `${getCloudFunctionUrl('searchJobs')}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      // Don't set jobs directly anymore - they'll come from the store
    } catch (err) {
      error = err.message || 'An error occurred';
    } finally {
      loading = false;
    }
  }
</script>

<div class="container mx-auto p-4">
  <div class="card p-4 space-y-6">
    <header class="space-y-2">
      <h1 class="h2">Job Search</h1>
      <p class="text-sm opacity-75">Search millions of jobs from Indeed</p>
    </header>
    
    <!-- Search Form -->
    <form on:submit|preventDefault={searchJobs} class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Required Fields -->
        <div class="space-y-2">
          <label for="keywords" class="label">
            <span class="label-text font-bold">Keywords</span>
            <span class="text-error-500">*</span>
          </label>
          <input
            id="keywords"
            type="text"
            class="input"
            bind:value={keywords}
            placeholder="Job title, keywords, or company"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="location" class="label">
            <span class="label-text font-bold">Location</span>
          </label>
          <input
            id="location"
            type="text"
            class="input"
            bind:value={location}
            placeholder="City, state, or zip code (optional)"
          />
        </div>
        
        <!-- Job Type -->
        <div class="space-y-2">
          <label for="jobType" class="label">
            <span class="label-text font-bold">Job Type</span>
          </label>
          <select id="jobType" class="select" bind:value={jobType}>
            <option value="">Any Job Type</option>
            {#each jobTypes as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
        </div>

        <!-- Date Posted -->
        <div class="space-y-2">
          <label for="datePosted" class="label">
            <span class="label-text font-bold">Date Posted</span>
          </label>
          <select id="datePosted" class="select" bind:value={datePosted}>
            <option value="">Any Time</option>
            {#each dateOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <!-- Search Radius -->
        <div class="space-y-2">
          <label for="radius" class="label">
            <span class="label-text font-bold">Search Radius</span>
          </label>
          <select id="radius" class="select" bind:value={radius}>
            <option value="">Any Distance</option>
            {#each radiusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <!-- Salary -->
        <div class="space-y-2">
          <label for="salary" class="label">
            <span class="label-text font-bold">Minimum Salary</span>
          </label>
          <select id="salary" class="select" bind:value={salary}>
            <option value="">Any Salary</option>
            {#each salaryOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <!-- Experience -->
        <div class="space-y-2">
          <label for="experience" class="label">
            <span class="label-text font-bold">Experience Level</span>
          </label>
          <select id="experience" class="select" bind:value={experience}>
            <option value="">Any Experience</option>
            {#each experienceLevels as level}
              <option value={level.value}>{level.label}</option>
            {/each}
          </select>
        </div>

        <!-- Remote -->
        <div class="flex items-center space-x-2">
          <label for="remote" class="flex items-center space-x-2 cursor-pointer">
            <input
              id="remote"
              type="checkbox"
              bind:checked={remote}
              class="checkbox"
            />
            <span class="font-bold">Remote jobs only</span>
          </label>
        </div>
      </div>
      
      <button
        type="submit"
        class="btn variant-filled-primary w-full"
        disabled={loading}
      >
        {loading ? 'Searching...' : 'Search Jobs'}
      </button>
    </form>

    {#if error}
      <div class="alert variant-filled-error" role="alert">
        <span>{error}</span>
      </div>
    {/if}

    <!-- Results Header -->
    {#if jobs.length > 0}
      <div class="pt-4 pb-2">
        <h2 class="h3">Found {totalJobs} jobs</h2>
      </div>
    {/if}

    <!-- Results -->
    {#if $jobStore.length > 0}
    <div class="space-y-4">
      {#each $jobStore as job}
          <article class="card variant-filled-surface p-4">
            <header class="mb-3">
              <h3 class="h3">{job.title}</h3>
              <p class="font-bold">{job.company}</p>
              <p class="text-sm opacity-75">{job.location}</p>
            </header>
            
            {#if job.salary}
              <p class="text-success-500 font-semibold">{job.salary}</p>
            {/if}
            
            {#if job.snippet}
              <p class="mt-2">{job.snippet}</p>
            {/if}
            
            {#if job.description}
              <details class="mt-4">
                <summary class="cursor-pointer font-semibold hover:text-primary-500">
                  View Full Description
                </summary>
                <div class="mt-2 whitespace-pre-line text-sm">{job.description}</div>
              </details>
            {/if}
            
            <div class="mt-4">
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="btn variant-ghost-primary"
              >
                View on Indeed
              </a>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</div>