<!-- src/lib/components/InfoCard.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';

	// Props
	export let message =
		'Your agent is being created! You can expect an email with first results within the next few minutes.';
	export let icon = 'ℹ️'; // Default info emoji
	export let buttonText = 'Understood';
	export let show = true;
	export let loading = false;

	const dispatch = createEventDispatcher();

	function handleButtonClick() {
		dispatch('dismiss');
		show = false;
	}
</script>

{#if show}
	<div class="mb-4 flex items-start rounded-lg border border-blue-200 bg-blue-50 p-4 shadow">
		{#if loading}
			<!-- Skeleton Loading State -->
			<div class="mr-3 h-6 w-6 flex-shrink-0 animate-pulse rounded-full bg-blue-200"></div>
			<div class="flex-grow">
				<div class="mb-3 h-4 w-3/4 animate-pulse rounded bg-blue-200"></div>
				<div class="h-4 w-1/2 animate-pulse rounded bg-blue-200"></div>
				<div class="mt-3 flex justify-end">
					<div class="h-8 w-24 animate-pulse rounded-md bg-blue-300"></div>
				</div>
			</div>
		{:else}
			<!-- Normal State -->
			<div class="mr-3 flex-shrink-0 text-xl">
				{icon}
			</div>
			<div class="flex-grow">
				<p class="text-blue-700">{message}</p>
				<div class="mt-3 flex justify-end">
					<button
						on:click={handleButtonClick}
						class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						{buttonText}
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
