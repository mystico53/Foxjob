<!-- EnhancedAdminDashboard.svelte -->
<script>
    import { onMount } from 'svelte';
    import { collection, collectionGroup, query, orderBy, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore';
    import { auth } from '$lib/firebase';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import localizedFormat from 'dayjs/plugin/localizedFormat';
    import BatchJobsList from '$lib/admincomponents/BatchJobsList.svelte';
    
    // Initialize dayjs plugins
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(localizedFormat);
    
    // Firebase instance
    const db = getFirestore();
    
    // State variables
    let users = [];
    let searchQueries = [];
    let jobBatches = [];
    let isLoading = true;
    let error = null;
    let selectedUser = null;
    let selectedQuery = null;
    let selectedBatch = null;
    let collectionErrors = {};
    let adminClaims = null;
    
    // Fetch all data on mount
    onMount(async () => {
      try {
        isLoading = true;
        error = null;
        
        // First check admin claims
        if (!auth.currentUser) {
          throw new Error('Not authenticated');
        }
        
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        adminClaims = idTokenResult.claims;
        
        if (!adminClaims.admin) {
          throw new Error('User does not have admin claim');
        }
        
        // Fetch data from each collection independently to isolate errors
        await fetchUsers();
        await fetchSearchQueries();
        await fetchJobBatches();
        
        isLoading = false;
      } catch (err) {
        console.error('Error in dashboard initialization:', err);
        error = err.message;
        isLoading = false;
      }
    });
    
    // Fetch users collection
    async function fetchUsers() {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Successfully fetched users:', users.length);
      } catch (err) {
        console.error('Error fetching users:', err);
        collectionErrors['users'] = err.message;
      }
    }
    
    // Fetch search queries collection group
    async function fetchSearchQueries() {
      try {
        // First try with collection group
        try {
          const queriesSnapshot = await getDocs(collectionGroup(db, 'searchQueries'));
          searchQueries = queriesSnapshot.docs.map(doc => {
            const path = doc.ref.path.split('/');
            const userId = path[1]; // Extract userId from path
            return {
              id: doc.id,
              userId,
              path: doc.ref.path,
              ...doc.data()
            };
          });
        } catch (groupErr) {
          console.error('Error with collection group query:', groupErr);
          collectionErrors['searchQueries-group'] = groupErr.message;
          
          // If collection group fails, try fetching through users collection
          searchQueries = [];
          if (users.length > 0) {
            for (const user of users) {
              try {
                const userQueriesSnapshot = await getDocs(collection(db, `users/${user.id}/searchQueries`));
                const userQueries = userQueriesSnapshot.docs.map(doc => ({
                  id: doc.id,
                  userId: user.id,
                  path: doc.ref.path,
                  ...doc.data()
                }));
                searchQueries = [...searchQueries, ...userQueries];
              } catch (userQueryErr) {
                console.error(`Error fetching queries for user ${user.id}:`, userQueryErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching search queries:', err);
        collectionErrors['searchQueries'] = err.message;
      }
    }
    
    // Fetch job batches collection
    async function fetchJobBatches() {
      try {
        const batchesSnapshot = await getDocs(
          query(collection(db, 'jobBatches'), orderBy('startedAt', 'desc'))
        );
        jobBatches = batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error('Error fetching job batches:', err);
        collectionErrors['jobBatches'] = err.message;
      }
    }
    
    // Refresh all data
    async function refreshData() {
      isLoading = true;
      error = null;
      collectionErrors = {};
      
      try {
        // Force token refresh
        await auth.currentUser.getIdToken(true);
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        adminClaims = idTokenResult.claims;
        
        // Refresh collections
        await fetchUsers();
        await fetchSearchQueries();
        await fetchJobBatches();
      } catch (err) {
        console.error('Error refreshing data:', err);
        error = err.message;
      }
      
      isLoading = false;
    }
    
    // Filter search queries by user ID
    $: userSearchQueries = selectedUser 
      ? searchQueries.filter(query => query.userId === selectedUser.id)
      : searchQueries;
      
    // Filter job batches by user ID
    $: userJobBatches = selectedUser 
      ? jobBatches.filter(batch => batch.userId === selectedUser.id)
      : jobBatches;
      
    // Further filter job batches by search query ID if selected
    $: filteredJobBatches = selectedQuery 
      ? userJobBatches.filter(batch => batch.searchQueryId === selectedQuery.id)
      : userJobBatches;
      
    // Format timestamp for display using Day.js
    function formatDate(timestamp) {
      if (!timestamp) return 'N/A';
      
      try {
        // Handle Firestore timestamp objects
        const firestoreDate = timestamp.toDate ? timestamp.toDate() : timestamp;
        
        // Convert to Day.js object
        const date = dayjs(firestoreDate);
        
        // First convert to UTC (assuming timestamps are stored in UTC)
        const utcDate = date.isUTC() ? date : date.utc();
        
        // Then convert to local time for display
        return utcDate.local().format('MMM D, YYYY h:mm A');
      } catch (err) {
        console.error('Error formatting date:', err, timestamp);
        return 'Invalid date';
      }
    }
    
    // Format delivery time from UTC to local
    function formatDeliveryTime(timeString) {
      if (!timeString) return 'N/A';
      
      try {
        // Parse the time string (HH:MM format in UTC)
        const [hourStr, minuteStr] = timeString.split(':');
        const utcHour = parseInt(hourStr, 10);
        const utcMinute = parseInt(minuteStr, 10);
        
        // Create a UTC dayjs object with today's date and the specified time
        const utcTime = dayjs.utc().hour(utcHour).minute(utcMinute).second(0);
        
        // Convert to local time
        const localTime = utcTime.local();
        
        // Format in 12-hour format with AM/PM
        return localTime.format('h:mm A');
      } catch (err) {
        console.error('Error formatting delivery time:', err, timeString);
        return timeString || 'N/A';
      }
    }
    
    // User selection handler
    function selectUser(user) {
      selectedUser = user;
      selectedQuery = null; // Reset query selection
      selectedBatch = null; // Reset batch selection
    }
    
    // Query selection handler
    function selectQuery(query) {
      selectedQuery = query === selectedQuery ? null : query; // Toggle selection
      selectedBatch = null; // Reset batch selection
    }
    
    // Batch selection handler
    function selectBatch(batch) {
      selectedBatch = batch === selectedBatch ? null : batch; // Toggle selection
    }
    
    // Reset all selections
    function viewAll() {
      selectedUser = null;
      selectedQuery = null;
      selectedBatch = null;
    }
    
    // Get keyword from search params
    function getKeyword(searchParams) {
      if (!searchParams || !Array.isArray(searchParams) || searchParams.length === 0) {
        return 'N/A';
      }
      return searchParams[0].keyword || 'N/A';
    }
  </script>
  
  <main class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-4">
      <button class="btn variant-filled-primary" on:click={refreshData}>
        Refresh Data
      </button>
    </div>
    
    {#if isLoading}
      <div class="card p-4 my-4">Loading data...</div>
    {:else if error}
      <div class="card variant-filled-error p-4 my-4">
        <h2 class="h3">Error: {error}</h2>
        <p>There was a problem loading the dashboard data. This may be due to insufficient permissions.</p>
        
        {#if adminClaims}
          <div class="mt-4">
            <h3 class="h4">Admin Claims</h3>
            <pre class="text-sm bg-surface-200-700-token p-2 rounded">{JSON.stringify(adminClaims, null, 2)}</pre>
          </div>
        {/if}
        
        {#if Object.keys(collectionErrors).length > 0}
          <div class="mt-4">
            <h3 class="h4">Collection Errors</h3>
            <div class="overflow-x-auto">
              <table class="table table-compact w-full">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {#each Object.entries(collectionErrors) as [collection, errorMsg]}
                    <tr>
                      <td>{collection}</td>
                      <td class="text-error-500">{errorMsg}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="grid gap-4">
        <div class="card p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="h2">Users ({users.length})</h2>
            
            <button class="btn btn-sm variant-filled" on:click={viewAll}>
              View All
            </button>
          </div>
          
          {#if users.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              {#each users as user}
                <button 
                  class="btn {selectedUser?.id === user.id ? 'variant-filled-primary' : 'variant-soft'} 
                         text-left justify-start h-auto py-2 truncate"
                  on:click={() => selectUser(user)}
                >
                  <span class="block truncate">{user.email || user.id}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Search queries section -->
        <div class="card p-4">
          <h2 class="h3 mb-4">
            {selectedUser ? `Search Queries for ${selectedUser.email || selectedUser.id}` : 'All Search Queries'}
            ({userSearchQueries.length})
          </h2>
          
          <div class="overflow-x-auto">
            <table class="table table-compact w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Search Keywords</th>
                  <th>Frequency</th>
                  <th>Delivery Time</th>
                  <th>Last Run</th>
                  <th>Next Run</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each userSearchQueries as query}
                  <tr class={selectedQuery?.id === query.id ? 'bg-primary-500/20' : ''}>
                    <td title={query.id}>{query.id.substring(0, 8)}...</td>
                    <td>
                      {getKeyword(query.searchParams)}
                    </td>
                    <td>{query.frequency || 'N/A'}</td>
                    <td>{formatDeliveryTime(query.deliveryTime)}</td>
                    <td>{formatDate(query.lastRun)}</td>
                    <td>{formatDate(query.nextRun)}</td>
                    <td class={query.processingStatus === 'processing' ? 'text-primary-500' : ''}>
                      {query.processingStatus || 'N/A'}
                    </td>
                    <td>
                      <button class="btn btn-sm variant-soft" on:click={() => selectQuery(query)}>
                        {selectedQuery?.id === query.id ? 'Show All Batches' : 'Show Related Batches'}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Two-column layout for batches and jobs -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Job batches section (left column) -->
          <div class="card p-4">
            <h2 class="h3 mb-4">
              {#if selectedQuery}
                Job Batches for Query "{getKeyword(selectedQuery.searchParams)}"
              {:else if selectedUser}
                All Job Batches for {selectedUser.email || selectedUser.id}
              {:else}
                All Job Batches
              {/if}
              ({filteredJobBatches.length})
            </h2>
            
            <div class="overflow-x-auto">
              <table class="table table-compact w-full">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Jobs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredJobBatches as batch}
                    <tr class={selectedBatch?.id === batch.id ? 'bg-primary-500/20' : ''}>
                      <td title={batch.id}>{batch.id.substring(0, 8)}...</td>
                      <td>{formatDate(batch.startedAt)}</td>
                      <td class={
                        batch.status === 'complete' ? 'text-success-500' : 
                        batch.status === 'processing' ? 'text-primary-500' : 
                        batch.status === 'timeout' ? 'text-error-500' : ''
                      }>
                        {batch.status || 'N/A'}
                      </td>
                      <td>
                        {batch.completedJobs || 0} / {batch.totalJobs || 0}
                        ({batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%)
                      </td>
                      <td>{batch.jobIds?.length || 0}</td>
                      <td>
                        <button class="btn btn-sm variant-soft" on:click={() => selectBatch(batch)}>
                          {selectedBatch?.id === batch.id ? 'Hide Jobs' : 'View Jobs'}
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Jobs list section (right column) -->
          <BatchJobsList selectedBatch={selectedBatch} userId={selectedUser?.id || selectedBatch?.userId} />
        </div>
      </div>
    {/if}
  </main>