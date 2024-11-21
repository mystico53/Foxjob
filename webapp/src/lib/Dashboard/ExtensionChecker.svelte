<!-- ExtensionChecker.svelte -->
<script>
	import { onMount } from 'svelte';

	let isInstalled = false;
	let checkComplete = false;
	const extensionId = 'lbncdalbaajjafnpgplghkdaiflfihjp';

	onMount(() => {
		checkExtension();
	});

	function checkExtension() {
		if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
			try {
				chrome.runtime.sendMessage(extensionId, { message: 'version' }, function (reply) {
					isInstalled = !!reply;
					checkComplete = true;
				});

				// Timeout in case there's no response
				setTimeout(() => {
					if (!checkComplete) {
						isInstalled = false;
						checkComplete = true;
					}
				}, 1000);
			} catch (e) {
				isInstalled = false;
				checkComplete = true;
			}
		} else {
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
</div>
