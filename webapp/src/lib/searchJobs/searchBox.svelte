<script>
  import { onMount } from 'svelte';
  import { scrapeStore, isLoading, totalJobs } from '$lib/stores/scrapeStore';
  import { authStore } from '$lib/stores/authStore';
  import { 
    userStateStore, 
    jobAgentStore, 
    setJobAgentStatus, 
    setJobAgentLoading,
    resetJobAgentStatus 
  } from '$lib/stores/userStateStore';
  import { getCloudFunctionUrl, environmentUrls } from '$lib/config/environment.config';
  import DailySearchRoutines from '$lib/searchJobs/DailySearchRoutines.svelte';
  import JobAgentList from '$lib/searchJobs/JobAgentList.svelte';
  import { db } from '$lib/firebase';
  import { collection, query, where, limit, getDocs } from 'firebase/firestore';
  
  let uid;
  // Hardcoded to true as requested
  let scheduleSearch = true;
  let error = null;
  
  // Local reactive variables that come from the store
  let hasActiveAgent;
  let isCheckingAgent;
  
  // Variables to track editing state
  let editingAgentId = null;
  let isEditing = false;
  
  // Subscribe to the job agent store
  const unsubJobAgent = jobAgentStore.subscribe(state => {
    hasActiveAgent = state.hasActiveAgent;
    isCheckingAgent = state.isLoading;
  });
  
  // Unsubscribe when component is destroyed
  onMount(() => {
    return () => {
      unsubJobAgent();
    };
  });

  authStore.subscribe(user => {
    uid = user?.uid;
    if (uid) {
      checkExistingQueries();
    }
  });

  function getTimezoneOffset() {
  // Get minutes offset (e.g., -420 for PDT which is UTC-7)
  const offsetMinutes = new Date().getTimezoneOffset();
  
  // Convert to hours (e.g., 7 for PDT)
  // Note: getTimezoneOffset returns the opposite of what we want
  // so we negate it (e.g., -(-420)/60 = 7)
  const offsetHours = -offsetMinutes / 60;
  
  return offsetHours;
}

// Check if user already has an active search query
// Check if user already has an active search query
async function checkExistingQueries() {
  setJobAgentLoading(true);
  try {
    // Get a reference to the user's searchQueries collection
    const queriesRef = collection(db, 'users', uid, 'searchQueries');
    
    // Query for active queries
    // Note: Firebase v9 modular API requires a separate query constructor
    const q = query(queriesRef, where('isActive', '==', true), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // User has an active query
      const doc = snapshot.docs[0];
      setJobAgentStatus(true, doc.id);
    } else {
      // No active queries found
      setJobAgentStatus(false, null);
    }
  } catch (error) {
    console.error("Error checking queries:", error);
    setJobAgentStatus(false, null);
  } finally {
    setJobAgentLoading(false);
  }
}
  
  // Function to delete job agent
  async function deleteJobAgent() {
    setJobAgentLoading(true);
    try {
      const deleteUrl = getCloudFunctionUrl('deleteJobAgent');
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: uid,
          agentId: hasActiveAgent.agentId 
        })
      });
      
      if (response.ok) {
        // Reset job agent status in the store
        resetJobAgentStatus();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
    } catch (err) {
      error = err.message || 'An error occurred while deleting the job agent';
    } finally {
      setJobAgentLoading(false);
    }
  }

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

  // Form state with removed company field
  let keywords = '';
  let location = '';
  let jobType = '';
  let experience = '';
  let workplaceType = '';
  let datePosted = '';
  let country = 'US';
  let limitPerInput = 1; // Default value

  // Add time options for when to receive results
  const timeOptions = [
    { value: '06:00', label: '6:00 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '20:00', label: '8:00 PM' }
  ];
  
  // Default to 8:00 AM
  let deliveryTime = '08:00';
  
  // Function to handle the edit event from JobAgentList
  // Function to handle the edit event from JobAgentList
function handleEditAgent(event) {
  const query = event.detail;
  editingAgentId = query.id;
  isEditing = true;
  
  // Extract search parameters from the first item in the array
  const searchParam = query.searchParams && query.searchParams.length > 0 
    ? query.searchParams[0] 
    : {};
  
  // Populate the form fields with query data
  keywords = searchParam.keyword || '';
  location = searchParam.location || '';
  country = searchParam.country || 'US';
  jobType = searchParam.job_type || '';
  experience = searchParam.experience_level || '';
  workplaceType = searchParam.remote || '';
  datePosted = searchParam.time_range || '';
  
  // Make sure to set the proper delivery time
  deliveryTime = query.deliveryTime || '08:00';
  
  // Convert numeric limit to string for form input
  limitPerInput = query.limit ? query.limit.toString() : '1';
  
  // Force a UI update by scheduling a microtask
  setTimeout(() => {
    console.log("Current delivery time:", deliveryTime);
  }, 0);
  
  // Scroll the form into view
  setTimeout(() => {
    document.getElementById('job-agent-form')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }, 100);
}
  
  // Cancel editing and reset form
  function cancelEdit() {
    isEditing = false;
    editingAgentId = null;
    
    // Reset form fields
    keywords = '';
    location = '';
    jobType = '';
    experience = '';
    workplaceType = '';
    datePosted = '';
    country = 'US';
    limitPerInput = 1;
    deliveryTime = '08:00';
  }
  
  async function searchJobs() {
  isLoading.set(true);
  error = null;

  if (!keywords) {
    error = 'Please enter a job title to search';
    isLoading.set(false);
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
    }];

    // Use the environment config to determine the correct URL
    const searchUrl = getCloudFunctionUrl('searchBright');
    
    // Enforce maximum of 50 results
    const limit = Math.min(parseInt(limitPerInput) || 1, 50);
    
    const requestBody = {
      userId: uid,
      searchParams: searchPayload,
      limit: limit,
      schedule: {
        frequency: 'daily',
        runImmediately: true,
        deliveryTime: deliveryTime,
        timezoneOffset: getTimezoneOffset() // Add the timezone offset
      }
    };
    
    // If editing, include the existing searchId
    if (isEditing && editingAgentId) {
      requestBody.schedule.searchId = editingAgentId;
    }

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // Process the response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      scrapeStore.set(data.jobs || []);
      totalJobs.set(data.total || 0);
      
      // After successful creation/update, update the job agent status in the store
      setJobAgentStatus(true, data.agentId || editingAgentId || null);
      
      // Reset editing state
      isEditing = false;
      editingAgentId = null;
      
    } catch (err) {
      error = err.message || 'An error occurred while searching for jobs';
    } finally {
      isLoading.set(false);
    }
  }
</script>

<div class="mb-4"><JobAgentList on:edit={handleEditAgent} /></div>
<!-- Main container with same padding/margin as used in the Jobs Collected card -->
<div class="mb-4">
  <!-- Card with white background matching the Jobs Collected card -->
  
  <div class="bg-white rounded-lg shadow p-6" id="job-agent-form">
    
    
    <h2 class="text-xl font-bold mb-2">
      {isEditing ? 'Edit your Agent' : 'Set up your Agent'}
    </h2>
    
    <p class="mb-6">A FoxJob Agent automatically scans job sites and brings the best matches to your inbox daily.</p>
    
    {#if isCheckingAgent}
      <!-- Loading state while checking for existing queries -->
      <div class="flex justify-center items-center py-8">
        <div class="h-6 w-6 rounded-full animate-pulse bg-orange-500"></div>
        <span class="ml-3">Checking your account...</span>
      </div>
    {:else if hasActiveAgent && !isEditing}
      <!-- Show free tier limitation message with delete option -->
      <div class="py-8 text-center">
        <div class="bg-blue-50 p-6 rounded-lg">
          <svg class="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="text-lg font-bold mb-2">Only one job agent in free tier</h3>
          <p>You already have an active job agent. Free tier accounts are limited to one job agent at a time.</p>
          <p class="mt-4">To manage your existing job agent, check below.</p>
          
          <!-- Delete button -->
          <button 
            on:click={deleteJobAgent}
            class="mt-6 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg" 
            disabled={isCheckingAgent}
          >
            {isCheckingAgent ? 'Deleting...' : 'Delete Job Agent'}
          </button>
        </div>
      </div>
    {:else}
      <!-- Show the form when there are no active queries or when editing -->
      <form on:submit|preventDefault={searchJobs}>
        <!-- Changed to Job Title -->
        <div class="mb-4">
          <label for="keywords" class="block font-bold mb-2">Job Title *</label>
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
          
          <!-- Delivery Time -->
          <div>
            <label for="deliveryTime" class="block font-bold mb-2">When to Receive Results</label>
            <select id="deliveryTime" class="w-full px-4 py-2 border rounded-lg" bind:value={deliveryTime}>
              {#each timeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Limit Per Input -->
          <div>
            <label for="limitPerInput" class="block font-bold mb-2">Results Per Search</label>
            <input
              id="limitPerInput"
              type="number"
              bind:value={limitPerInput}
              min="1"
              max="50"
              class="w-full px-4 py-2 border rounded-lg"
              placeholder="Number of results per search (max 50)"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-4">
          <!-- Create/Update Job Agent Button -->
          <button
            type="submit"
            class="flex-grow py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
            disabled={$isLoading}
          >
            {#if $isLoading}
              Setting up your job agent...
            {:else if isEditing}
              Update Job Agent
            {:else}
              Create Job Agent
            {/if}
          </button>
          
          <!-- Cancel button (only shown when editing) -->
          {#if isEditing}
            <button
              type="button"
              on:click={cancelEdit}
              class="py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg"
              disabled={$isLoading}
            >
              Cancel
            </button>
          {/if}
        </div>
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
            <span class="font-bold">
              {isEditing ? 'Updating your job agent...' : 'Setting up your job agent...'}
            </span>
            <div class="h-3 w-3 rounded-full animate-pulse bg-orange-500"></div>
          </div>
          <p>We're scanning job sites for the best matches. You'll receive email updates with new jobs daily.</p>
        </div>
      {/if}
    {/if}
  </div>

  
</div>