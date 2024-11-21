<!-- OnboardingProgress.svelte -->
<script>
	import { userStateStore } from '../../stores/userStateStore';
</script>

<div class="p-4 text-center">
	{#if $userStateStore.resume.isUploaded}
		<p class="text-success-500">Resume uploaded ✓</p>
	{:else}
		<p class="text-error-500">Resume not uploaded</p>
	{/if}

	{#if $userStateStore.extension.checkComplete}
		{#if $userStateStore.extension.isProductionInstalled || $userStateStore.extension.isDevInstalled}
			<p class="text-success-500">Extension installed ✓</p>
		{:else}
			<p class="text-error-500">Extension not installed</p>
		{/if}
	{/if}

	{#if $userStateStore.resume.isUploaded && ($userStateStore.extension.isProductionInstalled || $userStateStore.extension.isDevInstalled)}
		<p class="text-success-500">All set! ✓</p>
	{:else}
		<p class="text-error-500">Please complete setup</p>
	{/if}
</div>
