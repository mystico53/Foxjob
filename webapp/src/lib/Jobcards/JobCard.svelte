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
	export let remoteType;
	export let compensation;

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
		

		$: if (score !== null) {
        console.log(`ProgressRadial loaded with score: ${score}`);
    }		

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
		await toggleBookmark(jobId);
	}

	// Remove truncate function since we'll handle it with CSS
</script>

<button
	in:fade={{ duration: 400 }}
	out:slide={{ duration: 400 }}
	class="card variant-ghost-tertiary w-full cursor-pointer border-2 p-4 text-left transition-all duration-300 hover:shadow-lg {isSelected
		? 'bg-surface-600/10 border-orange-500'
		: 'hover:bg-surface-600/10 border-transparent hover:border-orange-500'}"
	on:click={handleClick}
	aria-label="View details for {jobTitle} position at {companyName}"
>
	<div class="card-content grid grid-cols-[auto_1fr_auto] items-start gap-4">
		<!-- Column for ProgressRadial -->
		<div class="progress-column flex justify-center items-center w-8">
			{#if score !== null}
				<div
					in:fade={{ duration: 400, delay: 100 }}
					class="relative w-8 h-8 flex items-center justify-center"
				>
				<ProgressRadial
				class="!w-32"
				stroke={60}
				font={150}
				meter="!stroke-primary-500"
				track="!stroke-tertiary-500/30"
				strokeLinecap="round"
				value={Math.round(score)}
			>
				{Math.round(score)}
			</ProgressRadial>
				</div>
			{/if}
		</div>

		<!-- Column for Main Content -->
		<div class="content-column space-y-2">
			<h3 class="h6 font-bold">{companyName}</h3>
			<div class="text-base">{jobTitle}</div>
			<div class="flex flex-col gap-3 text-xs">
				<div class="flex items-center justify-between">
					<div class="inline-flex items-center gap-1">
						<iconify-icon icon="solar:calendar-mark-linear"></iconify-icon>
						<span>{formattedDate}</span>
					</div>
					{#if remoteType}
						<div class="inline-flex items-center gap-1">
							<iconify-icon icon="solar:global-linear"></iconify-icon>
							<span class="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap"
								>{remoteType}</span
							>
						</div>
					{/if}
				</div>
				{#if compensation}
					<div class="group relative flex items-center">
						<div class="inline-flex items-center gap-1">
							<iconify-icon icon="solar:dollar-minimalistic-linear"></iconify-icon>
							<!-- Added wider max-width and tooltip -->
							<span
								class="hover:bg-surface-100 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap hover:rounded"
								title={compensation}
							>
								{compensation}
							</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Status Column -->
		<div class="status-column flex items-center">
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
