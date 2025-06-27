<!-- src/lib/searchJobs/JobAgentList.svelte -->
<script>
  import { searchQueriesStore } from '$lib/stores/searchQueriesStore';
  import { authStore } from '$lib/stores/authStore';
  import { setJobAgentLoading, setJobAgentStatus } from '$lib/stores/userStateStore';
  import { getCloudFunctionUrl } from '$lib/config/environment.config';
  import { createEventDispatcher, onMount } from 'svelte';
  import { deleteDoc, doc } from 'firebase/firestore';
  import { db } from '$lib/firebase'; 
  import foxIcon from '../../assets/icon128.png';
  import InfoCard from '$lib/searchJobs/InfoCard.svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  
  // Initialize dayjs plugins
  dayjs.extend(utc);
  dayjs.extend(timezone);
  
  const dispatch = createEventDispatcher();
  
  let uid;
  let deletingId = null;
  let error = null;
  let showInfoCard = false; // Start hidden by default
  let agentCreating = false; // Don't start in loading state by default
  
  authStore.subscribe(user => {
    uid = user?.uid;
  });
  
  // Format date for display
  function formatDate(date) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }
  
  // Format search parameters for display
  function formatSearchParams(params) {
    if (!params || !params.length) return 'No parameters';
    const param = params[0]; // Get the first search param
    
    let parts = [];
    if (param.keyword) parts.push(`${param.keyword}`);
    if (param.location) parts.push(`in ${param.location}`);
    if (param.job_type) parts.push(param.job_type);
    
    return parts.join(' ') || 'Custom search';
  }
  
  // Format delivery time - UPDATED to convert from UTC to local time
  function formatDeliveryTime(time) {
    if (!time) return '8:00 AM';
    
    // Parse the time string (HH:MM format in UTC)
    const [hourStr, minuteStr] = time.split(':');
    const utcHour = parseInt(hourStr, 10);
    const utcMinute = parseInt(minuteStr, 10);
    
    // Create a UTC dayjs object with today's date and the specified time
    const utcTime = dayjs.utc().hour(utcHour).minute(utcMinute).second(0);
    
    // Convert to local time
    const localTime = utcTime.local();
    
    // Format in 12-hour format with AM/PM
    return localTime.format('h:mm A');
  }
  
  // Function to delete job agent
  async function deleteJobAgent(agentId) {
    if (!uid || !agentId) return;
    
    deletingId = agentId;
    error = null;
    
    try {
      // Delete directly from Firestore
      await deleteDoc(doc(db, 'users', uid, 'searchQueries', agentId));
      
      // The searchQueriesStore will automatically update due to the onSnapshot listener
      setJobAgentStatus(false, null);
    } catch (error) {
      error = error.message || 'An error occurred while deleting the job agent';
    } finally {
      deletingId = null;
    }
  }
  
  // Function to handle edit button click
  function editJobAgent(query) {
    dispatch('edit', query);
  }
  
  // Function to dismiss info card
  function dismissInfoCard() {
    showInfoCard = false;
    // Ensure localStorage is set when dismissed
    localStorage.setItem('hasSeenJobAgentCreationMessage', 'true');
  }
  
  onMount(() => {
    // Check if this is the first time creating a job agent
    const hasSeenJobAgentCreationMessage = localStorage.getItem('hasSeenJobAgentCreationMessage');
    
    // Subscribe to store to detect when queries are available
    const unsubscribe = searchQueriesStore.subscribe(store => {
      // If user hasn't seen the message before AND there's at least one query
      if (!hasSeenJobAgentCreationMessage && !store.loading && store.queries.length > 0) {
        showInfoCard = true;
        
        // Set a short loading state for visual feedback
        agentCreating = true;
        setTimeout(() => {
          agentCreating = false;
        }, 2000);
        
        // Save to localStorage so it won't show again
        localStorage.setItem('hasSeenJobAgentCreationMessage', 'true');
      }
    });
    
    return unsubscribe;
  });
</script>

<InfoCard 
  message="Your agent is being created! You can expect an email with first results within the next few minutes."
  show={showInfoCard}
  loading={agentCreating}
  on:dismiss={dismissInfoCard}
/>

<div class="bg-white rounded-lg shadow p-6 mt-4">
  {#if $searchQueriesStore.loading}
    <div class="flex justify-center items-center py-4">
      <div class="h-6 w-6 rounded-full animate-pulse bg-orange-500"></div>
      <span class="ml-3">Loading your job agents...</span>
    </div>
  {:else if $searchQueriesStore.queries.length === 0}
    <div class="py-4 text-center text-gray-500">
      <p>You don't have any job agents yet.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each $searchQueriesStore.queries as query}
        <div class="border rounded-lg p-4 hover:bg-gray-50">
          <div class="flex items-center">
            <!-- Icon avatar on the left, now centered vertically -->
            <div class="flex-shrink-0 mr-4 flex items-center justify-center">
              <img src={foxIcon} alt="Job Agent" class="w-12 h-12 rounded-lg" />
            </div>
            
            <!-- Main content pushed to the right -->
            <div class="flex-grow">
              <div class="flex justify-between items-start">
                <!-- Title at the top -->
                <h3 class="font-bold">{formatSearchParams(query.searchParams)}</h3>
                
                <!-- Active indicator at top right -->
                <div class="inline-flex items-center {query.isActive ? 'text-green-600' : 'text-red-600'}">
                  <span class="h-2 w-2 rounded-full {query.isActive ? 'bg-green-600' : 'bg-red-600'} mr-1"></span>
                  {query.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <!-- Modified section: Timing info and Actions in same row -->
              <div class="flex justify-between items-center text-sm text-gray-600 mt-2">
                <div class="flex items-center flex-wrap">
                  {#if query.limit !== undefined && query.limit !== null}
                    <span class="inline-flex items-center mr-4 text-gray-600">
                      <iconify-icon icon="tabler:stack-2" width="18" height="18" class="mr-1"></iconify-icon>
                      matches {query.limit} job{query.limit !== 1 ? 's' : ''}
                    </span>
                  {/if}
                  
                  <span class="inline-flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {query.frequency || 'daily'}, {formatDeliveryTime(query.deliveryTime)} 
                  </span>
                  
                  {#if query.lastRun}
                    <span class="inline-flex items-center ml-4 text-gray-600">
                      Last run: {formatDate(query.lastRun)}
                    </span>
                  {/if}
                </div>
                
                <!-- Actions moved to the right side of the timing info -->
                <div class="flex">
                  <button 
                    on:click={() => editJobAgent(query)}
                    class="text-sm p-1 text-black hover:text-gray-700 rounded-full"
                    aria-label="Edit"
                  >
                    <iconify-icon icon="mynaui:edit-solid" width="18" height="18"></iconify-icon>
                  </button>
                  
                  <button 
                    on:click={() => deleteJobAgent(query.id)}
                    class="text-sm p-1 text-black hover:text-gray-700 rounded-full ml-1" 
                    disabled={deletingId === query.id}
                    aria-label="Delete"
                  >
                    {#if deletingId === query.id}
                      <div class="h-4 w-4 rounded-full animate-pulse bg-gray-400"></div>
                    {:else}
                      <iconify-icon icon="solar:trash-bin-trash-bold" width="18" height="18"></iconify-icon>
                    {/if}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if error}
    <div class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
      {error}
    </div>
  {/if}
  
  {#if $searchQueriesStore.error}
    <div class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
      {$searchQueriesStore.error}
    </div>
  {/if}
</div>