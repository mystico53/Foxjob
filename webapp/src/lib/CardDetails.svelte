<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/jobStore';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';

	export let job = {};
	export let handleNext;
	export let previousJob;
	export let isFirstJob;
	export let isLastJob;
	export let toggleBookmark;
	export let openJobLink;
	export let hideJobAndNext;

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
			await hideJobAndNext(job.id);
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
		</div>

		<!-- Right Column: Radial Progress -->
		{#if job.matchResult?.totalScore !== undefined}
			<div class="flex items-start justify-end">
				<ProgressRadial
					class="!w-32"
					stroke={60}
					font={150}
					meter="!stroke-primary-500"
					track="!stroke-tertiary-500/30"
					strokeLinecap="round"
					value={Math.round(job.matchResult.totalScore)}
				>
					{Math.round(job.matchResult.totalScore)}
				</ProgressRadial>
			</div>
		{/if}
	</div>

	<!-- Final Verdict Section -->
	<div class="card p-4 w-full">
		<h3 class="h5 mb-4">Final Verdict</h3>
		<p class="mb-6">{job.verdict?.finalVerdict || 'No verdict available'}</p>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Key Strengths -->
			<div>
				<h4 class="h6 mb-4">Key Strengths</h4>
				<div class="space-y-3">
					<div>
						<span class="font-semibold">Strength 1:</span>
						<p class="mt-1">{job.verdict?.keyStrengths?.field1 || 'N/A'}</p>
					</div>
					<div>
						<span class="font-semibold">Strength 2:</span>
						<p class="mt-1">{job.verdict?.keyStrengths?.field2 || 'N/A'}</p>
					</div>
					<div>
						<span class="font-semibold">Strength 3:</span>
						<p class="mt-1">{job.verdict?.keyStrengths?.field3 || 'N/A'}</p>
					</div>
				</div>
			</div>

			<!-- Key Gaps -->
			<div>
				<h4 class="h6 mb-4">Key Gaps</h4>
				<div class="space-y-3">
					<div>
						<span class="font-semibold">Gap 1:</span>
						<p class="mt-1">{job.verdict?.keyGaps?.field1 || 'N/A'}</p>
					</div>
					<div>
						<span class="font-semibold">Gap 2:</span>
						<p class="mt-1">{job.verdict?.keyGaps?.field2 || 'N/A'}</p>
					</div>
					<div>
						<span class="font-semibold">Gap 3:</span>
						<p class="mt-1">{job.verdict?.keyGaps?.field3 || 'N/A'}</p>
					</div>
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