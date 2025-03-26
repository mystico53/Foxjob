<script>
    import { onMount } from 'svelte';
    import { authStore } from '$lib/stores/authStore';
    import { isLoading } from '$lib/stores/scrapeStore';
    
    // User data
    let uid;
    let scheduledSearches = [];
    let isLoadingSearches = false;
    let error = null;
    
    // Subscribe to auth store to get current user
    authStore.subscribe(user => {
      uid = user?.uid;
      if (uid) {
        loadScheduledSearches();
      }
    });
    
    // Load all scheduled searches for the current user
    async function loadScheduledSearches() {
      if (!uid) return;
      
      isLoadingSearches = true;
      error = null;
      
      try {
        // Import Firestore from firebase
        const { getFirestore, collection, query, where, getDocs, doc, orderBy } = await import('firebase/firestore');
        const db = getFirestore();
        
        // Query the user's scheduled searches
        const searchesRef = collection(db, 'users', uid, 'searchQueries');
        const q = query(
          searchesRef,
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        // Format the results
        scheduledSearches = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          lastRun: doc.data().lastRun?.toDate() || null,
          nextRun: doc.data().nextRun?.toDate() || null
        }));
      } catch (err) {
        console.error('Error loading scheduled searches:', err);
        error = 'Failed to load your scheduled searches. Please try again later.';
      } finally {
        isLoadingSearches = false;
      }
    }
    
    // Format date for display
    function formatDate(date) {
      if (!date) return 'Never';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date);
    }
    
    // Get frequency in user-friendly format
    function getFrequencyText(frequency) {
      switch (frequency) {
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'biweekly': return 'Every two weeks';
        case 'monthly': return 'Monthly';
        default: return frequency;
      }
    }
    
    onMount(() => {
      if (uid) {
        loadScheduledSearches();
      }
    });
  </script>
  
  <div class="container mx-auto p-4 mt-8">
    <h2 class="text-2xl font-bold mb-4">Daily Search Routines</h2>
    
    <!-- Search status message -->
    {#if $isLoading}
      <div class="alert variant-filled-primary mb-4">
        <span>Searching... We'll notify you when results are ready.</span>
      </div>
    {/if}
    
    <!-- Loading state for scheduled searches -->
    {#if isLoadingSearches}
      <div class="flex justify-center py-8">
        <div class="loading loading-spinner loading-lg"></div>
      </div>
    {:else if error}
      <div class="alert variant-filled-error mb-4">
        {error}
      </div>
    {:else if scheduledSearches.length === 0}
      <div class="alert variant-filled-surface mb-4">
        <span>You don't have any scheduled searches yet. Toggle "Automatically run this search daily" when searching to create one.</span>
      </div>
    {:else}
      <!-- Scheduled searches list -->
      <div class="grid gap-4">
        {#each scheduledSearches as search (search.id)}
          <div class="card p-4 variant-filled-surface">
            <div class="flex flex-col gap-2">
              <h3 class="text-xl font-semibold">
                {search.searchParams[0].keyword}
                {#if search.searchParams[0].location}
                  in {search.searchParams[0].location}
                {/if}
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <!-- Search parameters -->
                <div class="space-y-1">
                  <div><span class="font-semibold">Frequency:</span> {getFrequencyText(search.frequency)}</div>
                  <div><span class="font-semibold">Created:</span> {formatDate(search.createdAt)}</div>
                  <div><span class="font-semibold">Last run:</span> {formatDate(search.lastRun)}</div>
                  <div><span class="font-semibold">Next run:</span> {formatDate(search.nextRun)}</div>
                </div>
                
                <!-- More detailed search parameters -->
                <div class="space-y-1">
                  {#if search.searchParams[0].job_type}
                    <div><span class="font-semibold">Job Type:</span> {search.searchParams[0].job_type}</div>
                  {/if}
                  
                  {#if search.searchParams[0].experience_level}
                    <div><span class="font-semibold">Experience:</span> {search.searchParams[0].experience_level}</div>
                  {/if}
                  
                  {#if search.searchParams[0].remote}
                    <div><span class="font-semibold">Workplace:</span> {search.searchParams[0].remote}</div>
                  {/if}
                  
                  {#if search.searchParams[0].time_range && search.searchParams[0].time_range !== 'Any time'}
                    <div><span class="font-semibold">Date Posted:</span> {search.searchParams[0].time_range}</div>
                  {/if}
                  
                  {#if search.searchParams[0].company}
                    <div><span class="font-semibold">Company:</span> {search.searchParams[0].company}</div>
                  {/if}
                  
                  <div><span class="font-semibold">Results Limit:</span> {search.limit}</div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>