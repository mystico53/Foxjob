<!-- +page.svelte -->
<script>
    import { authStore } from '$lib/stores/authStore';
    import { getCloudFunctionUrl } from '$lib/config/environment.config.js';
    
    let snapshotId = 's_m8p2xt0l8bvwlyt6';
    let processing = false;
    let error = null;
    let result = null;
    let firebaseUid;

    authStore.subscribe(user => {
      firebaseUid = user?.uid;
    });


    const FUNCTION_URL = getCloudFunctionUrl('downloadAndProcessSnapshot');
    console.log('Using function URL:', FUNCTION_URL);

    async function handleDownload() {
    if (!snapshotId.trim()) {
        error = 'Please enter a snapshot ID';
        return;
    }

    if (!firebaseUid) {  // Added check for firebaseUid
        error = 'User authentication required';
        return;
    }

    processing = true;
    error = null;
    result = null;

    try {
        const url = `${FUNCTION_URL}?snapshotId=${encodeURIComponent(snapshotId.trim())}&firebaseUid=${encodeURIComponent(firebaseUid)}`;
        console.log('Fetching:', url);
        
        // Set up headers based on environment
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        // Only add ngrok header if the URL contains 'ngrok'
        if (FUNCTION_URL.includes('ngrok')) {
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
            result = JSON.parse(text);
            console.log('Success:', result);
        } catch (e) {
            console.error('Failed to parse response:', text);
            throw new Error('Invalid JSON response from server');
        }
    } catch (e) {
        console.error('Error:', e);
        error = e.message;
    } finally {
        processing = false;
  }
}
  
</script>
  
  <div class="container p-4">
    <div class="snapshot-form">
      <input
        type="text"
        bind:value={snapshotId}
        placeholder="Enter snapshot ID"
        disabled={processing}
        class="input"
      />
      <button 
        on:click={handleDownload} 
        disabled={!snapshotId || processing || !firebaseUid}
        class="button"
      >
        {processing ? 'Processing...' : 'Download Snapshot'}
      </button>
    </div>
  
    {#if error}
      <div class="error">
        Error: {error}
      </div>
    {/if}
  
    {#if result}
      <div class="result">
        <h3>Processing Results:</h3>
        <p>Total Jobs: {result.processed?.total || 0}</p>
        <p>Successful: {result.processed?.successful || 0}</p>
        <p>Failed: {result.processed?.failed || 0}</p>
      </div>
    {/if}
  </div>
  
  <style>
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
  
    .snapshot-form {
      margin: 20px 0;
      display: flex;
      gap: 10px;
    }
  
    .input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  
    .button {
      padding: 8px 16px;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  
    .button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  
    .error {
      margin: 10px 0;
      padding: 8px;
      background: #fff0f0;
      color: #d32f2f;
      border-radius: 4px;
    }
  
    .result {
      margin: 20px 0;
      padding: 16px;
      background: #f8f8f8;
      border-radius: 4px;
    }
  </style>