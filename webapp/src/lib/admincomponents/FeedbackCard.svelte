<script>
	import { fade, slide } from 'svelte/transition';

	export let feedback;
	export let isSelected = false;
	export let handleClick = () => {};

	$: formattedDate = feedback.timestamp
		? new Intl.DateTimeFormat('en-US', {
				month: '2-digit',
				day: '2-digit',
				year: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			}).format(feedback.timestamp)
		: 'No date';
</script>

<button
	in:fade={{ duration: 400 }}
	out:slide={{ duration: 400 }}
	class="card variant-ghost-tertiary w-full cursor-pointer border-2 p-4 text-left transition-all duration-300 hover:shadow-lg {isSelected
		? 'border-primary-500 bg-surface-600/10'
		: 'border-transparent hover:border-primary-500 hover:bg-surface-600/10'}"
	on:click={handleClick}
>
	<div class="card-content grid grid-cols-[auto_1fr_auto] items-start gap-4">
		<!-- Type Indicator -->
		<div class="flex justify-center">
			{#if feedback.type === 'upvote'}
				<div class="text-success-500">
					<iconify-icon icon="solar:like-bold" width="24" />
				</div>
			{:else}
				<div class="text-error-500">
					<iconify-icon icon="solar:dislike-bold" width="24" />
				</div>
			{/if}
		</div>

		<!-- Main Content -->
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<span
					class="badge {feedback.type === 'upvote'
						? 'variant-filled-success'
						: 'variant-filled-error'}"
				>
					{feedback.type}
				</span>
				<span class="opacity-70">{formattedDate}</span>
			</div>

			<div class="space-y-1">
				<div class="truncate">
					<span class="font-bold">Job:</span>
					{feedback.jobId}
				</div>
				<div class="truncate">
					<span class="font-bold">Item:</span>
					{feedback.itemId}
				</div>
			</div>
		</div>
	</div>
</button>
