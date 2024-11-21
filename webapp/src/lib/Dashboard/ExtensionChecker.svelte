<!-- ExtensionChecker.svelte -->
<script>
	import { onMount } from 'svelte';

	let isProductionInstalled = false;
	let isDevInstalled = false;
	let checkComplete = false;
	const productionId = 'lbncdalbaajjafnpgplghkdaiflfihjp';
	const developmentId = 'jednpafjmjheknpcfgijkhklhmnifdln';

	onMount(() => {
		checkBothExtensions();
	});

	async function checkBothExtensions() {
		try {
			const prodInstalled = await checkExtension(productionId);
			const devInstalled = await checkExtension(developmentId);

			isProductionInstalled = prodInstalled;
			isDevInstalled = devInstalled;
			checkComplete = true;
		} catch (e) {
			isProductionInstalled = false;
			isDevInstalled = false;
			checkComplete = true;
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
	{#if checkComplete}
		<p
			class="text-lg {isProductionInstalled || isDevInstalled ? 'text-green-600' : 'text-red-600'}"
		>
			{#if isProductionInstalled && isDevInstalled}
				Extension installed (dev and prod)
			{:else if isProductionInstalled}
				Extension installed
			{:else if isDevInstalled}
				Extension installed (dev)
			{:else}
				Extension is not installed
			{/if}
		</p>
	{:else}
		<p class="text-lg text-gray-600">Checking extension status...</p>
	{/if}
</div>
