<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { fade, slide } from 'svelte/transition';

	export let companyName;
	export let jobTitle;
	export let score;
	export let status;
	export let timestamp;
	export let isSelected;
	export let handleClick = () => {};
	export let jobId;
	export let toggleBookmark;

	$: formattedDate = timestamp
		? new Intl.DateTimeFormat('en-US', {
				month: '2-digit',
				day: '2-digit',
				year: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})
				.format(timestamp)
				.replace(',', ' -')
		: 'No date';

	function getStatusDisplay(status) {
		if (!status) return '';
		switch (status.toLowerCase()) {
			case 'bookmarked':
				return 'bookmarked';
			case 'new':
				return 'New';
			case 'read':
				return 'Read';
			default:
				return status;
		}
	}

	async function handleBookmarkClick(event) {
		event.stopPropagation();
		await toggleBookmark(jobId); // Pass the jobId to toggleBookmark
	}
</script>

<button
	in:fade={{ duration: 400 }}
	out:slide={{ duration: 400 }}
	class="card variant-ghost-tertiary hover:bg-surface-600/10 w-full cursor-pointer border-2 border-transparent p-4 text-left hover:border-orange-500 {isSelected
		? 'border-orange-500 shadow-lg'
		: ''} transition-all duration-300 hover:shadow-lg"
	on:click={handleClick}
	aria-label="View details for {jobTitle} position at {companyName}"
>
	<div class="card-content grid grid-cols-[auto_1fr_auto] items-start gap-4">
		<!-- Column for ProgressRadial -->
		<div class="progress-column flex justify-center">
			{#if score !== null}
				<ProgressRadial
					class="progress-radial w-8"
					value={Math.round(score)}
					stroke={60}
					meter="!stroke-primary-500"
					track="!stroke-tertiary-500/30"
					font={180}
					strokeLinecap="round"
				>
					{Math.round(score)}
				</ProgressRadial>
			{/if}
		</div>

		<!-- Column for Main Content -->
		<div class="content-column space-y-2">
			<h3 class="company-name h3 font-bold">{companyName}</h3>
			<div class="job-title text-surface-600-300-token text-sm">{jobTitle}</div>
			<div class="timestamp text-surface-600-300-token inline-flex items-center gap-1 text-xs">
				<iconify-icon icon="solar:calendar-mark-linear"></iconify-icon>
				{formattedDate}
			</div>
		</div>

		<!-- Updated Status Column -->
		<!-- Updated Status Column -->
		<div class="status-column flex items-center text-sm">
			<button
				class="hover:bg-surface-100 flex items-center justify-center rounded-full p-1"
				on:click={handleBookmarkClick}
				aria-label={getStatusDisplay(status) === 'bookmarked' ? 'Remove bookmark' : 'Add bookmark'}
			>
				{#if getStatusDisplay(status) === 'bookmarked'}
					<iconify-icon class="text-xl text-black" icon="solar:bookmark-bold"></iconify-icon>
				{:else}
					<iconify-icon class="text-xl text-black" icon="solar:bookmark-outline"></iconify-icon>
				{/if}
			</button>
		</div>
	</div>
</button>
