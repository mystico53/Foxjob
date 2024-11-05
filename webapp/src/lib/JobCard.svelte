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
			case 'starred':
				return 'Starred';
			case 'new':
				return 'New';
			case 'read':
				return 'Read';
			default:
				return status;
		}
	}
</script>

<button
	in:fade={{ duration: 400 }}
	out:slide={{ duration: 400 }}
	class="card variant-ghost-tertiary hover:bg-surface-600/10 w-full cursor-pointer p-4 text-left {isSelected
		? 'card-hover !bg-surface-600/20'
		: ''}"
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

		<!-- Column for Status -->
		{#if status}
			<div class="status-column flex items-center text-sm">
				<span class="status">{getStatusDisplay(status)}</span>
			</div>
		{/if}
	</div>
</button>
