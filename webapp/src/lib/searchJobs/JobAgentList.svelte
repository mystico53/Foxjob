<!-- src/lib/searchJobs/JobAgentList.svelte -->
<script>
  import { searchQueriesStore } from '$lib/stores/searchQueriesStore';
  import { authStore } from '$lib/stores/authStore';
  import { setJobAgentLoading, setJobAgentStatus } from '$lib/stores/userStateStore';
  import { getCloudFunctionUrl } from '$lib/config/environment.config';
  import { createEventDispatcher } from 'svelte';
  import { deleteDoc, doc } from 'firebase/firestore';
  import { db } from '$lib/firebase'; 
  
  const dispatch = createEventDispatcher();
  
  let uid;
  let deletingId = null;
  let error = null;
  
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
  
  // Format delivery time
  function formatDeliveryTime(time) {
    if (!time) return '8:00 AM';
    
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    
    if (hourNum === 0) return '12:00 AM';
    if (hourNum === 12) return '12:00 PM';
    
    if (hourNum < 12) {
      return `${hourNum}:${minute} AM`;
    } else {
      return `${hourNum-12}:${minute} PM`;
    }
  }
  
  // Function to delete job agent
  async function deleteJobAgent(agentId) {
    if (!uid || !agentId) return;
    
    deletingId = agentId;
    error = null;
    
    try {
        // Delete the document directly from Firestore
        const docRef = doc(db, 'users', uid, 'searchQueries', agentId);
        await deleteDoc(docRef);
        
        // Update the job agent status in the userStateStore
        if ($searchQueriesStore.queries.length <= 1) {
          setJobAgentStatus(false, null);
        }
        
    } catch (err) {
        error = err.message || 'An error occurred while deleting the job agent';
        console.error("Delete job agent error:", error);
    } finally {
        deletingId = null;
    }
  }
  
  // Function to handle edit button click
  function editJobAgent(query) {
    dispatch('edit', query);
  }
</script>

<div class="bg-white rounded-lg shadow p-6 mt-4">
  <h2 class="text-xl font-bold mb-4">Your Job Agents</h2>
  
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
              <img src="/src/assets/icon128.png" alt="Job Agent" class="w-12 h-12 rounded-lg" />
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