<script>
  import { onMount } from 'svelte';
  import { getFirebaseConfig } from '$lib/config/firebase.config';
  
  let environment = 'Unknown';
  let config = {};
  let processEnv = {};
  let envVars = [];
  let hostname = '';
  
  onMount(() => {
    environment = import.meta.env.MODE;
    config = getFirebaseConfig();
    hostname = window.location.hostname;
    
    // Gather all environment variables
    envVars = Object.keys(import.meta.env).sort().map(key => ({
      key,
      value: key.includes('KEY') || key.includes('SECRET') ? '[REDACTED]' : import.meta.env[key]
    }));
  });
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Environment Diagnostics</h1>
  
  <div class="bg-gray-100 p-4 rounded mb-4">
    <p><strong>Current Environment Mode:</strong> {environment}</p>
    <p><strong>Hostname:</strong> {hostname}</p>
    <p><strong>Is Localhost:</strong> {hostname === 'localhost' || hostname === '127.0.0.1' ? 'Yes' : 'No'}</p>
  </div>
  
  <h2 class="text-xl font-bold mb-2">Firebase Config</h2>
  <pre class="bg-gray-100 p-4 rounded overflow-auto">
    {JSON.stringify(config, null, 2)}
  </pre>
  
  <h2 class="text-xl font-bold mb-2 mt-4">Environment Variables</h2>
  <div class="bg-gray-100 p-4 rounded overflow-auto">
    <table class="w-full">
      <thead>
        <tr>
          <th class="text-left p-2">Variable</th>
          <th class="text-left p-2">Value</th>
        </tr>
      </thead>
      <tbody>
        {#each envVars as { key, value }}
          <tr>
            <td class="p-2 border-t">{key}</td>
            <td class="p-2 border-t">{value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div> 