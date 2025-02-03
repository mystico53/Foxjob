<script>
    export let datasetId = 'gd_lpfll7v5hcqtkxl6l';
    
    let loading = false;
    let error = null;
    let snapshots = [];
  
    async function fetchSnapshots() {
      loading = true;
      error = null;
      
      try {
        const response = await fetch(
          `http://127.0.0.1:5001/jobille-45494/us-central1/getBrightdataSnapshots?datasetId=${datasetId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
  
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Server error: ${response.status}`);
        }

        // The response is an array, so we can use it directly
        snapshots = data.data || [];  // Using data.data since that's where the array is in the response
        console.log('Received snapshots:', snapshots);
        
      } catch (err) {
        error = err.message;
        console.error('Error details:', err);
      } finally {
        loading = false;
      }
    }
  
    function getStatusColor(status) {
      return {
        running: 'text-blue-500',
        ready: 'text-green-500',
        failed: 'text-red-500'
      }[status] || 'text-gray-500';
    }

    function formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center gap-4">
        <button
          on:click={fetchSnapshots}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Fetching Snapshots...' : 'Check All Snapshots'}
        </button>
        
        {#if loading}
            <span class="text-blue-500">Loading...</span>
        {/if}
    </div>

    {#if error}
      <div class="text-red-500 p-4 border border-red-200 rounded bg-red-50">
        <p class="font-medium">Error occurred:</p>
        <p class="mt-1">{error}</p>
      </div>
    {/if}

    {#if snapshots.length > 0}
      <div class="grid gap-4">
        {#each snapshots as snapshot (snapshot.id)}
          <div class="p-4 border rounded flex flex-col gap-2 hover:bg-gray-50">
            <div class="flex justify-between items-center">
              <span class="font-medium">ID: {snapshot.id}</span>
              <span class={getStatusColor(snapshot.status)}>
                {snapshot.status}
              </span>
            </div>
            <div class="text-sm text-gray-600 flex flex-col gap-1">
              <div>Created: {formatDate(snapshot.created)}</div>
              {#if snapshot.dataset_size !== undefined}
                <div>Size: {snapshot.dataset_size} records</div>
              {/if}
              {#if snapshot.cost !== undefined}
                <div>Cost: ${snapshot.cost}</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else if !loading}
      <div class="text-gray-500 p-4 border rounded">
        No snapshots found. Click the button above to fetch snapshots.
      </div>
    {/if}
</div>