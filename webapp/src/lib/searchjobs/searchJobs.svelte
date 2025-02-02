<script>
  import { onMount, onDestroy } from 'svelte';
  import { scrapeStore, isLoading, totalJobs } from '$lib/stores/scrapeStore';
  import { authStore } from '$lib/stores/authStore';
 
  
  let keywords = '';
  let location = '';
  let jobType = '';
  let experience = '';
  let workplaceType = '';
  let datePosted = '';
  let limit = 2; // Default limit
  let error = null;
  export let uid; 
  
  const jobTypes = [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Internship', label: 'Internship' }
  ];

  const dateOptions = [
    { value: 'Past 24 hours', label: 'Last 24 hours' },
    { value: 'Past week', label: 'Last 7 days' },
    { value: 'Past month', label: 'Last 30 days' },
    { value: 'Any time', label: 'Any time' }
  ];

  const experienceLevels = [
    { value: 'Entry level', label: 'Entry Level' },
    { value: 'Mid-Senior level', label: 'Mid-Senior Level' },
    { value: 'Director', label: 'Director' }
  ];

  const workplaceTypes = [
    { value: 'On-site', label: 'On-site' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Hybrid', label: 'Hybrid' }
  ];

  async function searchJobs() {
    isLoading.set(true);
    error = null;

    if (!keywords) {
      error = 'Please enter keywords to search';
      isLoading.set(false);
      return;
    }

    try {
      const searchPayload = [{
        keyword: keywords.trim(),
        location: location?.trim() || '',
        country: 'US', // Default to US
        time_range: datePosted || 'Any time',
        job_type: jobType || '',
        experience_level: experience || '',
        remote: workplaceType || '',
        company: ''
      }];

      const response = await fetch(
        'http://127.0.0.1:5001/jobille-45494/us-central1/searchBright',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: uid,
            searchParams: searchPayload,
            limit: parseInt(limit) || 2
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      if (data.response?.results?.length > 0) {
        scrapeStore.set(data.response.results);
        totalJobs.set(data.response.results.length);
      } else {
        scrapeStore.set([]);
        totalJobs.set(0);
      }
    } catch (err) {
      error = err.message || 'An error occurred while searching for jobs';
    } finally {
      isLoading.set(false);
    }
  }
</script>

<div class="container mx-auto p-4">
  <form on:submit|preventDefault={searchJobs} class="space-y-4">
    <!-- Keywords -->
    <div>
      <label for="keywords">Keywords *</label>
      <input
        id="keywords"
        type="text"
        bind:value={keywords}
        placeholder="Job title, keywords, or company"
        required
        class="w-full p-2 border rounded"
      />
    </div>

    <!-- Location -->
    <div>
      <label for="location">Location</label>
      <input
        id="location"
        type="text"
        bind:value={location}
        placeholder="City or region"
        class="w-full p-2 border rounded"
      />
    </div>

    <!-- Job Type -->
    <div>
      <label for="jobType">Job Type</label>
      <select 
        id="jobType" 
        bind:value={jobType}
        class="w-full p-2 border rounded"
      >
        <option value="">Any Job Type</option>
        {#each jobTypes as type}
          <option value={type.value}>{type.label}</option>
        {/each}
      </select>
    </div>

    <!-- Experience Level -->
    <div>
      <label for="experience">Experience Level</label>
      <select 
        id="experience" 
        bind:value={experience}
        class="w-full p-2 border rounded"
      >
        <option value="">Any Experience</option>
        {#each experienceLevels as level}
          <option value={level.value}>{level.label}</option>
        {/each}
      </select>
    </div>

    <!-- Workplace Type -->
    <div>
      <label for="workplaceType">Workplace Type</label>
      <select 
        id="workplaceType" 
        bind:value={workplaceType}
        class="w-full p-2 border rounded"
      >
        <option value="">Any Workplace</option>
        {#each workplaceTypes as type}
          <option value={type.value}>{type.label}</option>
        {/each}
      </select>
    </div>

    <!-- Date Posted -->
    <div>
      <label for="datePosted">Date Posted</label>
      <select 
        id="datePosted" 
        bind:value={datePosted}
        class="w-full p-2 border rounded"
      >
        <option value="">Any Time</option>
        {#each dateOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Results Limit -->
    <div>
      <label for="limit">Maximum Results</label>
      <input
        id="limit"
        type="number"
        bind:value={limit}
        min="1"
        max="100"
        class="w-full p-2 border rounded"
      />
      <span class="text-sm text-gray-500">Number of jobs to fetch per search (max 100)</span>
    </div>

    <!-- Search Button -->
    <button
      type="submit"
      disabled={$isLoading}
      class="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {$isLoading ? 'Searching...' : 'Search Jobs'}
    </button>
  </form>

  {#if error}
    <div class="mt-4 p-4 bg-red-100 text-red-700 rounded">
      {error}
    </div>
  {/if}

  <!-- Results -->
  {#if $scrapeStore.length > 0}
    <div class="mt-6 space-y-4">
      {#each $scrapeStore as job}
        <div class="p-4 border rounded">
          <h3 class="text-xl font-bold">{job.title || 'Untitled Position'}</h3>
          <p class="font-semibold">{job.company || 'Company Not Listed'}</p>
          <p class="text-gray-600">{job.location}</p>
          
          {#if job.description}
            <p class="mt-2">{job.description}</p>
          {/if}

          {#if job.jobUrl}
            <a 
              href={job.jobUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              class="mt-2 inline-block text-blue-500 hover:underline"
            >
              View Job
            </a>
          {/if}
        </div>
      {/each}
    </div>
  {:else if $totalJobs > 0}
    <div class="mt-4 text-center">
      Loading jobs...
    </div>
  {/if}
</div>