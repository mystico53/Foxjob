<!-- EnhancedAdminDashboard.svelte -->
<script>
    import { onMount } from 'svelte';
    import { collection, collectionGroup, query, orderBy, getDocs, getFirestore } from 'firebase/firestore';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import localizedFormat from 'dayjs/plugin/localizedFormat';
    
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
    
    // Fetch all data on mount
    onMount(async () => {
      try {
        isLoading = true;
        
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch all search queries
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
        
        // Fetch all job batches
        const batchesSnapshot = await getDocs(
          query(collection(db, 'jobBatches'), orderBy('startedAt', 'desc'))
        );
        jobBatches = batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        isLoading = false;
      } catch (err) {
        console.error('Error fetching data:', err);
        error = err.message;
        isLoading = false;
      }
    });
    
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
    }
    
    // Query selection handler
    function selectQuery(query) {
      selectedQuery = query === selectedQuery ? null : query; // Toggle selection
    }
    
    // Reset all selections
    function viewAll() {
      selectedUser = null;
      selectedQuery = null;
    }
    
    // Get keyword from search params
    function getKeyword(searchParams) {
      if (!searchParams || !Array.isArray(searchParams) || searchParams.length === 0) {
        return 'N/A';
      }
      return searchParams[0].keyword || 'N/A';
    }
  </script>
  
  <main>
    <h1>Admin Dashboard</h1>
    
    {#if isLoading}
      <div class="loading">Loading data...</div>
    {:else if error}
      <div class="error">Error: {error}</div>
    {:else}
      <div class="dashboard">
        <!-- User selector -->
        <div class="sidebar">
          <h2>Users ({users.length})</h2>
          <button on:click={viewAll}>View All</button>
          <ul class="user-list">
            {#each users as user}
              <li class={selectedUser?.id === user.id ? 'selected' : ''}>
                <button on:click={() => selectUser(user)}>
                  {user.email || user.id}
                </button>
              </li>
            {/each}
          </ul>
        </div>
        
        <div class="content">
          <!-- Search queries section -->
          <section class="queries">
            <h2>
              {selectedUser ? `Search Queries for ${selectedUser.email || selectedUser.id}` : 'All Search Queries'}
              ({userSearchQueries.length})
            </h2>
            
            <table>
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
                  <tr class={selectedQuery?.id === query.id ? 'selected-row' : ''}>
                    <td title={query.id}>{query.id.substring(0, 8)}...</td>
                    <td>
                      {getKeyword(query.searchParams)}
                    </td>
                    <td>{query.frequency || 'N/A'}</td>
                    <td>{formatDeliveryTime(query.deliveryTime)}</td>
                    <td>{formatDate(query.lastRun)}</td>
                    <td>{formatDate(query.nextRun)}</td>
                    <td class={query.processingStatus === 'processing' ? 'processing' : ''}>
                      {query.processingStatus || 'N/A'}
                    </td>
                    <td>
                      <button on:click={() => selectQuery(query)}>
                        {selectedQuery?.id === query.id ? 'Show All Batches' : 'Show Related Batches'}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
          
          <!-- Job batches section -->
          <section class="batches">
            <h2>
              {#if selectedQuery}
                Job Batches for Query "{getKeyword(selectedQuery.searchParams)}"
              {:else if selectedUser}
                All Job Batches for {selectedUser.email || selectedUser.id}
              {:else}
                All Job Batches
              {/if}
              ({filteredJobBatches.length})
            </h2>
            
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Search Query ID</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Jobs</th>
                  <th>Email Sent</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredJobBatches as batch}
                  <tr>
                    <td title={batch.id}>{batch.id.substring(0, 8)}...</td>
                    <td title={batch.searchQueryId}>
                      {batch.searchQueryId ? batch.searchQueryId.substring(0, 8) + '...' : 'N/A'}
                    </td>
                    <td>{formatDate(batch.startedAt)}</td>
                    <td class={batch.status}>{batch.status || 'N/A'}</td>
                    <td>
                      {batch.completedJobs || 0} / {batch.totalJobs || 0}
                      ({batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%)
                    </td>
                    <td>{batch.jobIds?.length || 0}</td>
                    <td>{batch.emailSent ? 'Yes' : 'No'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
          
          <!-- Add statistics section -->
          <section class="stats">
            <h2>Summary Statistics</h2>
            
            <div class="stat-cards">
              <div class="stat-card">
                <h3>Search Queries</h3>
                <div class="stat-value">{userSearchQueries.length}</div>
                <div class="stat-breakdown">
                  <div>Active: {userSearchQueries.filter(q => q.isActive).length}</div>
                  <div>Processing: {userSearchQueries.filter(q => q.processingStatus === 'processing').length}</div>
                </div>
              </div>
              
              <div class="stat-card">
                <h3>Job Batches</h3>
                <div class="stat-value">{userJobBatches.length}</div>
                <div class="stat-breakdown">
                  <div>Complete: {userJobBatches.filter(b => b.status === 'complete').length}</div>
                  <div>Processing: {userJobBatches.filter(b => b.status === 'processing').length}</div>
                  <div>Timeout: {userJobBatches.filter(b => b.status === 'timeout').length}</div>
                </div>
              </div>
              
              <div class="stat-card">
                <h3>Jobs</h3>
                <div class="stat-value">
                  {userJobBatches.reduce((sum, batch) => sum + (batch.totalJobs || 0), 0)}
                </div>
                <div class="stat-breakdown">
                  <div>Processed: {userJobBatches.reduce((sum, batch) => sum + (batch.completedJobs || 0), 0)}</div>
                  <div>Average per Batch: {
                    userJobBatches.length 
                      ? Math.round(userJobBatches.reduce((sum, batch) => sum + (batch.totalJobs || 0), 0) / userJobBatches.length) 
                      : 0
                  }</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    {/if}
  </main>
  
  <style>
    main {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 1rem;
    }
    
    .loading, .error {
      text-align: center;
      margin: 2rem 0;
      font-size: 1.2rem;
    }
    
    .error {
      color: #e74c3c;
    }
    
    .dashboard {
      display: flex;
      gap: 2rem;
    }
    
    .sidebar {
      flex: 0 0 250px;
      border-right: 1px solid #ddd;
      padding-right: 1rem;
    }
    
    .content {
      flex: 1;
    }
    
    section {
      margin-bottom: 2rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    
    tr:hover {
      background-color: #f9f9f9;
    }
    
    .selected-row {
      background-color: #e0f2fe;
    }
    
    .selected-row:hover {
      background-color: #d0e8fb;
    }
    
    .user-list {
      list-style: none;
      padding: 0;
      margin: 1rem 0;
    }
    
    .user-list li {
      margin-bottom: 0.5rem;
    }
    
    .user-list button {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      border-radius: 4px;
    }
    
    .user-list .selected button {
      background-color: #e0f2fe;
      font-weight: bold;
    }
    
    .user-list button:hover {
      background-color: #f0f0f0;
    }
    
    /* Status styling */
    .processing {
      color: #3498db;
    }
    
    .complete {
      color: #2ecc71;
    }
    
    .timeout {
      color: #e74c3c;
    }
    
    /* Stats section */
    .stat-cards {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .stat-card {
      flex: 1;
      padding: 1rem;
      border-radius: 8px;
      background-color: #f8f9fa;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .stat-card h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      color: #555;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    
    .stat-breakdown {
      color: #666;
      font-size: 0.9rem;
    }
  </style>