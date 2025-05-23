<!-- EnhancedAdminDashboard.svelte -->
<script>
    import { onMount } from 'svelte';
    import { collection, collectionGroup, query, orderBy, getDocs, getFirestore, doc, getDoc, where, setDoc, updateDoc } from 'firebase/firestore';
    import { getFunctions, httpsCallable } from 'firebase/functions';
    import { auth } from '$lib/firebase';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import localizedFormat from 'dayjs/plugin/localizedFormat';
    import BatchJobsList from '$lib/admincomponents/BatchJobsList.svelte';
    import SearchQueryCard from '$lib/admincomponents/SearchQueryCard.svelte';
    
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
    let emailRequests = {};
    let isLoading = true;
    let error = null;
    let selectedUser = null;
    let selectedQuery = null;
    let selectedBatch = null;
    let collectionErrors = {};
    let adminClaims = null;
    
    // Add this near the top of your script tag
    const functions = getFunctions();
    const fixMissingEmailRequestsFunction = httpsCallable(functions, 'fixMissingEmailRequests');
    
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
        await fetchEmailRequests();
        
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
          
          // After fetching queries, fetch work preferences for each one
          await fetchWorkPreferences();
          
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
            
            // After fetching queries this way, fetch work preferences
            await fetchWorkPreferences();
          }
        }
      } catch (err) {
        console.error('Error fetching search queries:', err);
        collectionErrors['searchQueries'] = err.message;
      }
    }
    
    // Fetch work preferences for all users with search queries
    async function fetchWorkPreferences() {
      // Create a Set of unique user IDs to avoid duplicate fetches
      const userIds = new Set(searchQueries.map(query => query.userId));
      
      for (const userId of userIds) {
        try {
          const prefDocRef = doc(db, 'users', userId, 'UserCollections', 'work_preferences');
          const prefSnap = await getDoc(prefDocRef);
          
          if (prefSnap.exists()) {
            const prefData = prefSnap.data();
            
            // Update all queries for this user with their preferences
            searchQueries = searchQueries.map(query => {
              if (query.userId === userId) {
                return {
                  ...query,
                  workPreferences: {
                    preferences: prefData.preferences || null,
                    avoidance: prefData.avoidance || null
                  }
                };
              }
              return query;
            });
          }
        } catch (err) {
          console.error(`Error fetching work preferences for user ${userId}:`, err);
        }
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
    
    // Fetch email requests for all batches
    async function fetchEmailRequests() {
      try {
        // Clear existing emailRequests
        emailRequests = {};
        
        // Get all batch IDs
        const batchIds = jobBatches.map(batch => batch.id);
        
        if (batchIds.length === 0) {
          console.log('No batch IDs to fetch email requests for');
          return;
        }
        
        console.log(`Fetching email requests for ${batchIds.length} batches`);
        
        // Collect all email request IDs from batches first
        const emailRequestIds = [];
        const batchesToEmailMap = {};
        
        // Map of emailRequestId -> batchId for easy lookup
        for (const batch of jobBatches) {
          if (batch.emailRequestId) {
            emailRequestIds.push(batch.emailRequestId);
            batchesToEmailMap[batch.emailRequestId] = batch.id;
          }
        }
        
        // If we have email request IDs, fetch them all at once in batches
        let directEmailRequestsFound = 0;
        
        if (emailRequestIds.length > 0) {
          console.log(`Fetching ${emailRequestIds.length} email requests by direct ID lookup`);
          
          // Process in chunks to avoid query limitations
          const chunkSize = 10;
          for (let i = 0; i < emailRequestIds.length; i += chunkSize) {
            const chunk = emailRequestIds.slice(i, i + chunkSize);
            try {
              const emailRequestsQuery = query(
                collection(db, 'emailRequests'),
                where(admin.firestore.FieldPath.documentId(), 'in', chunk)
              );
              
              const emailsSnapshot = await getDocs(emailRequestsQuery);
              
              emailsSnapshot.forEach(doc => {
                const batchId = batchesToEmailMap[doc.id];
                if (batchId) {
                  emailRequests[batchId] = {
                    id: doc.id,
                    ...doc.data()
                  };
                  directEmailRequestsFound++;
                }
              });
            } catch (chunkErr) {
              console.error(`Error fetching email request chunk ${i/chunkSize + 1}:`, chunkErr);
            }
          }
          
          console.log(`Found ${directEmailRequestsFound} email requests via ID lookup`);
        }
        
        // For any remaining batches without matches, try searching by batchId field
        const remainingBatchIds = jobBatches
          .filter(batch => !emailRequests[batch.id] && batch.emailSent)
          .map(batch => batch.id);
        
        if (remainingBatchIds.length > 0) {
          console.log(`Searching for email requests by batchId field for ${remainingBatchIds.length} remaining batches`);
          
          // Process in chunks to avoid query limitations
          const chunkSize = 10;
          let batchIdMatchesFound = 0;
          
          for (let i = 0; i < remainingBatchIds.length; i += chunkSize) {
            const batchIdsChunk = remainingBatchIds.slice(i, i + chunkSize);
            
            try {
              // Query emailRequests collection for matching batchId field
              const emailRequestsQuery = query(
                collection(db, 'emailRequests'),
                where('batchId', 'in', batchIdsChunk)
              );
              
              const emailSnapshot = await getDocs(emailRequestsQuery);
              
              // Store email requests by batchId for easy lookup
              emailSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.batchId) {
                  emailRequests[data.batchId] = {
                    id: doc.id,
                    ...data
                  };
                  batchIdMatchesFound++;
                }
              });
            } catch (chunkErr) {
              console.error(`Error fetching email requests by batchId chunk ${i/chunkSize + 1}:`, chunkErr);
            }
          }
          
          console.log(`Found ${batchIdMatchesFound} additional email requests via batchId field`);
        }
        
        // Count how many batches have emailSent=true but no email request found
        const missingEmails = jobBatches.filter(batch => 
          batch.emailSent && !emailRequests[batch.id]
        ).length;
        
        console.log(`Final email requests map has ${Object.keys(emailRequests).length} entries (${directEmailRequestsFound} via IDs)`);
        console.log(`${missingEmails} batches still have emailSent=true but no email request was found`);
        
      } catch (err) {
        console.error('Error fetching email requests:', err);
        collectionErrors['emailRequests'] = err.message;
      }
    }
    
    // Refresh all data
    async function refreshData() {
      isLoading = true;
      error = null;
      collectionErrors = {};
      emailRequests = {};
      
      try {
        // Force token refresh
        await auth.currentUser.getIdToken(true);
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        adminClaims = idTokenResult.claims;
        
        // Refresh collections
        await fetchUsers();
        await fetchSearchQueries();
        await fetchJobBatches();
        await fetchEmailRequests();
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
    
    // Get email status display for a batch
    function getEmailStatus(batchId) {
      const emailData = emailRequests[batchId];
      if (!emailData) {
        // Check if batch.emailSent is true even when no email request found
        const batch = jobBatches.find(b => b.id === batchId);
        if (batch && batch.emailSent === true) {
          return { text: 'Email sent (ID unknown)', class: 'text-warning-500' };
        }
        return { text: 'No email', class: 'text-surface-400' };
      }
      
      // Include email request ID in all status returns
      const emailIdPrefix = `ID: ${emailData.id ? emailData.id.substring(0, 8) : 'unknown'} - `;
      
      if (emailData.status === 'error') {
        return { text: emailIdPrefix + 'Error: ' + (emailData.error || 'Unknown'), class: 'text-error-500' };
      }
      
      if (emailData.status === 'pending') {
        return { text: emailIdPrefix + 'Pending', class: 'text-primary-300' };
      }
      
      // Track deliverability status
      if (emailData.bounced) {
        return { text: emailIdPrefix + 'Bounced', class: 'text-error-500' };
      }
      
      if (emailData.dropped) {
        return { text: emailIdPrefix + 'Dropped', class: 'text-error-500' };
      }
      
      if (emailData.delivered) {
        // If delivered, check engagement
        if (emailData.opened) {
          if (emailData.clicked) {
            return { 
              text: emailIdPrefix + `Opened (${emailData.openCount || 1}), Clicked (${emailData.clickCount || 1})`, 
              class: 'text-success-500 font-semibold'
            };
          }
          return { 
            text: emailIdPrefix + `Opened (${emailData.openCount || 1})`, 
            class: 'text-success-500'
          };
        }
        return { text: emailIdPrefix + 'Delivered', class: 'text-success-300' };
      }
      
      if (emailData.deferred) {
        return { text: emailIdPrefix + 'Deferred', class: 'text-warning-500' };
      }
      
      if (emailData.processed) {
        return { text: emailIdPrefix + 'Processed', class: 'text-primary-500' };
      }
      
      return { text: emailIdPrefix + (emailData.status || 'Unknown'), class: 'text-surface-400' };
    }
    
    // Replace the existing fixMissingEmailRequests function with this updated version
    async function fixMissingEmailRequests() {
      if (!confirm('This will create email request records for all batches that have emailSent=true but no email request. Continue?')) {
        return;
      }
      
      // Count how many batches have this issue for user information 
      const missingCount = jobBatches.filter(batch => 
        batch.emailSent && !emailRequests[batch.id]
      ).length;
      
      console.log(`${missingCount} batches have emailSent=true but no email request was found`);
      
      if (missingCount === 0) {
        alert('No batches with missing email requests found.');
        return;
      }
      
      try {
        // Show loading state
        isLoading = true;
        
        // Call the Cloud Function
        console.log('Calling fixMissingEmailRequests Cloud Function');
        console.log('Current user ID:', auth.currentUser?.uid);
        console.log('Admin claims:', adminClaims);
        
        const result = await fixMissingEmailRequestsFunction();
        
        console.log('Cloud Function result:', result.data);
        
        // Show results to user
        if (result.data.success) {
          alert(`Successfully fixed ${result.data.fixed} of ${result.data.total} batches with missing email requests.`);
        } else {
          // More detailed error message
          if (result.data.error === 'Admin privileges required') {
            alert(`Error: Admin privileges required. Your current admin claims: ${JSON.stringify(adminClaims || {})}`);
          } else {
            alert(`Error: ${result.data.error}`);
          }
        }
        
        // Refresh to load the new data
        if (result.data.fixed > 0) {
          refreshData();
        }
      } catch (err) {
        console.error('Error calling fixMissingEmailRequests function:', err);
        alert(`Error: ${err.message}. This could be due to missing Cloud Function deployment or permissions.`);
      } finally {
        isLoading = false;
      }
    }
  </script>
  
  <main class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-4">
      <div class="flex gap-2">
        <button class="btn variant-filled-primary" on:click={refreshData}>
          Refresh Data
        </button>
        
        <button class="btn variant-filled-warning" on:click={fixMissingEmailRequests}>
          Fix Missing Email Requests
        </button>
      </div>
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
          
          <!-- Replace table with new card-based layout -->
          <div class="space-y-3">
            {#each userSearchQueries as query}
              <div class="{selectedQuery?.id === query.id ? 'ring-2 ring-primary-500' : ''}">
                <SearchQueryCard 
                  {query} 
                  on:select={(e) => selectQuery(e.detail)}
                />
              </div>
            {/each}
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
                    <th>Email Sent</th>
                    <th>Email Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredJobBatches as batch}
                    {@const emailStatus = getEmailStatus(batch.id)}
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
                      <td class={batch.emailSent ? 'text-success-500' : 'text-surface-400'}>
                        {batch.emailSent ? 'Yes' : 'No'}
                      </td>
                      <td class={emailStatus.class}>
                        {emailStatus.text}
                        {#if batch.emailSent && emailRequests[batch.id]}
                          <button 
                            class="btn btn-sm variant-ghost-primary ml-2"
                            on:click={() => {
                              // Open email details in a dialog or modal
                              const emailData = emailRequests[batch.id];
                              if (emailData && emailData.id) {
                                // Open a new tab with Firestore UI to the document
                                const projectId = window.location.hostname.split('.')[0];
                                const firestoreUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/~2FemailRequests~2F${emailData.id}`;
                                window.open(firestoreUrl, '_blank');
                              }
                            }}
                          >
                            View
                          </button>
                        {/if}
                      </td>
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