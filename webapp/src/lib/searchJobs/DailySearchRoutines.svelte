<script>
    import { onMount } from 'svelte';
    import { authStore } from '$lib/stores/authStore';
    import { isLoading } from '$lib/stores/scrapeStore';
    
    // User data
    let uid;
    let scheduledSearches = [];
    let isLoadingSearches = false;
    let error = null;
    
    // For editing
    let editingSearch = null;
    let editFrequency = '';
    let editNextRun = '';
    let isUpdating = false;
    
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
        const { getFirestore, collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
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
    
    // Delete a scheduled search
    async function deleteSearch(searchId) {
      if (!uid || !searchId) return;
      
      if (!confirm('Are you sure you want to delete this scheduled search?')) {
        return;
      }
      
      try {
        const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
        const db = getFirestore();
        
        await deleteDoc(doc(db, 'users', uid, 'searchQueries', searchId));
        
        // Remove from local array
        scheduledSearches = scheduledSearches.filter(search => search.id !== searchId);
        
      } catch (err) {
        console.error('Error deleting search:', err);
        error = 'Failed to delete the search. Please try again.';
      }
    }
    
    // Start editing a search
    function startEdit(search) {
      editingSearch = search;
      editFrequency = search.frequency;
      
      // Format the next run date for the datetime-local input
      const nextRun = search.nextRun || new Date();
      const year = nextRun.getFullYear();
      const month = String(nextRun.getMonth() + 1).padStart(2, '0');
      const day = String(nextRun.getDate()).padStart(2, '0');
      const hours = String(nextRun.getHours()).padStart(2, '0');
      const minutes = String(nextRun.getMinutes()).padStart(2, '0');
      
      editNextRun = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Cancel editing
    function cancelEdit() {
      editingSearch = null;
    }
    
    // Save changes to a search
    async function saveChanges() {
      if (!uid || !editingSearch) return;
      
      isUpdating = true;
      
      try {
        const { getFirestore, doc, updateDoc, Timestamp } = await import('firebase/firestore');
        const db = getFirestore();
        
        // Parse the next run date
        const nextRunDate = new Date(editNextRun);
        
        // Update the document
        await updateDoc(
          doc(db, 'users', uid, 'searchQueries', editingSearch.id), 
          {
            frequency: editFrequency,
            nextRun: Timestamp.fromDate(nextRunDate)
          }
        );
        
        // Update local data
        scheduledSearches = scheduledSearches.map(search => {
          if (search.id === editingSearch.id) {
            return {
              ...search,
              frequency: editFrequency,
              nextRun: nextRunDate
            };
          }
          return search;
        });
        
        // Close the edit form
        editingSearch = null;
        
      } catch (err) {
        console.error('Error updating search:', err);
        error = 'Failed to update the search. Please try again.';
      } finally {
        isUpdating = false;
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
        <span>Searching... We'll email you when results are ready.</span>
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
            {#if editingSearch && editingSearch.id === search.id}
              <!-- Edit form -->
              <form on:submit|preventDefault={saveChanges} class="space-y-4">
                <h3 class="text-xl font-semibold">
                  Edit: {search.searchParams[0].keyword}
                  {#if search.searchParams[0].location}
                    in {search.searchParams[0].location}
                  {/if}
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="form-field">
                    <label for="editFrequency" class="font-semibold">Frequency</label>
                    <select 
                      id="editFrequency" 
                      bind:value={editFrequency}
                      class="select w-full"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every two weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div class="form-field">
                    <label for="editNextRun" class="font-semibold">Next Run Date & Time</label>
                    <input 
                      type="datetime-local" 
                      id="editNextRun" 
                      bind:value={editNextRun}
                      class="input w-full"
                    />
                  </div>
                </div>
                
                <div class="flex justify-end space-x-2">
                  <button 
                    type="button" 
                    class="btn variant-filled-surface" 
                    on:click={cancelEdit}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    class="btn variant-filled-primary" 
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            {:else}
              <!-- View mode -->
              <div class="flex flex-col gap-2">
                <div class="flex justify-between items-start">
                  <h3 class="text-xl font-semibold">
                    {search.searchParams[0].keyword}
                    {#if search.searchParams[0].location}
                      in {search.searchParams[0].location}
                    {/if}
                  </h3>
                  
                  <div class="flex space-x-2">
                    <button 
                      class="btn btn-sm variant-filled-secondary"
                      on:click={() => startEdit(search)}
                    >
                      Edit
                    </button>
                    <button 
                      class="btn btn-sm variant-filled-error"
                      on:click={() => deleteSearch(search.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
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
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>