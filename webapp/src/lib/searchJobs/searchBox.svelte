<script>
  import { onMount } from 'svelte';
  import { scrapeStore, isLoading, totalJobs } from '$lib/stores/scrapeStore';
  import { authStore } from '$lib/stores/authStore';
  import { getCloudFunctionUrl, environmentUrls } from '$lib/config/environment.config';
  import DailySearchRoutines from '$lib/searchJobs/DailySearchRoutines.svelte';
  
  let uid;
  let scheduleSearch = false;

  authStore.subscribe(user => {
    uid = user?.uid;
  });

  // Form options remain the same
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

  // Form state with added limitPerInput
  let keywords = '';
  let location = '';
  let jobType = '';
  let experience = '';
  let workplaceType = '';
  let datePosted = '';
  let country = '';
  let company = '';
  let limitPerInput = 1; // Default value
  let error = null;

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
        country: 'US', // Hardcoded to US as in original code
        time_range: datePosted || 'Any time',
        job_type: jobType || '',
        experience_level: experience || '',
        remote: workplaceType || '',
        company: company?.trim() || '' // Added company from form
      }];

      // Use the environment config to determine the correct URL
      const searchUrl = getCloudFunctionUrl('searchBright');
      
      // Remove baseUrl declaration since we're using getCloudFunctionUrl directly
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: uid,
          searchParams: searchPayload,
          limit: parseInt(limitPerInput) || 2,
          schedule: scheduleSearch ? {
            frequency: 'daily',
            runImmediately: true
          } : undefined
        })
      });

      // Process the response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      scrapeStore.set(data.jobs || []);
      totalJobs.set(data.total || 0);
      
    } catch (err) {
      error = err.message || 'An error occurred while searching for jobs';
    } finally {
      isLoading.set(false);
    }
  }
</script>

<!-- Main container with same padding/margin as used in the Jobs Collected card -->
<div class="mb-4">
  <!-- Card with white background matching the Jobs Collected card -->
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-2">Job Agent Setup</h2>
    
    <p class="mb-6">A FoxJob Agent automatically scans job sites and brings the best matches to your inbox daily.</p>
    
    <form on:submit|preventDefault={searchJobs}>
      <!-- Keywords -->
      <div class="mb-4">
        <label for="keywords" class="block font-bold mb-2">Keywords *</label>
        <input
          id="keywords"
          type="search"
          bind:value={keywords}
          placeholder="Job title, keywords, or company"
          required
          class="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <!-- Three column layout for form fields -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <!-- Location -->
        <div>
          <label for="location" class="block font-bold mb-2">Location *</label>
          <input
            id="location"
            type="text"
            bind:value={location}
            placeholder="City or region"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <!-- Country -->
        <div>
          <label for="country" class="block font-bold mb-2">Country *</label>
          <input
            id="country"
            type="text"
            bind:value={country}
            placeholder="Country code (e.g., US, FR)"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <!-- Job Type -->
        <div>
          <label for="jobType" class="block font-bold mb-2">Job Type</label>
          <select id="jobType" class="w-full px-4 py-2 border rounded-lg" bind:value={jobType}>
            <option value="">Any Job Type</option>
            {#each jobTypes as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
        </div>

        <!-- Experience Level -->
        <div>
          <label for="experience" class="block font-bold mb-2">Experience Level</label>
          <select id="experience" class="w-full px-4 py-2 border rounded-lg" bind:value={experience}>
            <option value="">Any Experience</option>
            {#each experienceLevels as level}
              <option value={level.value}>{level.label}</option>
            {/each}
          </select>
        </div>

        <!-- Workplace Type -->
        <div>
          <label for="workplaceType" class="block font-bold mb-2">Workplace Type</label>
          <select id="workplaceType" class="w-full px-4 py-2 border rounded-lg" bind:value={workplaceType}>
            <option value="">Any Workplace</option>
            {#each workplaceTypes as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
        </div>

        <!-- Date Posted -->
        <div>
          <label for="datePosted" class="block font-bold mb-2">Date Posted</label>
          <select id="datePosted" class="w-full px-4 py-2 border rounded-lg" bind:value={datePosted}>
            <option value="">Any Time</option>
            {#each dateOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <!-- Company -->
        <div>
          <label for="company" class="block font-bold mb-2">Company (Optional)</label>
          <input
            id="company"
            type="text"
            bind:value={company}
            placeholder="Company name"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <!-- Limit Per Input -->
        <div>
          <label for="limitPerInput" class="block font-bold mb-2">Results Per Search</label>
          <input
            id="limitPerInput"
            type="number"
            bind:value={limitPerInput}
            min="1"
            max="100"
            class="w-full px-4 py-2 border rounded-lg"
            placeholder="Number of results per search"
          />
        </div>
      </div>

      <div class="mb-6">
        <label class="flex items-center">
          <input
            type="checkbox"
            bind:checked={scheduleSearch}
            class="mr-2"
          />
          <span>Email me new matching jobs daily</span>
        </label>
      </div>

      <!-- Create Job Agent Button - Orange button to match site style -->
      <button
        type="submit"
        class="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
        disabled={$isLoading}
      >
        {$isLoading ? 'Setting up your job agent...' : 'Create Job Agent'}
      </button>
    </form>

    {#if error}
      <div class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
        {error}
      </div>
    {/if}

    <!-- Progress notification when searching -->
    {#if $isLoading}
      <div class="mt-6 p-4 bg-blue-50 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold">Setting up your job agent...</span>
          <div class="h-3 w-3 rounded-full animate-pulse bg-orange-500"></div>
        </div>
        <p>We're scanning job sites for the best matches. You'll receive email updates with new jobs daily.</p>
      </div>
    {/if}
  </div>

  <DailySearchRoutines />
</div>