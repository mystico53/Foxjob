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
  import { collection, query, where, limit, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
  import { getFirestore } from 'firebase/firestore';
  
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
  
  // New variable to control form visibility
  let showForm = false;
  
  // New variable for advanced options visibility
  let showAdvanced = false;
  
  // New variable to track resume upload status
  let resumeUploaded = false;
  
  // For workplace type pill selection
  let selectedWorkplaceTypes = [];

  // Work preferences variables
  let workPreferences = {
    preferences: '',
    avoidance: ''
  };
  
  // Subscribe to the job agent store
  const unsubJobAgent = jobAgentStore.subscribe(state => {
    hasActiveAgent = state.hasActiveAgent;
    isCheckingAgent = state.isLoading;
  });
  
  // Subscribe to the userStateStore to get resume status
  const unsubUserState = userStateStore.subscribe(state => {
    resumeUploaded = state.resume.isUploaded;
  });
  
  // Unsubscribe when component is destroyed
  onMount(() => {
    return () => {
      unsubJobAgent();
      unsubUserState();
    };
  });

  authStore.subscribe(user => {
    uid = user?.uid;
    if (uid) {
      checkExistingQueries();
      loadWorkPreferences();
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
  
  // Function to load work preferences
  async function loadWorkPreferences() {
    try {
      const prefDocRef = doc(db, 'users', uid, 'UserCollections', 'work_preferences');
      const prefSnap = await getDoc(prefDocRef);
      
      if (prefSnap.exists()) {
        const data = prefSnap.data();
        workPreferences = {
          preferences: data.preferences || '',
          avoidance: data.avoidance || ''
        };
      }
    } catch (err) {
      console.error('Error loading work preferences:', err);
    }
  }
  
  // Function to save work preferences
  async function saveWorkPreferences() {
    try {
      const prefDocRef = doc(db, 'users', uid, 'UserCollections', 'work_preferences');
      
      // First check if document exists
      const prefSnap = await getDoc(prefDocRef);
      
      const updateData = {
        preferences: workPreferences.preferences,
        avoidance: workPreferences.avoidance,
        updatedAt: new Date(),
        status: 'completed'
      };
      
      if (prefSnap.exists()) {
        // Update existing document
        await updateDoc(prefDocRef, updateData);
      } else {
        // Create new document
        await setDoc(prefDocRef, {
          ...updateData,
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.error('Error saving work preferences:', err);
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
  let datePosted = 'Past 24 hours'; // Default to 24 hours
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
  function handleEditAgent(event) {
    const query = event.detail;
    editingAgentId = query.id;
    isEditing = true;
    showForm = true;  // Show the form when editing
    
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
    
    // Set selected workplace type - the API accepts only one value
    if (searchParam.remote) {
      // Just select the first value if there's a comma-separated list
      const remoteValue = searchParam.remote.split(',')[0].trim();
      selectedWorkplaceTypes = [remoteValue];
    } else {
      selectedWorkplaceTypes = [];
    }
    
    datePosted = searchParam.time_range || 'Past 24 hours';
    
    // Make sure to set the proper delivery time
    deliveryTime = query.deliveryTime || '08:00';
    
    // Convert numeric limit to string for form input
    limitPerInput = query.limit ? query.limit.toString() : '1';
    
    // Open advanced section if any of those fields are filled
    showAdvanced = !!(jobType || experience || datePosted !== 'Past 24 hours');
    
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
    
    // Load work preferences to populate those fields
    loadWorkPreferences();
  }
  
  // Cancel editing and reset form
  function cancelEdit() {
    isEditing = false;
    editingAgentId = null;
    showForm = false;  // Hide the form when canceling
    
    // Reset form fields
    keywords = '';
    location = '';
    jobType = '';
    experience = '';
    selectedWorkplaceTypes = [];
    datePosted = 'Past 24 hours';
    country = 'US';
    limitPerInput = 1;
    deliveryTime = '08:00';
    showAdvanced = false;
    
    // Reset preferences
    workPreferences = {
      preferences: '',
      avoidance: ''
    };
  }
  
  // Toggle form visibility
  function toggleForm() {
    showForm = !showForm;
    if (showForm) {
      // Reset form fields when showing form
      isEditing = false;
      editingAgentId = null;
      keywords = '';
      location = '';
      jobType = '';
      experience = '';
      selectedWorkplaceTypes = [];
      datePosted = 'Past 24 hours';
      country = 'US';
      limitPerInput = 1;
      deliveryTime = '08:00';
      showAdvanced = false;
      
      // Load current preferences
      loadWorkPreferences();
    }
  }
  
  // Toggle advanced options visibility
  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
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
      // Save work preferences first
      await saveWorkPreferences();
      
      // Use only the first selected workplace type - API doesn't accept multiple values
      const remoteValue = selectedWorkplaceTypes.length > 0 ? selectedWorkplaceTypes[0] : '';
      
      const searchPayload = [{
        keyword: keywords.trim(),
        location: location?.trim() || '',
        country: country || 'US', 
        time_range: datePosted || 'Past 24 hours',
        job_type: jobType || '',
        experience_level: experience || '',
        remote: remoteValue, // Use only the first selected value
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
      showForm = false;  // Hide the form after successful submission
      
    } catch (err) {
      error = err.message || 'An error occurred while searching for jobs';
    } finally {
      isLoading.set(false);
    }
  }
</script>

<!-- Main container that holds all components -->
<div class="mb-4">
  <!-- Card with white background containing title, button, and agent list -->
  <div class="bg-white rounded-lg shadow p-6 mb-4">
    <!-- Header with title and Create Agent button based on active agent status -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Your Job Agents</h2>
      <!-- Button styling based on whether there's an active agent and resume is uploaded -->
      {#if (!hasActiveAgent || isEditing) && resumeUploaded}
      <button 
        on:click={toggleForm}
        class="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
        title="Create a job agent"
      >
        Create Agent
      </button>
    {/if}
    </div>
    
    <!-- Job Agent List or empty state message -->
    <div>
      {#if !hasActiveAgent && !isCheckingAgent}
        <p class="text-gray-500 text-center py-8">Your job agents will be listed here.</p>
      {:else}
        <JobAgentList on:edit={handleEditAgent} />
      {/if}
    </div>
    
    <!-- Form container with light gray background -->
    {#if showForm || isCheckingAgent}
      <div class="bg-gray-100 rounded-lg p-6 mt-6" id="job-agent-form">
        <!-- Only show form header when not in checking state -->
        {#if !isCheckingAgent && showForm}
          <h2 class="text-xl font-bold mb-2">
            {isEditing ? 'Edit your Agent' : 'Set up your Agent'}
          </h2>
          
          <p class="mb-6">A FoxJob Agent automatically scans job sites and brings the best matches to your inbox daily.</p>
        {/if}
        
        {#if isCheckingAgent}
          <!-- Loading state while checking for existing queries -->
          <div class="flex justify-center items-center py-8">
            <div class="h-6 w-6 rounded-full animate-pulse bg-orange-500"></div>
            <span class="ml-3">Checking your account...</span>
          </div>
        {:else if showForm}
          <!-- Show the form when the Create Agent button is clicked or when editing -->
          <form on:submit|preventDefault={searchJobs}>
            <!-- Job Title -->
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

            <!-- Two column layout for Location and Country -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            </div>

            <!-- Workplace Type as Pills - Single Selection Only -->
            <div class="mb-4">
              <label class="block font-bold mb-2">Workplace Type</label>
              <div class="flex flex-wrap gap-2">
                {#each workplaceTypes as type}
                  <button 
                    type="button"
                    class="px-4 py-2 rounded-full text-sm font-medium {selectedWorkplaceTypes.includes(type.value) ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                    on:click={() => {
                      // Single selection only - replace the current selection
                      selectedWorkplaceTypes = [type.value];
                    }}
                  >
                    {type.label}
                  </button>
                {/each}
                <!-- Add "Any" option to clear selection -->
                <button 
                  type="button"
                  class="px-4 py-2 rounded-full text-sm font-medium {selectedWorkplaceTypes.length === 0 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                  on:click={() => {
                    selectedWorkplaceTypes = [];
                  }}
                >
                  Any
                </button>
              </div>
            </div>

            <!-- Advanced Options Collapsible -->
            <div class="mb-4">
              <button 
                type="button" 
                class="flex items-center text-orange-500 font-medium hover:text-orange-600 focus:outline-none"
                on:click={toggleAdvanced}
              >
                <span class="mr-2">{showAdvanced ? '▼' : '►'}</span>
                Advanced Options
              </button>
              
              {#if showAdvanced}
                <div class="mt-3 space-y-4 pl-4 border-l-2 border-orange-200">
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

                  <!-- Date Posted -->
                  <div>
                    <label for="datePosted" class="block font-bold mb-2">Date Posted</label>
                    <select id="datePosted" class="w-full px-4 py-2 border rounded-lg" bind:value={datePosted}>
                      <option value="Past 24 hours">Last 24 hours</option>
                      {#each dateOptions as option}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              {/if}
            </div>
            
            <!-- Preferences Section - Added below advanced options -->
            <div class="mb-6 mt-6 bg-blue-50 p-4 rounded-md">
              <h3 class="text-lg font-bold mb-3">Prompt your agent</h3>
              <p class="text-gray-700 mb-4">Tell the agent what you like and what not. Just write it down, industry, company name, culture, team size, etc.</p>
              
              <!-- Preferences Field -->
              <div class="mb-4">
                <label for="preferences" class="block font-bold mb-2">Preferences</label>
                <textarea
                  id="preferences"
                  bind:value={workPreferences.preferences}
                  placeholder="What you're looking for in a role..."
                  rows="3"
                  class="w-full px-4 py-2 border rounded-lg"
                ></textarea>
              </div>
              
              <!-- Avoidance Field -->
              <div>
                <label for="avoidance" class="block font-bold mb-2">What to avoid</label>
                <textarea
                  id="avoidance"
                  bind:value={workPreferences.avoidance}
                  placeholder="What you want to avoid in a role..."
                  rows="3"
                  class="w-full px-4 py-2 border rounded-lg"
                ></textarea>
              </div>
            </div>
            
            <!-- Divider Line -->
            <hr class="my-6 border-gray-300" />
            
            <!-- Delivery settings -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                <label for="limitPerInput" class="block font-bold mb-2">Daily Match Limit (max 50)</label>
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
              <!-- Cancel button -->
              <button
                type="button"
                on:click={toggleForm}
                class="py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg"
                disabled={$isLoading}
              >
                Cancel
              </button>
              
              <!-- Create/Update Job Agent Button -->
              <button
                type="submit"
                class="flex-grow py-3 px-4 {$isLoading ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold rounded-lg flex items-center justify-center"
                disabled={$isLoading}
              >
                {#if $isLoading}
                  <iconify-icon icon="svg-spinners:pulse" width="24" height="24" class="mr-2"></iconify-icon>
                  Saving
                {:else if isEditing}
                  Update Job Agent
                {:else}
                  Create Job Agent
                {/if}
              </button>
            </div>
          </form>

          {#if error}
            <div class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>