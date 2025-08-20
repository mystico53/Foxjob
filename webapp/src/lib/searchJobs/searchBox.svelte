<script>
  import { onMount } from 'svelte';
  import { scrapeStore, isLoading, totalJobs } from '$lib/stores/scrapeStore';
  import { authStore } from '$lib/stores/authStore';
  import { searchQueriesStore } from '$lib/stores/searchQueriesStore';
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
  import * as countryCodes from "country-codes-list";  
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  import Range from './Range.svelte';
  import EmailDelivery from './EmailDelivery.svelte';
  import InfoCard from '$lib/searchJobs/InfoCard.svelte';
  
  // Initialize dayjs plugins
  dayjs.extend(utc);
  dayjs.extend(timezone);

  // ✅ DECLARE ALL VARIABLES BEFORE ANY SUBSCRIPTIONS
  let uid;
  let scheduleSearch = true;
  let error = null;
  
  // Local reactive variables that come from the store
  let hasActiveAgent;
  let isCheckingAgent;
  let searchQueries = [];
  let searchQueriesLoading = false;
  
  // Variables to track editing state
  let editingAgentId = null;
  let isEditing = false;
  let showForm = false;
  let showAdvanced = false;
  let resumeUploaded = false;
  
  // For workplace type pill selection
  let selectedWorkplaceTypes = [];

  // Work preferences variables
  let workPreferences = {
    preferences: '',
    avoidance: ''
  };
  
  // Additional job titles array
  let additionalJobTitles = [''];
  
  // ✅ THESE MUST BE DECLARED BEFORE THE SUBSCRIPTIONS!
  let jobEmailsEnabled = true;
  let jobEmailsLoading = false;
  let deliveryTime = '08:00';
  let minimumScore = 50;
  
  // Form state variables
  let keywords = '';
  let location = '';
  let jobType = '';
  let experience = '';
  let workplaceType = '';
  let datePosted = 'Past month';
  let country = 'US';
  let limitPerInput = '50';
  let includeSimilarRoles = false;

  // Constants
  const timeOptions = [
    { value: '08:00', label: '8:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '18:00', label: '6:00 PM' },
  ];

  // Add these variables for InfoCard control
  let showInfoCard = false;
  let agentCreating = false;

  // ✅ NOW the subscriptions can safely use these variables
  const unsubJobAgent = jobAgentStore.subscribe(state => {
    hasActiveAgent = state.hasActiveAgent;
    isCheckingAgent = state.isLoading;
    // This now works because jobEmailsEnabled is declared above!
    if (state.hasActiveAgent) {
      jobEmailsEnabled = state.hasActiveAgent.isActive;
    }
  });
  
  // Add searchQueriesStore subscription
  const unsubSearchQueries = searchQueriesStore.subscribe(state => {
    searchQueries = state.queries;
    searchQueriesLoading = state.loading;
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
      unsubSearchQueries();
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
    // Get current timezone using Day.js
    const timezone = dayjs.tz.guess();
    // Get the offset in minutes
    const offsetMinutes = dayjs().utcOffset();
    // Convert to hours (e.g., 7 for PDT)
    const offsetHours = offsetMinutes / 60;
    
    return {
      offsetHours,
      timezone
    };
  }

  function getUnixTimestampForDeliveryTime(timeString) {
    // Parse the delivery time (format: "HH:MM")
    const [hoursStr, minutesStr] = timeString.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Create a Day.js object for today at the specified local time
    const localTime = dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
    
    // Convert to UTC time
    const utcTime = localTime.utc();
    
    // Get the UTC hours and minutes
    const utcHours = utcTime.hour();
    const utcMinutes = utcTime.minute();
    
    // Format as HH:MM in UTC
    const utcTimeString = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
    
    return {
      localTimeString: timeString,
      utcTimeString: utcTimeString,
      timestamp: localTime.valueOf(), // Unix timestamp in milliseconds
      utcTimestamp: utcTime.valueOf() // UTC Unix timestamp in milliseconds
    };
  }

  // Add new additional job title field
  function addJobTitleField() {
    if (additionalJobTitles.length < 5) {
      additionalJobTitles = [...additionalJobTitles, ''];
    }
  }
  
  // Remove additional job title field
  function removeJobTitleField(index) {
    additionalJobTitles = additionalJobTitles.filter((_, i) => i !== index);
  }
  
  // Update job title at specific index
  function updateJobTitle(index, value) {
    additionalJobTitles[index] = value;
    additionalJobTitles = [...additionalJobTitles]; // Trigger reactivity
  }

  // Check if user already has an active search query
  async function checkExistingQueries() {
    setJobAgentLoading(true);
    try {
      // Wait for searchQueriesStore to load
      if (searchQueriesLoading) {
        await new Promise(resolve => {
          const unsubscribe = searchQueriesStore.subscribe(state => {
            if (!state.loading) {
              unsubscribe();
              resolve();
            }
          });
        });
      }

      // Use the data from searchQueriesStore
      if (searchQueries.length > 0) {
        // Get the first query (assuming it's the most recent)
        const query = searchQueries[0];
        setJobAgentStatus(true, query.id, query.isActive);
        jobEmailsEnabled = query.isActive;
      } else {
        // No queries found
        setJobAgentStatus(false, null);
        jobEmailsEnabled = true; // Default to true for new queries
      }
    } catch (error) {
      console.error("Error checking queries:", error);
      setJobAgentStatus(false, null);
      jobEmailsEnabled = true; // Default to true on error
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
      await setDoc(prefDocRef, {
        preferences: workPreferences.preferences,
        avoidance: workPreferences.avoidance,
        updatedAt: new Date()
      }, { merge: true });
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      // Reset job agent status in the store
      setJobAgentStatus(false, null);
      
      // Reset form and editing state
      isEditing = false;
      editingAgentId = null;
      showForm = false;
      jobEmailsEnabled = true; // Reset to default
      
    } catch (err) {
      error = err.message || 'An error occurred while deleting the job agent';
    } finally {
      setJobAgentLoading(false);
    }
  }

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

  // Function to handle the edit event from JobAgentList
  function handleEditAgent(event) {
    const query = event.detail;
    editingAgentId = query.id;
    isEditing = true;
    showForm = true;  // Show the form when editing
    
    // Set jobEmailsEnabled based on query's isActive state
    jobEmailsEnabled = query.isActive;
    
    // Extract search parameters from the first item in the array
    const searchParam = query.searchParams && query.searchParams.length > 0 
      ? query.searchParams[0] 
      : {};
    
    // Use mainKeyword if present, otherwise parse the first quoted term from keyword
    if (searchParam.mainKeyword) {
      keywords = searchParam.mainKeyword;
    } else if (searchParam.keyword) {
      // Try to extract the first quoted term
      const match = searchParam.keyword.match(/"([^"]+)"/);
      keywords = match ? match[1] : searchParam.keyword;
    } else {
      keywords = '';
    }
    location = searchParam.location || '';
    country = searchParam.country || 'US';
    jobType = searchParam.job_type || '';
    experience = searchParam.experience_level || '';
    includeSimilarRoles = searchParam.includeSimilarRoles || false; // Set this from the search param
    minimumScore = query.minimumScore || 50; // Load minimumScore with default if not present
    
    // Set selected workplace type - the API accepts only one value
    if (searchParam.remote) {
      // Just select the first value if there's a comma-separated list
      const remoteValue = searchParam.remote.split(',')[0].trim();
      selectedWorkplaceTypes = [remoteValue];
    } else {
      selectedWorkplaceTypes = [];
    }
    
    datePosted = searchParam.time_range || 'Past 24 hours';
    
    // Handle the delivery time conversion from UTC to local
    if (query.deliveryTime) {
      // Parse UTC time
      const [utcHourStr, utcMinuteStr] = query.deliveryTime.split(':');
      const utcHour = parseInt(utcHourStr, 10);
      const utcMinute = parseInt(utcMinuteStr, 10);
      
      // Create a UTC dayjs object and convert to local
      const utcTime = dayjs.utc().hour(utcHour).minute(utcMinute);
      const localTime = utcTime.local();
      
      // Get the local hour
      const localHour = localTime.hour();
      
      // Map to closest of our three options
      if (localHour < 10) {
        // Before 10 AM -> 8 AM
        deliveryTime = '08:00';
      } else if (localHour < 15) {
        // Between 10 AM and 3 PM -> 12 PM
        deliveryTime = '12:00';
      } else {
        // 3 PM or later -> 6 PM
        deliveryTime = '18:00';
      }
    } else {
      deliveryTime = '08:00'; // Default to 8:00 AM
    }
    
    // Populate additional job titles if present, else default to ['']
    if (Array.isArray(searchParam.additionalJobTitles) && searchParam.additionalJobTitles.length > 0) {
      additionalJobTitles = [...searchParam.additionalJobTitles];
    } else {
      additionalJobTitles = [''];
    }
    
    // Convert numeric limit to string for form input - keep limit as string now
    limitPerInput = query.limit ? query.limit.toString() : '50';
    
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
    limitPerInput = '50';
    deliveryTime = '08:00';
    showAdvanced = false;
    includeSimilarRoles = false; // Reset the checkbox
    additionalJobTitles = [''];
    minimumScore = 50; // Reset the minimum score threshold to default
    
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
      limitPerInput = '50';
      deliveryTime = '08:00';
      showAdvanced = false;
      includeSimilarRoles = false; // Reset the checkbox
      additionalJobTitles = [''];
      minimumScore = 50; // Reset minimum score threshold to default
      
      // Load current preferences
      loadWorkPreferences();
    }
  }
  
  // Toggle advanced options visibility
  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }
  
  // Generate the formatted keyword string with "OR" operators for search
  function formatKeywords(mainKeyword, additionalKeywords) {
    let validAdditionalKeywords = additionalKeywords.filter(title => title.trim() !== '');
    const trimmedMain = mainKeyword.trim();
    // Only quote the main keyword if not already quoted
    let formattedKeywords = trimmedMain.startsWith('"') && trimmedMain.endsWith('"')
      ? trimmedMain
      : `"${trimmedMain}"`;
    validAdditionalKeywords.forEach(title => {
      formattedKeywords += ` OR "${title.trim()}"`;
    });
    return formattedKeywords;
  }
  
  // Generate the display format for the saved job agent (main term + count)
  function formatKeywordsForDisplay(mainKeyword, additionalKeywords) {
    let validAdditionalKeywords = additionalKeywords.filter(title => title.trim() !== '');
    
    if (validAdditionalKeywords.length === 0) {
      return mainKeyword.trim();
    }
    
    return `${mainKeyword.trim()} + ${validAdditionalKeywords.length} more`;
  }
  
  async function searchJobs() {
    isLoading.set(true);
    error = null;

    // Validate required fields
    if (!keywords) {
      error = 'Please enter a job title to search';
      isLoading.set(false);
      return;
    }
    
    if (!location) {
      error = 'Please enter a location';
      isLoading.set(false);
      return;
    }
    
    if (!country) {
      error = 'Please enter a country code';
      isLoading.set(false);
      return;
    }

    try {
      // Save work preferences first
      await saveWorkPreferences();
      
      // Use only the first selected workplace type - API doesn't accept multiple values
      const remoteValue = selectedWorkplaceTypes.length > 0 ? selectedWorkplaceTypes[0] : '';
      
      // Format the keywords with OR operators if fuzzy match is enabled and additional titles exist
      const formattedKeywords = includeSimilarRoles 
        ? formatKeywords(keywords, additionalJobTitles)
        : keywords.trim();
        
      // Format display keywords for the UI (simpler version with count)
      const displayKeywords = includeSimilarRoles && additionalJobTitles.some(title => title.trim() !== '')
        ? formatKeywordsForDisplay(keywords, additionalJobTitles)
        : keywords.trim();
      
      const searchPayload = [{
        keyword: formattedKeywords,
        displayKeyword: displayKeywords, // Add the display version
        location: location?.trim() || '',
        country: country || 'US', 
        time_range: datePosted || 'Past 24 hours',
        job_type: jobType || '',
        experience_level: experience || '',
        remote: remoteValue, // Use only the first selected value
        includeSimilarRoles: includeSimilarRoles, // Add the new flag to the payload
        // Add additionalJobTitles only if fuzzy match is enabled
        ...(includeSimilarRoles ? { additionalJobTitles: additionalJobTitles.filter(title => title.trim() !== '') } : {}),
        // Always save the main keyword for reliable editing
        mainKeyword: keywords
      }];

      // Use the environment config to determine the correct URL
      const searchUrl = getCloudFunctionUrl('searchBright');
      
      // Parse the limit from the radio button value
      const limit = parseInt(limitPerInput);
      
      // Get time information in both local and UTC formats
      const timeInfo = getUnixTimestampForDeliveryTime(deliveryTime);
      const timezoneInfo = getTimezoneOffset();
      
      const requestBody = {
        userId: uid,
        searchParams: searchPayload,
        limit: limit,
        minimumScore: minimumScore,
        schedule: {
          frequency: 'daily',
          runImmediately: true,
          deliveryTime: timeInfo.utcTimeString,
          timeInfo: {
            timezoneOffset: timezoneInfo.offsetHours,
            timezone: timezoneInfo.timezone,
            localTime: timeInfo.localTimeString,
            localTimestamp: timeInfo.timestamp,
            utcTime: timeInfo.utcTimeString,
            utcTimestamp: timeInfo.utcTimestamp
          },
          isActive: jobEmailsEnabled
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
      
      // Show the InfoCard after successful creation (not on edit)
      if (!isEditing) {
        showInfoCard = true;
        agentCreating = true;
        setTimeout(() => {
          agentCreating = false;
        }, 2000);
      }
      
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

  function dismissInfoCard() {
    showInfoCard = false;
  }

  // Function to update email delivery status
  async function updateEmailDelivery(val) {
    jobEmailsLoading = true;
    try {
      const searchQueryRef = doc(db, 'users', uid, 'searchQueries', hasActiveAgent.agentId);
      
      if (!val) {
        // If turning off, just update Firestore directly
        await updateDoc(searchQueryRef, {
          isActive: false
        });
        // Update the job agent store
        setJobAgentStatus(true, hasActiveAgent.agentId, false);
      } else {
        // If turning on, get current data and call searchBright
        const queryDoc = await getDoc(searchQueryRef);
        const queryData = queryDoc.data();
        
        const searchUrl = getCloudFunctionUrl('searchBright');
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: uid,
            searchParams: queryData.searchParams,
            limit: queryData.limit || 100,
            schedule: {
              searchId: hasActiveAgent.agentId,
              frequency: queryData.frequency || 'daily',
              isActive: true,
              deliveryTime: queryData.deliveryTime || '08:00'
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Update the job agent store
        setJobAgentStatus(true, hasActiveAgent.agentId, true);
      }
      
      // Update local state
      jobEmailsEnabled = val;
    } catch (error) {
      console.error('Error updating email status:', error);
      jobEmailsEnabled = !val;
    } finally {
      jobEmailsLoading = false;
    }
  }

  function setDeliveryTime(val) { deliveryTime = val; }
  function setMinimumScore(val) { minimumScore = val; }
</script>

<style>
</style>

<!-- Main container that holds all components -->
<div class="mb-4">
  <!-- Show InfoCard at the top -->
  <InfoCard 
    show={showInfoCard}
    loading={agentCreating}
    on:dismiss={dismissInfoCard}
  />

  <!-- Card with white background containing title, button, and agent list -->
  <div class="bg-white rounded-lg shadow p-6 mb-4">
    <!-- Header with title and Create Agent button based on active agent status -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Your Job Agents</h2>
      <!-- Button styling based on whether there's an active agent and resume is uploaded -->
      {#if (!hasActiveAgent?.agentId || isEditing) && resumeUploaded}
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
      {#if searchQueriesLoading || isCheckingAgent}
        <div class="flex justify-center items-center py-4">
          <div class="h-6 w-6 rounded-full animate-pulse bg-orange-500"></div>
          <span class="ml-3">Loading your job agents...</span>
        </div>
      {:else if searchQueries.length === 0}
        <p class="text-gray-500 text-center py-8">Your job agents will be listed here.</p>
      {:else}
        <JobAgentList 
          on:edit={handleEditAgent}
          on:delete={() => {
            // Reset states after successful deletion
            isEditing = false;
            editingAgentId = null;
            showForm = false;
            jobEmailsEnabled = true;
          }}
        />
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
              {#if keywords && /(AND|OR|,|&)(?!\s)/i.test(keywords)}
                <p class="mt-2 text-red-600 text-sm">
                  ⚠ Do not use AND OR COMMA in your job title. To add additional job titles, use the checkbox below 
                </p>
              {/if}
            </div>

            <!-- Add Additional Job Title Checkbox -->
            <div class="flex items-center mb-4">
              <input 
                type="checkbox" 
                id="includeSimilarRoles" 
                bind:checked={includeSimilarRoles}
                class="h-5 w-5 text-orange-500"
              />
              <label for="includeSimilarRoles" class="ml-2 block text-sm font-medium text-gray-700">
                Add additional job titles
                <span class="ml-1 inline-block text-gray-500" title="This feature is still in development">
                  <iconify-icon icon="mdi:information-outline" width="16" height="16"></iconify-icon>
                </span>
              </label>
            </div>

            <!-- Additional Job Titles section - only show when checkbox is checked -->
            {#if includeSimilarRoles}
              <div class="mb-4">
                {#each additionalJobTitles as title, index}
                  <div class="flex items-center mb-2">
                    <input
                      id={`additionalJobTitle-${index}`}
                      type="text"
                      placeholder="Include additional job title"
                      bind:value={additionalJobTitles[index]}
                      on:input={(e) => updateJobTitle(index, e.target.value)}
                      class="flex-grow px-4 py-2 border rounded-lg mr-2"
                    />
                    
                    <!-- Add button for the first field, or fields that aren't the last one -->
                    {#if index === additionalJobTitles.length - 1 && additionalJobTitles.length < 5}
                      <button 
                        type="button"
                        on:click={addJobTitleField}
                        class="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                        title="Add another job title"
                      >
                        <span class="flex items-center justify-center w-5 h-5">+</span>
                      </button>
                    {:else if additionalJobTitles.length > 1}
                      <!-- Remove button for extra fields -->
                      <button 
                        type="button"
                        on:click={() => removeJobTitleField(index)}
                        class="p-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
                        title="Remove job title"
                      >
                        <span class="flex items-center justify-center w-5 h-5">×</span>
                      </button>
                    {:else}
                      <!-- Empty spacer to maintain alignment -->
                      <div class="w-9 h-9"></div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Two column layout for Location and Country -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <!-- Location -->
              <div>
                <label for="location" class="block font-bold mb-2">Location *</label>
                <input
                  id="location"
                  type="text"
                  bind:value={location}
                  placeholder="City, State, region"
                  class="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <!-- Country -->
              <div>
                <label for="country" class="block font-bold mb-2">Country *</label>
                <select
                  id="country"
                  bind:value={country}
                  class="w-full px-4 py-2 border rounded-lg"
                >
                  {#each Object.entries(countryCodes.customList('countryCode', '{countryNameEn}')) as [code, name]}
                    <option value={code}>{name} ({code})</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Workplace Type as Pills - Single Selection Only -->
            <div class="mb-4">
              <label id="workplace-type-label" class="block font-bold mb-2" for="workplace-type-group">Workplace Type</label>
              <div id="workplace-type-group" class="flex flex-wrap gap-2 items-center" role="group" aria-labelledby="workplace-type-label">
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
                {#if selectedWorkplaceTypes.length > 0}
                  <span class="text-gray-500 text-sm ml-2">Heads up: This might result in less results, select ANY for more results</span>
                {/if}
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
            
            <EmailDelivery
              {jobEmailsEnabled}
              {updateEmailDelivery}
              {deliveryTime}
              {setDeliveryTime}
              {timeOptions}
              {minimumScore}
              {setMinimumScore}
              isLoading={jobEmailsLoading}
            />
            
            <!-- REPLACED: Daily Match Limit with Radio Buttons - KEEP THIS PART -->
            <div>
              <label id="job-matches-label" class="block font-bold mb-2" for="job-matches-group">You'll get matched with max jobs per day</label>
              <div id="job-matches-group" class="flex items-center h-11" role="radiogroup" aria-labelledby="job-matches-label">      
                  <!-- Radio for 1 -->
                  <div class="flex items-center">
                    <input 
                      type="radio" 
                      id="limit1" 
                      name="limitPerInput" 
                      value="1" 
                      bind:group={limitPerInput}
                      class="mr-2 h-5 w-5"
                    />
                    <label for="limit1" class="text-base mr-4">1</label>
                  </div>
                <!-- Radio for 10 -->
                <div class="flex items-center">
                  <input 
                    type="radio" 
                    id="limit10" 
                    name="limitPerInput" 
                    value="10" 
                    bind:group={limitPerInput}
                    class="mr-2 h-5 w-5"
                  />
                  <label for="limit10" class="text-base mr-4">10</label>
                </div>
                
                <!-- Radio for 50 -->
                <div class="flex items-center">
                  <input 
                    type="radio" 
                    id="limit50" 
                    name="limitPerInput" 
                    value="50" 
                    bind:group={limitPerInput}
                    class="mr-2 h-5 w-5"
                  />
                  <label for="limit50" class="text-base mr-4">50</label>
                  
                  <!-- Beta Test button with dark grey styling -->
                  <button 
                    type="button"
                    class="py-1 px-3 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg ml-2"
                  >
                    Beta Test
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex items-center space-x-4 mt-8">
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
                class="flex-grow py-3 px-4 {$isLoading ? 'bg-orange-400' : (keywords && /(AND|OR|,|&)(?!\s)/i.test(keywords) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600')} text-white font-bold rounded-lg flex items-center justify-center"
                disabled={$isLoading || (keywords && /(AND|OR|,|&)(?!\s)/i.test(keywords))}
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

            {#if keywords && /(AND|OR|,|&)(?!\s)/i.test(keywords)}
              <p class="mt-4 text-red-600 text-sm">
                ⚠ Do not use AND OR , etc. To add additional job titles, use the checkbox below
              </p>
            {/if}

            {#if error}
              <div class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            {/if}
          </form>
        {/if}
      </div>
    {/if}
  </div>
</div>