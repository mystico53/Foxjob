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

<!-- Previous script section remains the same -->

<div class="container">
    <div class="flex items-center gap-4 mb-4">
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
        <div class="text-red-500 p-4 border border-red-200 rounded bg-red-50 mb-4">
            <p class="font-medium">Error occurred:</p>
            <p class="mt-1">{error}</p>
        </div>
    {/if}

    {#if snapshots.length > 0}
        <div class="table-container">
            <table class="w-full">
                <thead>
                    <tr>
                        <th class="p-4 text-left bg-gray-50 font-semibold">ID</th>
                        <th class="p-4 text-left bg-gray-50 font-semibold">Status</th>
                        <th class="p-4 text-left bg-gray-50 font-semibold">Created</th>
                        <th class="p-4 text-left bg-gray-50 font-semibold">Size</th>
                        <th class="p-4 text-left bg-gray-50 font-semibold">Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {#each snapshots as snapshot (snapshot.id)}
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-4">{snapshot.id}</td>
                            <td class="p-4">
                                <span class={getStatusColor(snapshot.status)}>
                                    {snapshot.status}
                                </span>
                            </td>
                            <td class="p-4">{formatDate(snapshot.created)}</td>
                            <td class="p-4">{snapshot.dataset_size !== undefined ? `${snapshot.dataset_size} records` : 'N/A'}</td>
                            <td class="p-4">{snapshot.cost !== undefined ? `$${snapshot.cost}` : 'N/A'}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else if !loading}
        <div class="text-gray-500 p-4 border rounded">
            No snapshots found. Click the button above to fetch snapshots.
        </div>
    {/if}
</div>

<style>
    .table-container {
        overflow-x: auto;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    table {
        border-collapse: collapse;
    }
    
    th, td {
        border-bottom: 1px solid #eee;
    }
</style>