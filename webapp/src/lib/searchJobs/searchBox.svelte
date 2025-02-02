<script>
  import { onMount } from 'svelte';
  import { isLoading } from '$lib/stores/scrapeStore';
  import { authStore } from '$lib/stores/authStore';

  $: uid = $authStore?.uid;

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

  // Form state remains the same
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
        country: country || 'US',
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
      dispatch('searchComplete', data);
      
    } catch (err) {
      error = err.message || 'An error occurred while searching for jobs';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="container mx-auto p-4">
  <form on:submit|preventDefault={searchJobs} class="space-y-8">
    <!-- Keywords - Full width -->
    <div class="form-field">
      <label for="keywords" class="label font-bold">Keywords *</label>
      <input
        id="keywords"
        type="search"
        bind:value={keywords}
        placeholder="Job title, keywords, or company"
        required
        class="input"
      />
    </div>

    <!-- Grid layout for form fields -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Location -->
      <div class="form-field">
        <label for="location" class="label font-bold">Location</label>
        <input
          id="location"
          type="text"
          bind:value={location}
          placeholder="City or region"
          class="input"
        />
      </div>

      <!-- Country -->
      <div class="form-field">
        <label for="country" class="label font-bold">Country</label>
        <input
          id="country"
          type="text"
          bind:value={country}
          placeholder="Country code (e.g., US, FR)"
          class="input"
        />
      </div>

      <!-- Job Type -->
      <div class="form-field">
        <label for="jobType" class="label font-bold">Job Type</label>
        <select id="jobType" class="select" bind:value={jobType}>
          <option value="">Any Job Type</option>
          {#each jobTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>

      <!-- Experience Level -->
      <div class="form-field">
        <label for="experience" class="label font-bold">Experience Level</label>
        <select id="experience" class="select" bind:value={experience}>
          <option value="">Any Experience</option>
          {#each experienceLevels as level}
            <option value={level.value}>{level.label}</option>
          {/each}
        </select>
      </div>

      <!-- Workplace Type -->
      <div class="form-field">
        <label for="workplaceType" class="label font-bold">Workplace Type</label>
        <select id="workplaceType" class="select" bind:value={workplaceType}>
          <option value="">Any Workplace</option>
          {#each workplaceTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>

      <!-- Date Posted -->
      <div class="form-field">
        <label for="datePosted" class="label font-bold">Date Posted</label>
        <select id="datePosted" class="select" bind:value={datePosted}>
          <option value="">Any Time</option>
          {#each dateOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Company -->
      <div class="form-field">
        <label for="company" class="label font-bold">Company (Optional)</label>
        <input
          id="company"
          type="text"
          bind:value={company}
          placeholder="Company name"
          class="input"
        />
      </div>
    </div>

    <!-- Search Button - Full width -->
    <button
      type="submit"
      class="btn variant-filled-primary"
      disabled={$isLoading}
    >
      {$isLoading ? 'Searching...' : 'Search Jobs'}
    </button>
  </form>

  {#if error}
    <div class="alert variant-filled-error mt-4">
      {error}
    </div>
  {/if}
</div>