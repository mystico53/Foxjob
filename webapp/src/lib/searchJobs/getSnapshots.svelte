<script>
    import { authStore } from '$lib/stores/authStore';
    import { getCloudFunctionUrl } from '$lib/config/environment.config.js';
    
    export let datasetId = 'gd_lpfll7v5hcqtkxl6l';
    
    let loading = false;
    let error = null;
    let snapshots = [];
    let downloadingSnapshots = new Set(); // Track which snapshots are being downloaded
    let downloadResults = {}; // Store download results for each snapshot
    let firebaseUid;

    authStore.subscribe(user => {
      firebaseUid = user?.uid;
    });

    const DOWNLOAD_FUNCTION_URL = getCloudFunctionUrl('downloadAndProcessSnapshot');
  
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

    async function downloadSnapshot(snapshotId) {
      if (!firebaseUid) {
        downloadResults[snapshotId] = { error: 'User authentication required' };
        return;
      }

      downloadingSnapshots.add(snapshotId);
      downloadingSnapshots = downloadingSnapshots; // Trigger reactivity
      delete downloadResults[snapshotId]; // Clear previous results

      try {
        const url = `${DOWNLOAD_FUNCTION_URL}?snapshotId=${encodeURIComponent(snapshotId)}&firebaseUid=${encodeURIComponent(firebaseUid)}`;
        console.log('Downloading snapshot:', snapshotId, 'URL:', url);
        
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        
        if (DOWNLOAD_FUNCTION_URL.includes('ngrok')) {
          headers['ngrok-skip-browser-warning'] = 'true';
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers,
          mode: 'cors'
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to process snapshot: ${response.statusText}. Response: ${text}`);
        }

        const text = await response.text();
        try {
          const result = JSON.parse(text);
          downloadResults[snapshotId] = { success: result };
          console.log('Download success for', snapshotId, ':', result);
        } catch (e) {
          console.error('Failed to parse response:', text);
          throw new Error('Invalid JSON response from server');
        }
      } catch (e) {
        console.error('Download error for', snapshotId, ':', e);
        downloadResults[snapshotId] = { error: e.message };
      } finally {
        downloadingSnapshots.delete(snapshotId);
        downloadingSnapshots = downloadingSnapshots; // Trigger reactivity
        downloadResults = downloadResults; // Trigger reactivity
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

    function isDownloadDisabled(snapshot) {
      return snapshot.status !== 'ready' || downloadingSnapshots.has(snapshot.id) || !firebaseUid;
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
                        <th class="p-4 text-left bg-gray-50 font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each snapshots as snapshot (snapshot.id)}
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-4 font-mono text-sm">{snapshot.id}</td>
                            <td class="p-4">
                                <span class={getStatusColor(snapshot.status)}>
                                    {snapshot.status}
                                </span>
                            </td>
                            <td class="p-4">{formatDate(snapshot.created)}</td>
                            <td class="p-4">{snapshot.dataset_size !== undefined ? `${snapshot.dataset_size} records` : 'N/A'}</td>
                            <td class="p-4">{snapshot.cost !== undefined ? `$${snapshot.cost}` : 'N/A'}</td>
                            <td class="p-4">
                                <div class="flex flex-col gap-2">
                                    <button
                                        on:click={() => downloadSnapshot(snapshot.id)}
                                        disabled={isDownloadDisabled(snapshot)}
                                        class="px-3 py-1 text-sm rounded transition-colors {
                                            downloadingSnapshots.has(snapshot.id) 
                                                ? 'bg-yellow-500 text-white cursor-not-allowed' 
                                                : snapshot.status === 'ready' && firebaseUid
                                                    ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }"
                                    >
                                        {#if downloadingSnapshots.has(snapshot.id)}
                                            Downloading...
                                        {:else if snapshot.status !== 'ready'}
                                            Not Ready
                                        {:else if !firebaseUid}
                                            Login Required
                                        {:else}
                                            Download
                                        {/if}
                                    </button>
                                    
                                    {#if downloadResults[snapshot.id]}
                                        <div class="text-xs">
                                            {#if downloadResults[snapshot.id].success}
                                                <div class="text-green-600 font-medium">
                                                    ✓ Success: {downloadResults[snapshot.id].success.processed?.total || 0} jobs
                                                </div>
                                            {:else if downloadResults[snapshot.id].error}
                                                <div class="text-red-600 font-medium">
                                                    ✗ Error: {downloadResults[snapshot.id].error}
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </td>
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