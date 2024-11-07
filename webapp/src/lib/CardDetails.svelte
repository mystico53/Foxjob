<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/jobStore';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import { popup } from '@skeletonlabs/skeleton';

	export let job = {};
	export let handleNext;
	export let previousJob;
	export let isFirstJob;
	export let isLastJob;
	export let toggleBookmark;
	export let openJobLink;

	const popupHover = {
        event: 'hover',
        target: 'popupHover',
        placement: 'left',
        duration: 0
    };

	let isHiding = false;
	let currentStatus = job?.generalData?.status?.toLowerCase() || '';

	

	// Update currentStatus whenever job changes
	$: if (job?.generalData?.status) {
		currentStatus = job.generalData.status.toLowerCase();
	}

	function formatDate(timestamp) {
		if (timestamp && timestamp.toDate) {
			const date = timestamp.toDate();
			return date.toLocaleString(undefined, {
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric'
			});
		}
		return 'N/A';
	}
	

	async function handleHide() {
    try {
        isHiding = true;
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('No user logged in');

        await jobStore.hideJob(userId, job.id);
        // After successfully hiding, move to next job
        handleNext(job.id);
    } catch (error) {
        console.error('Error hiding job:', error);
    } finally {
        isHiding = false;
    }
}

	async function handleBookmark() {
		try {
			const newStatus = currentStatus === 'bookmarked' ? 'read' : 'bookmarked';
			await toggleBookmark(job.id);
		} catch (error) {
			console.error('Error toggling bookmark:', error);
		}
	}

	async function handleVisitJob() {
		if (job.generalData?.url) {
			openJobLink(job.generalData.url);
		}
	}

	function truncateText(text, maxLength = 50) {
		if (!text) return 'N/A';
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}
</script>

<!-- Main card content -->
<div class="bg-surface-100 mx-auto mb-20 max-w-4xl space-y-8 p-6">
	<!-- Header Section -->
	<div class="flex w-full justify-between gap-4">
		<!-- Left Column: All info except radial -->
		<div class="flex-1 space-y-4">
			<!-- Company and Title -->
			<div>
				<div class="flex items-center gap-2 pb-4">
					<h5 class="h5 m-0 flex items-center">{job.jobInfo?.jobTitle || 'N/A'}</h5>
					<!-- svelte-ignore a11y-invalid-attribute -->
					<button
						type="button"
						class="flex cursor-pointer items-center"
						on:click={handleVisitJob}
						on:keydown={(e) => e.key === 'Enter' && handleVisitJob()}
						aria-label="Visit Job"
					>
						<iconify-icon icon="solar:file-right-linear"></iconify-icon>
					</button>
				</div>
				<h1 class="h1">{job.companyInfo?.name || 'N/A'}</h1>
			</div>

			<!-- Meta Information -->
			<div class="space-y-2">
				<!-- First Row -->
				<div class="flex w-full justify-between gap-24">
					<span class="chip variant-ghost-surface" title={job.companyInfo?.industry || 'N/A'}>
						<iconify-icon icon="solar:buildings-3-bold"></iconify-icon>
						<span>
							{truncateText(job.companyInfo?.industry)}
						</span>
					</span>
					<span class="chip variant-ghost-surface" title={job.jobInfo?.remoteType || 'N/A'}>
						<iconify-icon icon="solar:pin-bold"></iconify-icon>
						<span>
							{truncateText(job.jobInfo?.remoteType)}
						</span>
					</span>
				</div>

				<!-- Second Row -->
				<div class="flex w-full justify-between">
					<span class="chip variant-ghost-surface" title={job.compensation || 'N/A'}>
						<iconify-icon icon="solar:money-bag-bold"></iconify-icon>
						<span>
							{truncateText(job.compensation)}
						</span>
					</span>
					<span class="chip variant-ghost-surface" title={formatDate(job.generalData?.timestamp)}>
						<iconify-icon icon="solar:calendar-mark-linear"></iconify-icon>
						<span>
							{truncateText(formatDate(job.generalData?.timestamp))}
						</span>
					</span>
				</div>
			</div>
		</div><!-- Wrap the ProgressRadial in a container for the popup -->
		{#if job?.AccumulatedScores?.accumulatedScore !== undefined}
		<div class="flex items-start justify-end">
			<div class="relative" use:popup={popupHover}>
				<ProgressRadial
					class="!w-32 cursor-pointer"
					stroke={60}
					font={150}
					meter="!stroke-primary-500"
					track="!stroke-tertiary-500/30"
					strokeLinecap="round"
					value={Math.round(job.AccumulatedScores.accumulatedScore || 0)}
				>
					{Math.round(job.AccumulatedScores.accumulatedScore || 0)}
				</ProgressRadial>
			</div>
		
			<!-- Popup Content -->
			<div class="card p-4 variant-filled-secondary" data-popup="popupHover">
				<div class="space-y-2">
					<div class="grid grid-cols-2 gap-x-4 gap-y-1">
						<span class="text-sm opacity-75">Accumulated Score:</span>
						<span class="text-sm font-semibold">{Math.round(job.AccumulatedScores?.accumulatedScore || 0)}</span>

						<span class="text-sm opacity-75">Quick Scan Score:</span>
						<span class="text-sm font-semibold">{Math.round(job.AccumulatedScores?.requirementScore || 0)}</span>
						
						<span class="text-sm opacity-75">Domain Score:</span>
						<span class="text-sm font-semibold">{Math.round(job.AccumulatedScores?.domainScore || 0)}</span>
						
						<span class="text-sm opacity-75">Hard Skill Score:</span>
						<span class="text-sm font-semibold">{Math.round(job.AccumulatedScores?.hardSkillScore || 0)}</span>		
						
						<span class="text-sm opacity-75">Verdict Score:</span>
						<span class="text-sm font-semibold">{Math.round(job.AccumulatedScores?.verdictScore || 0)}</span>
					</div>
				</div>
				<div class="arrow variant-filled-secondary" />
			</div>
		</div>
		
		{/if}</div>

		

	<div class="card p-4 w-full border-0">
		<p class="text-sm mb-4">
			<span class="font-bold">Company Focus: </span>
			{job?.companyInfo?.companyFocus || 'No company focus information available'}
		</p>
		<p class="text-sm mb-4">
			<span class="font-bold">Job Description: </span>
			{job?.jobInfo?.jobSummary || 'No job summary available'}
		</p>
	</div>

	<!-- Final Verdict Section -->
	<div class="card p-4 w-full">
		
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			
			<div>
				<div class="flex flex-col items-center mb-6">
					<iconify-icon 
						icon="solar:shield-plus-bold" 
						class="text-4xl mb-2 text-primary-500"
						width="48" 
						height="48"
					></iconify-icon>
					<h4 class="font-semibold block">Your Strengths</h4>
				</div>
				<div class="space-y-2">
					{#if job.verdict?.keyStrengths}
						<ul class="list-disc pl-5 space-y-2">
							{#each Object.entries(job.verdict.keyStrengths) as [key, value]}
								<li class="text-sm">
									<span class="font-bold">{key}:</span> {value || 'N/A'}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-surface-600-300-token">No strengths assessed yet</p>
					{/if}
				</div>
			</div>
		
			
			<div>
				<div class="flex flex-col items-center mb-6">
					<iconify-icon 
						icon="solar:minus-square-bold" 
						class="text-4xl mb-2 text-primary-500"
						width="48" 
						height="48"
					></iconify-icon>
					<h4 class="font-semibold block">Your Gaps</h4>
				</div>
				<div class="space-y-2">
					{#if job.verdict?.keyGaps}
						<ul class="list-disc pl-5 space-y-2">
							{#each Object.entries(job.verdict.keyGaps) as [key, value]}
								<li class="text-sm">
									<span class="font-bold">{key}:</span> {value || 'N/A'}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-surface-600-300-token">No gaps assessed yet</p>
					{/if}
				</div>
			</div>
		</div>
		
	</div>
</div>

<!-- Fixed position action buttons -->
<div
	class="bg-surface-100 fixed inset-x-0 bottom-0 z-10 border-t p-4 md:left-[25rem] md:right-[1rem]"
>
	<div class="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
		<button
			class="btn variant-primary flex items-center gap-2"
			on:click={previousJob}
			disabled={isFirstJob || isHiding}
		>
			<iconify-icon icon="solar:map-arrow-left-bold"></iconify-icon>
		</button>

		<button class="btn variant-soft" on:click={handleHide} disabled={isHiding}>
			{isHiding ? 'Archiving...' : 'Archive'}
		</button>

		<button class="btn variant-filled" on:click={handleBookmark} disabled={isHiding}>
			{#if currentStatus === 'bookmarked'}
				Bookmarked
			{:else}
				Bookmark
			{/if}
		</button>

		<button
			class="btn variant-primary flex items-center gap-2"
			on:click={() => handleNext(job.id)}
			disabled={isLastJob || isHiding}
		>
			<iconify-icon icon="solar:map-arrow-right-bold"></iconify-icon>
		</button>
	</div>
</div>