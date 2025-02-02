<script>
  import { onMount } from 'svelte';
  // Keep this if you want global loading state
  import { isLoading } from '$lib/stores/scrapeStore';
  // Keep this if you need auth for API calls
  import { authStore } from '$lib/stores/authStore';

  // If you need user ID for API authentication
  $: uid = $authStore?.uid;

// Define the form options
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

// Form state
let keywords = '';
let location = '';
let jobType = '';
let experience = '';
let workplaceType = '';
let datePosted = '';
let country = '';
let company = '';
let error = null;

async function searchJobs() {
  isLoading = true;
  error = null;

  if (!keywords) {
    error = 'Please enter keywords to search';
    isLoading = false;
    return;
  }

  try {
    const searchPayload = [{
      keyword: keywords.trim(),
      location: location?.trim() || '',
      country: country || 'US',  // Default to US if not specified
      time_range: datePosted || 'Any time',
      job_type: jobType || '',
      experience_level: experience || '',
      remote: workplaceType || '',
      company: company || ''
    }];

    const response = await fetch(
      'https://api.brightdata.com/datasets/v3/trigger',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer API_TOKEN',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch jobs');
    }

    const data = await response.json();
    // Emit the search results to parent component
    dispatch('searchComplete', data);
    
  } catch (err) {
    error = err.message || 'An error occurred while searching for jobs';
  } finally {
    isLoading = false;
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

    <!-- Country -->
    <div>
      <label for="country">Country</label>
      <input
        id="country"
        type="text"
        bind:value={country}
        placeholder="Country code (e.g., US, FR)"
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

    <!-- Company -->
    <div>
      <label for="company">Company (Optional)</label>
      <input
        id="company"
        type="text"
        bind:value={company}
        placeholder="Company name"
        class="w-full p-2 border rounded"
      />
    </div>

    <!-- Search Button -->
    <button
      type="submit"
      disabled={isLoading}
      class="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {isLoading ? 'Searching...' : 'Search Jobs'}
    </button>
  </form>

  {#if error}
    <div class="mt-4 p-4 bg-red-100 text-red-700 rounded">
      {error}
    </div>
  {/if}
</div>