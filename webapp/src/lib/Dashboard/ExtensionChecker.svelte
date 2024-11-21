<!-- ExtensionChecker.svelte -->
<script>
	import { onMount } from 'svelte';
	import { userStateStore, setExtensionStatus } from '$lib/stores/userStateStore.js';

	const productionId = 'lbncdalbaajjafnpgplghkdaiflfihjp';
	const developmentId = 'jednpafjmjheknpcfgijkhklhmnifdln';

	onMount(() => {
		checkBothExtensions();
	});

	async function checkBothExtensions() {
		try {
			// Set check as incomplete while checking
			setExtensionStatus(false, false, false);

			const prodInstalled = await checkExtension(productionId);
			const devInstalled = await checkExtension(developmentId);

			setExtensionStatus(prodInstalled, devInstalled);
		} catch (e) {
			setExtensionStatus(false, false);
		}
	}

	function checkExtension(extensionId) {
		return new Promise((resolve) => {
			if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
				resolve(false);
				return;
			}

			try {
				chrome.runtime.sendMessage(extensionId, { message: 'version' }, function (reply) {
					if (chrome.runtime.lastError) {
						resolve(false);
						return;
					}
					resolve(!!reply);
				});

				setTimeout(() => {
					resolve(false);
				}, 1000);
			} catch (e) {
				resolve(false);
			}
		});
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
	{:else}
		<p class="text-lg text-gray-600">Checking extension status...</p>
	{/if}
</div>
