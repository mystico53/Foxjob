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
		envVars = Object.keys(import.meta.env)
			.sort()
			.map((key) => ({
				key,
				value: key.includes('KEY') || key.includes('SECRET') ? '[REDACTED]' : import.meta.env[key]
			}));
	});
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Environment Diagnostics</h1>

	<div class="mb-4 rounded bg-gray-100 p-4">
		<p><strong>Current Environment Mode:</strong> {environment}</p>
		<p><strong>Hostname:</strong> {hostname}</p>
		<p>
			<strong>Is Localhost:</strong>
			{hostname === 'localhost' || hostname === '127.0.0.1' ? 'Yes' : 'No'}
		</p>
	</div>

	<h2 class="mb-2 text-xl font-bold">Firebase Config</h2>
	<pre class="overflow-auto rounded bg-gray-100 p-4">
    {JSON.stringify(config, null, 2)}
  </pre>

	<h2 class="mb-2 mt-4 text-xl font-bold">Environment Variables</h2>
	<div class="overflow-auto rounded bg-gray-100 p-4">
		<table class="w-full">
			<thead>
				<tr>
					<th class="p-2 text-left">Variable</th>
					<th class="p-2 text-left">Value</th>
				</tr>
			</thead>
			<tbody>
				{#each envVars as { key, value }}
					<tr>
						<td class="border-t p-2">{key}</td>
						<td class="border-t p-2">{value}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
