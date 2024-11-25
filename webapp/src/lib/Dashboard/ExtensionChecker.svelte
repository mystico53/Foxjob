<!-- ExtensionChecker.svelte -->
<script>
	import { onMount } from 'svelte';
	import { userStateStore, setExtensionStatus } from '$lib/stores/userStateStore.js';

	const productionId = 'lbncdalbaajjafnpgplghkdaiflfihjp';
	const developmentId = 'jednpafjmjheknpcfgijkhklhmnifdln';
	
	// Add debug state
	let debugInfo = {
		chromeAvailable: false,
		runtimeAvailable: false,
		sendMessageAvailable: false,
		lastError: null,
		timeoutOccurred: false
	};

	onMount(() => {
		checkBothExtensions();
	});

	async function checkBothExtensions() {
		try {
			// Reset debug info
			debugInfo = {
				chromeAvailable: false,
				runtimeAvailable: false,
				sendMessageAvailable: false,
				lastError: null,
				timeoutOccurred: false
			};

			// Set check as incomplete while checking
			setExtensionStatus(false, false, false);

			// Update debug info for Chrome availability
			debugInfo.chromeAvailable = typeof chrome !== 'undefined';
			debugInfo.runtimeAvailable = debugInfo.chromeAvailable && !!chrome.runtime;
			debugInfo.sendMessageAvailable = debugInfo.runtimeAvailable && !!chrome.runtime.sendMessage;

			const prodInstalled = await checkExtension(productionId);
			const devInstalled = await checkExtension(developmentId);

			setExtensionStatus(prodInstalled, devInstalled, true);
		} catch (e) {
			debugInfo.lastError = e.message;
			setExtensionStatus(false, false, true);
		}
	}

	function checkExtension(extensionId) {
		return new Promise((resolve) => {
			if (!debugInfo.sendMessageAvailable) {
				resolve(false);
				return;
			}

			let timeoutId;

			try {
				timeoutId = setTimeout(() => {
					debugInfo.timeoutOccurred = true;
					resolve(false);
				}, 1000);

				chrome.runtime.sendMessage(extensionId, { message: 'version' }, function (reply) {
					clearTimeout(timeoutId);
					
					if (chrome.runtime.lastError) {
						debugInfo.lastError = chrome.runtime.lastError.message;
						resolve(false);
						return;
					}
					
					resolve(!!reply);
				});
			} catch (e) {
				clearTimeout(timeoutId);
				debugInfo.lastError = e.message;
				resolve(false);
			}
		});
	}

	function retryCheck() {
		checkBothExtensions();
	}
</script>

<div class="p-4">
	{#if $userStateStore.extension.checkComplete}
		<p
			class="text-lg {$userStateStore.extension.isProductionInstalled ||
			$userStateStore.extension.isDevInstalled
				? 'text-green-600'
				: 'text-red-600'}"
		>
			{#if $userStateStore.extension.isProductionInstalled && $userStateStore.extension.isDevInstalled}
				Extension installed (dev and prod)
			{:else if $userStateStore.extension.isProductionInstalled}
				Extension installed
			{:else if $userStateStore.extension.isDevInstalled}
				Extension installed (dev)
			{:else}
				Extension is not installed
			{/if}
		</p>

		<!-- Add debug information -->
		{#if !$userStateStore.extension.isProductionInstalled}
			<div class="mt-4 text-sm text-gray-600">
				<p>Debug information:</p>
				<ul class="list-disc ml-4">
					<li>Chrome available: {debugInfo.chromeAvailable ? 'Yes' : 'No'}</li>
					<li>Runtime available: {debugInfo.runtimeAvailable ? 'Yes' : 'No'}</li>
					<li>SendMessage available: {debugInfo.sendMessageAvailable ? 'Yes' : 'No'}</li>
					{#if debugInfo.lastError}
						<li>Last error: {debugInfo.lastError}</li>
					{/if}
					{#if debugInfo.timeoutOccurred}
						<li>Check timed out</li>
					{/if}
				</ul>
				<button
					class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					on:click={retryCheck}
				>
					Retry Check
				</button>
			</div>
		{/if}
	{:else}
		<p class="text-lg text-gray-600">Checking extension status...</p>
	{/if}
</div>