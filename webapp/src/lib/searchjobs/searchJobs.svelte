<script>
  import { onMount, onDestroy } from 'svelte';
  import { getCloudFunctionUrl } from '$lib/config/environment.config';
  import { scrapeStore, isLoading, totalJobs, initJobListener, clearScrapeStore } from '$lib/stores/scrapeStore';

  export let searchStartTime = null;

  import { auth } from '$lib/firebase';
  import { db } from '$lib/firebase'; 
  import SearchStatus from '$lib/searchJobs/SearchStatus.svelte';

  let keywords = '';
  let location = '';
  let jobType = '';
  let datePosted = '';
  let radius = '';
  let salary = '';
  let experience = '';
  let remote = false;
  let error = null;
  let unsubscribe; 

  // Add this to initialize the listener when component mounts
  onMount(() => {
    console.log('🔄 Component mounted');
    console.log('👤 Auth current user:', auth.currentUser?.uid);
    
    if (auth.currentUser) {
      console.log('🎯 Initializing listener for user:', auth.currentUser.uid);
      unsubscribe = initJobListener(db, auth.currentUser.uid);
    } else {
      console.log('⚠️ No user found on mount');
      const unsubAuth = auth.onAuthStateChanged(user => {
        console.log('🔐 Auth state changed:', user?.uid);
        if (user) {
          console.log('✅ User logged in, initializing listener');
          unsubscribe = initJobListener(db, user.uid);
        }
      });
      
      return () => {
        console.log('🧹 Cleaning up auth listener');
        unsubAuth();
        if (unsubscribe) unsubscribe();
      };
    }
  });

  onDestroy(() => {
    console.log('Component destroying')
    if (unsubscribe) {
      console.log('Unsubscribing from listener')
      unsubscribe()
    }
  })

  function handleClearResults() {
    clearScrapeStore();
    error = null;
  }

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
  console.log('🔎 Search started with keywords:', keywords);
  searchStartTime = Date.now();
  isLoading.set(true); // Set to true when search starts
  error = null;

  if (!keywords) {
    error = 'Please enter keywords to search';
    isLoading.set(false); // Reset on validation error
    return;
  }

  if (!auth.currentUser) {
    error = 'You must be logged in to search jobs';
    isLoading.set(false); // Reset on auth error
    return;
  }

  try {
    const params = new URLSearchParams({
      keywords,
      userId: auth.currentUser.uid,
      ...(location && { location }),
      ...(jobType && { jobType }),
      ...(datePosted && { datePosted }),
      ...(radius && { radius }),
      ...(salary && { salary }),
      ...(experience && { experience }),
      ...(remote && { remote: 'true' })
    });

    console.log('🌐 Making API request...');
    const response = await fetch(`${getCloudFunctionUrl('searchJobs')}?${params.toString()}`);
    console.log('📥 Raw response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Full response data:', data);

    if (data.jobs && data.jobs.length > 0) {
      totalJobs.set(data.count);
      console.log('✨ Found', data.count, 'jobs. Firestore listener will update UI');
    } else {
      console.warn('⚠️ No jobs found in response');
      totalJobs.set(0);
    }
  } catch (err) {
    console.error('❌ Error during job search:', err);
    error = err.message || 'An error occurred';
  } finally {
    isLoading.set(false); // Always reset loading state when done
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
      
      <div class="flex gap-4">
        <button
          type="submit"
          class="btn variant-filled-primary flex-1"
          disabled={$isLoading}
        >
          {$isLoading ? 'Searching...' : 'Search Jobs'}
        </button>
        
        {#if $scrapeStore.length > 0}
          <button
            type="button"
            class="btn variant-ghost-error"
            on:click={handleClearResults}
          >
            Clear Results
          </button>
        {/if}
      </div>
    </form>

    <SearchStatus
      {searchStartTime}
      searchParams={{
        keywords,
        location,
        jobType,
        datePosted,
        radius,
        salary,
        experience,
        remote
      }}
    />

    {#if error}
      <div class="alert variant-filled-error" role="alert">
        <span>{error}</span>
      </div>
    {/if}

    <!-- Results Header -->
    {#if $totalJobs > 0}
      <div class="pt-4 pb-2">
        <h2 class="h3">Found {$totalJobs} jobs</h2>
      </div>
    {/if}

    <!-- Results -->


    {#if $scrapeStore.length > 0}
    <div class="space-y-4">
      {#each $scrapeStore as job}
        <article class="card variant-filled-surface p-4">
          <header class="mb-3">
            <h3 class="h3">{job.title || 'Untitled Position'}</h3>
            <p class="font-bold">{job.company || 'Company Not Listed'}</p>
            {#if job.location}
              <div class="flex gap-2 text-sm opacity-75">
                <span>{job.location}</span>
                {#if job.datePosted}
                  <span>•</span>
                  <span>{job.datePosted}</span>
                {/if}
              </div>
            {/if}
          </header>
          
          {#if job.salary}
            <p class="text-success-500 font-semibold">{job.salary}</p>
          {/if}
          
          {#if job.description}
            <p class="mt-2">{job.description}</p>
          {/if}
          
          <div class="mt-4">
            {#if job.jobUrl}
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="btn variant-ghost-primary"
              >
                View Job Details
              </a>
            {/if}
          </div>
        </article>
      {/each}
    </div>
    {:else}
      {#if $totalJobs > 0}
        <div class="alert variant-ghost-warning">
          <p>Loading job details...</p>
        </div>
      {/if}
    {/if}
  </div>
</div>