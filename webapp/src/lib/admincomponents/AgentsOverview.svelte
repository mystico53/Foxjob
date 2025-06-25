<!-- EnhancedAdminDashboard.svelte -->
<script>
    import { onMount } from 'svelte';
    import { collection, collectionGroup, query, orderBy, getDocs, getFirestore, doc, getDoc, where, setDoc, updateDoc, limit, deleteDoc } from 'firebase/firestore';
    import { getFunctions, httpsCallable } from 'firebase/functions';
    import { auth } from '$lib/firebase';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import localizedFormat from 'dayjs/plugin/localizedFormat';
    import BatchJobsList from '$lib/admincomponents/BatchJobsList.svelte';
    import EmailRequestDetails from '$lib/admincomponents/EmailRequestDetails.svelte';
    
    // Props
    export let selectedBatchId = null;
    
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
    let displayedBatches = [];
    let emailRequests = {};
    let isLoading = true;
    let isLoadingMore = false;
    let error = null;
    let selectedUser = null;
    let selectedQuery = null;
    let selectedBatch = null;
    let collectionErrors = {};
    let adminClaims = null;
    let lastVisibleBatch = null;
    const BATCH_PAGE_SIZE = 30;
    
    // Add this near the top of your script tag
    const functions = getFunctions();
    const fixMissingEmailRequestsFunction = httpsCallable(functions, 'fixMissingEmailRequests');
    
    // Add new state for tracking which batches have loaded jobs
    let loadedBatchJobs = new Set();
    
    // Add new state for status filtering
    let selectedStatus = 'all';
    
    // Add new state for showing all batches
    let showAllBatches = false;
    
    // Add new state for email expansion - default to false
    let isEmailExpanded = false;
    
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
    
    // Fetch job batches collection with pagination
    async function fetchJobBatches(loadMore = false) {
      try {
        let batchQuery;
        if (loadMore && lastVisibleBatch) {
          batchQuery = query(
            collection(db, 'jobBatches'),
            orderBy('startedAt', 'desc'),
            limit(BATCH_PAGE_SIZE),
            where('startedAt', '<', lastVisibleBatch.startedAt)
          );
        } else {
          batchQuery = query(
            collection(db, 'jobBatches'),
            orderBy('startedAt', 'desc'),
            limit(BATCH_PAGE_SIZE)
          );
        }

        const batchesSnapshot = await getDocs(batchQuery);
        
        // Update last visible batch
        lastVisibleBatch = batchesSnapshot.docs[batchesSnapshot.docs.length - 1]?.data() || null;
        
        const newBatches = batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (loadMore) {
          jobBatches = [...jobBatches, ...newBatches];
        } else {
          jobBatches = newBatches;
        }
      } catch (err) {
        console.error('Error fetching job batches:', err);
        collectionErrors['jobBatches'] = err.message;
      }
    }
    
    // Load more batches
    async function loadMoreBatches() {
      if (isLoadingMore || !lastVisibleBatch) return;
      
      isLoadingMore = true;
      await fetchJobBatches(true);
      isLoadingMore = false;
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
        
        // First, collect all email request IDs from batches
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
        
        // For any batches that still have emailSent=true but no email request,
        // only create a placeholder if we're certain no email request exists
        const missingEmailBatches = jobBatches.filter(batch => 
          batch.emailSent && !emailRequests[batch.id] && !batch.emailRequestId
        );
        
        if (missingEmailBatches.length > 0) {
          console.log(`Creating placeholder email requests for ${missingEmailBatches.length} batches`);
          
          for (const batch of missingEmailBatches) {
            emailRequests[batch.id] = {
              id: 'unknown',
              status: 'sent',
              sentAt: batch.emailSentAt || batch.completedAt,
              batchId: batch.id,
              userId: batch.userId
            };
          }
        }
        
        console.log(`Final email requests map has ${Object.keys(emailRequests).length} entries`);
        
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
    
    // Add filtered batches computation
    $: filteredJobBatches = (() => {
        let batches = selectedUser 
            ? jobBatches.filter(batch => batch.userId === selectedUser.id)
            : jobBatches;
            
        batches = selectedQuery 
            ? batches.filter(batch => batch.searchId === selectedQuery.id)
            : batches;

        // Filter by last 3 days if not showing all batches
        if (!showAllBatches) {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            batches = batches.filter(batch => {
                const batchDate = batch.startedAt?.toDate?.() || batch.startedAt;
                return batchDate >= threeDaysAgo;
            });
        }

        if (selectedStatus === 'all') return batches;
        return batches.filter(batch => {
            if (selectedStatus === 'empty') {
                return batch.status === 'empty' || batch.status === 'completed';
            }
            return batch.status === selectedStatus;
        });
    })();
    
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
    
    // Modify batch selection handler to track loaded jobs and load email request
    async function selectBatch(batch) {
        if (selectedBatch?.id === batch.id) {
            selectedBatch = null;
            isEmailExpanded = false;
        } else {
            selectedBatch = batch;
            loadedBatchJobs.add(batch.id);
            loadedBatchJobs = loadedBatchJobs; // trigger reactivity
            
            // Load email request data if the batch has an email
            if (batch.emailSent) {
                try {
                    // First try to get emailRequestId directly from batch
                    if (batch.emailRequestId) {
                        const emailDoc = await getDoc(doc(db, 'emailRequests', batch.emailRequestId));
                        if (emailDoc.exists()) {
                            emailRequests[batch.id] = { id: emailDoc.id, ...emailDoc.data() };
                        }
                    } else {
                        // If no emailRequestId, query by batchId
                        const emailQuery = query(
                            collection(db, 'emailRequests'),
                            where('batchId', '==', batch.id)
                        );
                        const querySnapshot = await getDocs(emailQuery);
                        if (!querySnapshot.empty) {
                            const emailDoc = querySnapshot.docs[0];
                            emailRequests[batch.id] = { id: emailDoc.id, ...emailDoc.data() };
                        }
                    }
                    // Force reactivity update
                    emailRequests = { ...emailRequests };
                } catch (err) {
                    console.error('Error loading email request:', err);
                }
            }
        }
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
        return { text: 'No email', class: 'text-black' };
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
      
      return { text: emailIdPrefix + (emailData.status || 'Unknown'), class: 'text-black' };
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

    // Add delete batch function
    async function deleteBatch(batchId) {
        if (!confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
            return;
        }

        try {
            isLoading = true;
            const batchRef = doc(db, 'jobBatches', batchId);
            await deleteDoc(batchRef);
            
            // Remove from local state
            jobBatches = jobBatches.filter(batch => batch.id !== batchId);
            
            // If there's an associated email request, delete it too
            const emailRequest = emailRequests[batchId];
            if (emailRequest?.id) {
                const emailRef = doc(db, 'emailRequests', emailRequest.id);
                await deleteDoc(emailRef);
                delete emailRequests[batchId];
            }
            
            alert('Batch deleted successfully');
        } catch (err) {
            console.error('Error deleting batch:', err);
            alert(`Error deleting batch: ${err.message}`);
        } finally {
            isLoading = false;
        }
    }

    // Watch for changes to selectedBatchId and auto-select the batch
    $: if (selectedBatchId && jobBatches.length > 0) {
        const batch = jobBatches.find(b => b.id === selectedBatchId);
        if (batch) {
            selectedBatch = batch;
            loadedBatchJobs.add(batch.id);
            loadedBatchJobs = loadedBatchJobs; // trigger reactivity
        }
    }
</script>
  
<main class="container mx-auto">
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
      <div class="flex gap-4 relative">
        <!-- Main content -->
        <div class="flex-1">
          <div class="grid gap-8">
            <!-- Job batches section -->
            <div class="card p-4 mb-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="h3">
                        {#if selectedQuery}
                            Job Batches for Query "{getKeyword(selectedQuery.searchParams)}"
                        {:else if selectedUser}
                            All Job Batches for {selectedUser.email || selectedUser.id}
                        {:else}
                            All Job Batches
                        {/if}
                        ({filteredJobBatches.length})
                    </h2>
                    <button
                        class="btn variant-ghost-primary"
                        on:click={() => showAllBatches = !showAllBatches}
                    >
                        {showAllBatches ? 'Show Last 3 Days' : 'Load All Batches'}
                    </button>
                </div>
                
                <!-- Divider above filter pills -->
                <div class="h-[1px] bg-black mb-6"></div>

                <!-- Status Filter Pills -->
                <div class="flex flex-wrap gap-2 mb-6">
                    <button
                        class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                            {selectedStatus === 'all' 
                                ? 'bg-primary-500 text-white' 
                                : 'bg-surface-200 hover:bg-surface-300'}"
                        on:click={() => selectedStatus = 'all'}
                    >
                        All ({jobBatches.length})
                    </button>
                    <button
                        class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                            {selectedStatus === 'complete' 
                                ? 'bg-success-500 text-white' 
                                : 'bg-surface-200 hover:bg-surface-300'}"
                        on:click={() => selectedStatus = 'complete'}
                    >
                        Complete ({jobBatches.filter(b => b.status === 'complete').length})
                    </button>
                    <button
                        class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                            {selectedStatus === 'empty' 
                                ? 'bg-success-500 text-white' 
                                : 'bg-surface-200 hover:bg-surface-300'}"
                        on:click={() => selectedStatus = 'empty'}
                    >
                        Empty Search ({jobBatches.filter(b => b.status === 'empty' || b.status === 'completed').length})
                    </button>
                    <button
                        class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                            {selectedStatus === 'processing' 
                                ? 'bg-primary-500 text-white' 
                                : 'bg-surface-200 hover:bg-surface-300'}"
                        on:click={() => selectedStatus = 'processing'}
                    >
                        In Progress ({jobBatches.filter(b => b.status === 'processing').length})
                    </button>
                    <button
                        class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                            {selectedStatus === 'timeout' 
                                ? 'bg-warning-500 text-white' 
                                : 'bg-surface-200 hover:bg-surface-300'}"
                        on:click={() => selectedStatus = 'timeout'}
                    >
                        Timeout ({jobBatches.filter(b => b.status === 'timeout').length})
                    </button>
                    <button
                        class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                            {selectedStatus === 'error' 
                                ? 'bg-error-500 text-white' 
                                : 'bg-surface-200 hover:bg-surface-300'}"
                        on:click={() => selectedStatus = 'error'}
                    >
                        Error ({jobBatches.filter(b => b.status === 'error').length})
                    </button>
                </div>

                <!-- Divider below filter pills -->
                <div class="h-[1px] bg-black mb-6"></div>
                
                <div class="grid gap-8">
                    {#each filteredJobBatches as batch}
                        {@const emailStatus = getEmailStatus(batch.id)}
                        {@const batchUser = users.find(u => u.id === batch.userId)}
                        {@const query = searchQueries.find(q => q.id === batch.searchId)}
                        <div 
                            id="batch-{batch.id}"
                            class="card variant-soft p-6 shadow-lg border border-black {selectedBatch?.id === batch.id ? 'ring-2 ring-primary-500' : ''}"
                        >
                            <!-- Batch ID as h3 -->
                            <h3 class="text-black text-lg font-mono font-bold mb-4">{batch.id}</h3>

                            <!-- Main batch info -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <!-- Column 1: Basic Info -->
                                <div class="text-black">
                                    <div class="mb-2">
                                        <span class="font-semibold">User:</span> 
                                        <span>{batchUser?.displayName || batchUser?.id || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold">Started:</span> 
                                        <span>{formatDate(batch.startedAt)}</span>
                                    </div>
                                </div>
                                
                                <!-- Column 2: Status & Progress -->
                                <div class="text-black">
                                    <div class="mb-2">
                                        <span class="font-semibold">Status:</span> 
                                        <span class={
                                            batch.status === 'complete' ? 'text-success-500' : 
                                            batch.status === 'empty' || batch.status === 'completed' ? 'text-success-500' :
                                            batch.status === 'processing' ? 'text-primary-500' : 
                                            batch.status === 'timeout' ? 'text-error-500' : ''
                                        }>
                                            {batch.status === 'completed' ? 'empty' : batch.status || 'N/A'}
                                        </span>
                                    </div>
                                    <div class="mb-2">
                                        <span class="font-semibold">Progress:</span> 
                                        <span>
                                            {batch.completedJobs || 0} / {batch.totalJobs || 0}
                                            ({batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>
                                
                                <!-- Column 3: Email Status & Actions -->
                                <div class="text-black">
                                    <div class="mb-2">
                                        <span class="font-semibold">Email:</span> 
                                        <span class={batch.emailSent ? 'text-success-500' : 'text-surface-400'}>
                                            {batch.emailSent ? 'Sent' : 'Not Sent'}
                                        </span>
                                    </div>
                                    <div class="mb-2">
                                        <span class="font-semibold">Email Status:</span><br/>
                                        <span class={emailStatus.class}>{emailStatus.text}</span>
                                    </div>
                                    <div class="mt-2">
                                        <!-- Remove the delete button from here since it's now next to View Jobs -->
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Query Information Row -->
                            <div class="border-t border-surface-300-600-token pt-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <!-- Batch Query Information -->
                                    <div class="space-y-2">
                                        <h3 class="font-semibold text-lg">Search Parameters</h3>
                                        {#if query?.searchParams && query.searchParams.length > 0}
                                            <div class="card variant-ghost p-3 text-black">
                                                <div class="mb-1">
                                                    <span class="font-semibold">Keywords:</span>
                                                    <span class="ml-2">{query.searchParams[0].keyword || 'N/A'}</span>
                                                </div>
                                                <div class="mb-1">
                                                    <span class="font-semibold">Location:</span>
                                                    <span class="ml-2">{query.searchParams[0].location || 'N/A'}</span>
                                                </div>
                                                {#if query.searchParams[0].country}
                                                    <div class="mb-1">
                                                        <span class="font-semibold">Country:</span>
                                                        <span class="ml-2">({query.searchParams[0].country})</span>
                                                    </div>
                                                {/if}
                                                {#if query.searchParams[0].time_range}
                                                    <div>
                                                        <span class="font-semibold">Time Range:</span>
                                                        <span class="ml-2">{query.searchParams[0].time_range}</span>
                                                    </div>
                                                {/if}
                                                {#if query.searchParams[0].remote}
                                                    <div>
                                                        <span class="font-semibold">Remote:</span>
                                                        <span class="ml-2">{query.searchParams[0].remote}</span>
                                                    </div>
                                                {/if}
                                                {#if query.searchParams[0].experience_level}
                                                    <div>
                                                        <span class="font-semibold">Experience Level:</span>
                                                        <span class="ml-2">{query.searchParams[0].experience_level}</span>
                                                    </div>
                                                {/if}
                                                {#if query.searchParams[0].job_type}
                                                    <div>
                                                        <span class="font-semibold">Job Type:</span>
                                                        <span class="ml-2">{query.searchParams[0].job_type}</span>
                                                    </div>
                                                {/if}
                                            </div>
                                        {:else}
                                            <div class="text-surface-400">No search parameters defined</div>
                                        {/if}
                                    </div>
                                    
                                    <!-- Delivery Settings -->
                                    {#if query}
                                        <div class="space-y-2">
                                            <h3 class="font-semibold text-lg">Delivery Settings</h3>
                                            <div class="card variant-ghost p-3 text-black">
                                                <div class="mb-1">
                                                    <span class="font-semibold">Delivery Time:</span>
                                                    <span class="ml-2">{formatDeliveryTime(query.deliveryTime) || 'N/A'}</span>
                                                </div>
                                                <div class="mb-1">
                                                    <span class="font-semibold">Frequency:</span>
                                                    <span class="ml-2">{query.frequency || 'N/A'}</span>
                                                </div>
                                                <div class="mb-1">
                                                    <span class="font-semibold">Job Limit:</span>
                                                    <span class="ml-2">{query.limit || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span class="font-semibold">Status:</span>
                                                    <span class="ml-2 {query.isActive ? 'text-success-500' : 'text-surface-400'}">
                                                        {query.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- View Jobs Button - Positioned at bottom right -->
                            <div class="flex justify-end gap-2 mt-4">
                                <button 
                                    class="btn btn-sm variant-ghost"
                                    on:click={() => deleteBatch(batch.id)}
                                    disabled={isLoading}
                                    title="Delete Batch"
                                >
                                    {#if isLoading}
                                        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    {:else}
                                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        </svg>
                                    {/if}
                                </button>
                                {#if batch.emailSent}
                                    <button 
                                        class="btn variant-soft-primary"
                                        on:click={() => isEmailExpanded = !isEmailExpanded}
                                    >
                                        {isEmailExpanded ? 'Hide Email' : 'Show Email'}
                                    </button>
                                {/if}
                                <button 
                                    class="btn variant-filled-primary"
                                    on:click={() => selectBatch(batch)}
                                >
                                    {selectedBatch?.id === batch.id ? 'Hide Jobs' : 'View Jobs'}
                                </button>
                            </div>
                        </div>

                        <!-- Email details - Independent container -->
                        {#if batch.emailSent && isEmailExpanded && emailRequests[batch.id]}
                            <div class="card p-4 mb-4">
                                <EmailRequestDetails 
                                    emailRequest={emailRequests[batch.id]} 
                                    isExpanded={true}
                                />
                            </div>
                        {/if}
                    {/each}
                    
                    <!-- Load More button -->
                    {#if lastVisibleBatch && filteredJobBatches.length >= BATCH_PAGE_SIZE}
                        <div class="flex justify-center mt-4">
                            <button 
                                class="btn variant-filled-primary {isLoadingMore ? 'opacity-50 cursor-not-allowed' : ''}"
                                on:click={loadMoreBatches}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Load More Batches'}
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
          </div>
        </div>

        <!-- Jobs Sidebar - Overlay -->
        {#if selectedBatch}
          <div class="w-[500px] fixed top-0 right-0 bottom-0 bg-surface-100-800-token shadow-2xl border-l border-surface-300-600-token overflow-hidden z-50">
            <BatchJobsList 
              selectedBatch={selectedBatch} 
              userId={selectedBatch.userId}
              on:close={() => selectedBatch = null}
            />
          </div>
        {/if}
      </div>
    {/if}
</main>

<style>
  /* Remove the padding style since we're using overlay */
</style>