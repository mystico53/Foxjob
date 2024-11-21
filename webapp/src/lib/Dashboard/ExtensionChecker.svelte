<!-- ExtensionChecker.svelte -->
<script>
	import { onMount } from 'svelte';

	let isInstalled = false;
	let checkComplete = false;
	let debugLog = [];
	const extensionId = 'lbncdalbaajjafnpgplghkdaiflfihjp';

	function addDebugLog(message) {
		debugLog = [...debugLog, { time: new Date().toLocaleTimeString(), message }];
		console.log(`Debug: ${message}`);
	}

	onMount(() => {
		addDebugLog('Component mounted');
		checkExtension();
	});

	function checkExtension() {
		addDebugLog('Starting extension check');

		// Check if chrome exists
		if (typeof chrome === 'undefined') {
			addDebugLog('❌ Chrome object is undefined');
			isInstalled = false;
			checkComplete = true;
			return;
		}
		addDebugLog('✅ Chrome object exists');

		// Check if runtime exists
		if (!chrome.runtime) {
			addDebugLog('❌ chrome.runtime is undefined');
			isInstalled = false;
			checkComplete = true;
			return;
		}
		addDebugLog('✅ chrome.runtime exists');

		// Check if sendMessage exists
		if (!chrome.runtime.sendMessage) {
			addDebugLog('❌ chrome.runtime.sendMessage is undefined');
			isInstalled = false;
			checkComplete = true;
			return;
		}
		addDebugLog('✅ chrome.runtime.sendMessage exists');

		try {
			addDebugLog(`Attempting to send message to extension: ${extensionId}`);

			chrome.runtime.sendMessage(extensionId, { message: 'version' }, function (reply) {
				if (chrome.runtime.lastError) {
					addDebugLog(`❌ Runtime error: ${chrome.runtime.lastError.message}`);
					isInstalled = false;
					checkComplete = true;
					return;
				}

				if (reply) {
					addDebugLog(`✅ Received reply from extension: ${JSON.stringify(reply)}`);
					isInstalled = true;
				} else {
					addDebugLog('❌ No reply received from extension');
					isInstalled = false;
				}
				checkComplete = true;
			});

			// Timeout in case there's no response
			setTimeout(() => {
				if (!checkComplete) {
					addDebugLog('❌ Timeout - no response received after 1000ms');
					isInstalled = false;
					checkComplete = true;
				}
			}, 1000);
		} catch (e) {
			addDebugLog(`❌ Error caught: ${e.message}`);
			isInstalled = false;
			checkComplete = true;
		}
	}
</script>

<div class="p-4">
	{#if checkComplete}
		<p class="text-lg {isInstalled ? 'text-green-600' : 'text-red-600'}">
			Extension is {isInstalled ? 'installed' : 'not installed'}
		</p>
	{:else}
		<p class="text-lg text-gray-600">Checking extension status...</p>
	{/if}

	<!-- Debug Log Section -->
	<div class="mt-4">
		<h3 class="mb-2 text-lg font-semibold">Debug Log:</h3>
		<div class="max-h-60 overflow-y-auto rounded-lg bg-gray-100 p-3">
			{#each debugLog as log}
				<div class="mb-1 text-sm">
					<span class="text-gray-500">[{log.time}]</span>
					{log.message}
				</div>
			{/each}
		</div>
	</div>

	<!-- Manual Check Button -->
	<button
		class="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
		on:click={() => {
			debugLog = [];
			checkComplete = false;
			checkExtension();
		}}
	>
		Check Again
	</button>
</div>
