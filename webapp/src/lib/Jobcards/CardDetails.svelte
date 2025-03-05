<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { fade } from 'svelte/transition';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/stores/jobStore';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import { popup } from '@skeletonlabs/skeleton';
	import { onMount, onDestroy } from 'svelte';
	import FeedbackButtons from '$lib/admincomponents/FeedbackThumbs.svelte';
	import ScoreAnalysis from '$lib/Jobcards/ScoreAnalysis.svelte';
	import { slide } from 'svelte/transition';
	import { db } from '$lib/firebase';
	import { doc, getDoc, updateDoc } from 'firebase/firestore';
	import { getCloudFunctionUrl } from '$lib/config/environment.config';

	export let job = {};
	export let handleNext;
	export let previousJob;
	export let isFirstJob;
	export let isLastJob;
	export let toggleBookmark;
	export let openJobLink;
	let showAnalysis = false;
	let processingJobs = new Set();

	const popupHover = {
		event: 'hover',
		target: 'popupHover',
		placement: 'left',
		duration: 200
	};

	$: score = job?.AccumulatedScores?.accumulatedScore;
	$: isVisible = score !== undefined;

	let popupInstance;

	onMount(() => {
		setTimeout(() => {
			const trigger = document.querySelector('[data-popup="popupHover"]');
			if (trigger) {
				trigger.style.opacity = '1';
			}
		}, 100);
	});

	onDestroy(() => {
		if (popupInstance) {
			popupInstance.destroy();
		}
	});

	let isHiding = false;
	let currentStatus = job?.generalData?.status?.toLowerCase() || '';

	// Update currentStatus whenever job changes
	$: if (job?.generalData?.status) {
		currentStatus = job.generalData.status.toLowerCase();
	}

	// Updated formatDate function to handle ISO date strings
	function formatDate(dateValue) {
		// Handle Firebase Timestamp objects (for backward compatibility)
		if (dateValue && dateValue.toDate) {
			const date = dateValue.toDate();
			return date.toLocaleString(undefined, {
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric'
			});
		}
		// Handle ISO date strings
		else if (dateValue && typeof dateValue === 'string') {
			const date = new Date(dateValue);
			if (!isNaN(date)) {
				return date.toLocaleString(undefined, {
					year: 'numeric',
					month: 'numeric',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric'
				});
			}
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
		// Updated to use the apply link from the new structure
		if (job.jobInfo?.applyUrl) {
			openJobLink(job.jobInfo.applyUrl);
		} else if (job.basicInfo?.applyLink) {
			// Fallback to direct access of applyLink
			openJobLink(job.basicInfo.applyLink);
		} else if (job.generalData?.url) {
			// Legacy fallback
			openJobLink(job.generalData.url);
		}
	}

	function truncateText(text, maxLength = 50) {
		if (!text) return 'N/A';
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}

	async function handleRetry(jobId) {
    if (!auth.currentUser || processingJobs.has(jobId)) return;

    processingJobs = new Set(processingJobs).add(jobId);
    const jobRef = doc(db, 'users', auth.currentUser.uid, 'jobs', jobId);

    try {
        await updateDoc(jobRef, {
            'generalData.processingStatus': 'retrying'
        });

        const retryUrl = getCloudFunctionUrl('retryProcessing');
        const response = await fetch(retryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobId: jobId,
                userId: auth.currentUser.uid
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to retry processing');
        }

        let attempts = 0;
        const maxAttempts = 90;
        
        const checkStatus = async () => {
            const docSnap = await getDoc(jobRef);
            const status = docSnap.data()?.generalData?.processingStatus;

            if (status === 'completed' || status === 'processed') {
                return true;
            }
            
            if (status === 'cancelled' || status === 'error') {
                return false;
            }

            if (attempts >= maxAttempts) {
                return false;
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            return checkStatus();
        };

        await checkStatus();

    } catch (error) {
        console.error('Error in handleRetry:', error);
        const jobRef = doc(db, 'users', auth.currentUser.uid, 'jobs', jobId);
        await updateDoc(jobRef, {
            'generalData.processingStatus': 'error'
        });
    } finally {
        processingJobs = new Set([...processingJobs].filter(id => id !== jobId));
    }
}
</script>

<!-- Main card content -->
<div class="bg-surface-100 mx-auto mb-20 max-w-4xl space-y-8 p-6">
	<!-- Header Section -->
	<div class="card p-8">
		<div class="flex w-full justify-between gap-4">
			<!-- Left Column: All info except radial -->
			<div class="flex-1 space-y-4">
				<!-- Company and Title -->
				<div>
					<h5 class="h5 m-0 flex items-center pb-4">{job.jobInfo?.jobTitle || 'N/A'}</h5>
					<div class="pb-2 flex items-center gap-3">
						{#if job.companyInfo?.logoUrl}
							<img 
								src={job.companyInfo.logoUrl} 
								alt="{job.companyInfo?.name || 'Company'} logo" 
								class="h-8 w-8 rounded-full object-cover"
							/>
						{/if}
						<h1 class="h1 font-bold">{job.companyInfo?.name || 'N/A'}</h1>
					</div>
				</div>

				<!-- Meta Information -->
				<div class="flex max-w-2xl flex-row flex-wrap">
					<span
						class="chip variant-ghost-surface text-base"
						title={job.companyInfo?.industry || job.details?.jobFunction || 'N/A'}
					>
						<iconify-icon icon="solar:buildings-3-bold"></iconify-icon>
						<span>{truncateText(job.companyInfo?.industry || job.details?.jobFunction)}</span>
					</span>

					<span
						class="chip variant-ghost-surface text-base"
						title={job.jobInfo?.location || job.basicInfo?.location || 'N/A'}
					>
						<iconify-icon icon="solar:pin-bold"></iconify-icon>
						<span>{truncateText(job.jobInfo?.location || job.basicInfo?.location)}</span>
					</span>

					<span class="chip variant-ghost-surface text-base" title={job.compensation || 'N/A'}>
						<iconify-icon icon="solar:money-bag-bold"></iconify-icon>
						<span>{truncateText(job.compensation)}</span>
					</span>

					<span
						class="chip variant-ghost-surface text-base"
						title={formatDate(job.jobInfo?.postedDate || job.details?.postedDate || job.generalData?.timestamp)}
					>
						<iconify-icon icon="solar:calendar-minimalistic-bold"></iconify-icon>
						<span>{truncateText(formatDate(job.jobInfo?.postedDate || job.details?.postedDate || job.generalData?.timestamp))}</span>
					</span>
				</div>
			</div>
			<!-- ProgressRadial section -->
			{#if job?.AccumulatedScores?.accumulatedScore !== undefined}
				{#key job.id}
					{#if isVisible}
						<div class="flex items-start justify-end">
							<div class="relative">
								<div class="relative flex h-32 w-32 items-center justify-center">
									<div
										in:fade={{ duration: 400, delay: 100 }}
										class="relative flex h-full w-full items-center justify-center"
									>
										<ProgressRadial
											class="!w-32"
											stroke={60}
											font={150}
											meter="!stroke-primary-500"
											track="!stroke-tertiary-700/30"
											strokeLinecap="round"
											value={Math.round(score || 0)}
										>
											{Math.round(score || 0)}
										</ProgressRadial>
									</div>

									<div class="absolute -right-2 -top-2" use:popup={popupHover}>
										<iconify-icon
											icon="solar:info-circle-bold"
											class="text-tertiary-900 cursor-pointer rounded-full"
										/>
										<div class="card variant-filled-tertiary w-[400px] p-4" data-popup="popupHover">
											<div class="space-y-4">
												<p class="hyphens-auto break-words text-sm opacity-75">
													Heads up! The score is estimated by an LLM, which can make mistakes.
													Please double-check the result. The LLM compares different parts of your
													resume to the job requirements. Feedback from curious people like yourself
													improves its accuracy. 🦊
												</p>

												<div class="grid w-full grid-cols-[1fr,auto] gap-x-6 gap-y-2">
													<span class="text-sm font-semibold opacity-75"
														>Main score = Average of the following scores:</span
													>
													<span class="text-right text-sm font-semibold"
														>{Math.round(score || 0)}</span
													>

													<!-- Only render these if job.AccumulatedScores exists -->
													{#if job.AccumulatedScores}
														<span class="text-sm opacity-75">Six most important requirements</span>
														<span class="text-right text-sm"
															>{Math.round(job.AccumulatedScores?.requirementScore || 0)}</span
														>

														<span class="text-sm opacity-75">Does domain expertise match?</span>
														<span class="text-right text-sm"
															>{Math.round(job.AccumulatedScores?.domainScore || 0)}</span
														>

														<span class="text-sm opacity-75">Hard Skills:</span>
														<span class="text-right text-sm"
															>{Math.round(job.AccumulatedScores?.hardSkillScore || 0)}</span
														>

														<span class="text-sm opacity-75">All infos considered:</span>
														<span class="text-right text-sm"
															>{Math.round(job.AccumulatedScores?.verdictScore || 0)}</span
														>
													{/if}
												</div>
											</div>
											<div class="arrow variant-filled-secondary" />
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				{/key}
			{/if}
		</div>

		<div class="w-full pt-8">
			<p class="mb-4 text-base">
				<span class="font-bold">Company Focus: </span>
				{job?.companyInfo?.companyFocus || 'No company focus information available'}
			</p>
			<p class="mb-4 text-base">
				<span class="font-bold">Job Description: </span>
				{job?.jobInfo?.jobSummary || job?.details?.description || 'No job summary available'}
			</p>
		</div>
	</div>

	<!-- Rest of component remains mostly the same -->
	<!-- Final Verdict Section -->
	<div class="card w-full p-4">
		<!-- Headers with icons -->
		<div class="mb-8 grid grid-cols-2 gap-6">
			<div class="flex items-center gap-2">
				<iconify-icon
					icon="solar:shield-plus-bold"
					class="text-primary-500 text-2xl"
					width="32"
					height="32"
				></iconify-icon>
				<h4 class="h4 font-bold">Your Strengths</h4>
			</div>
			<div class="flex items-center gap-2">
				<iconify-icon
					icon="solar:minus-square-bold"
					class="text-primary-500 text-2xl"
					width="32"
					height="32"
				></iconify-icon>
				<h4 class="h4 font-bold">Your Weaknesses</h4>
			</div>
		</div>

		<!-- Content -->
		{#if job.verdict}
			<div>
				{#each Array.from( { length: Math.max(Object.keys(job.verdict.keyStrengths || {}).length, Object.keys(job.verdict.keyGaps || {}).length) } ) as _, index}
					<div class="grid grid-cols-2 gap-6 last:border-b-0">
						<!-- Strength Item -->
						<div class="pb-6">
							{#if Object.entries(job.verdict.keyStrengths || {})[index]}
								{@const [key, value] = Object.entries(job.verdict.keyStrengths)[index]}
								<div class="text-base">
									<div class="flex items-start justify-between">
										<div>
											<strong class="font-bold">{key}:</strong>
											<span class="break-words text-gray-700">{value || 'N/A'}</span>
										</div>
										{#if job?.id}
											<FeedbackButtons
												jobId={job.id}
												path={`verdict.keyStrengths.${key}`}
												itemId={key}
												currentData={value}
											/>
										{/if}
									</div>
								</div>
							{/if}
						</div>

						<!-- Gap Item -->
						<div class="pb-6">
							{#if Object.entries(job.verdict.keyGaps || {})[index]}
								{@const [key, value] = Object.entries(job.verdict.keyGaps)[index]}
								<div class="text-base">
									<div class="flex items-start justify-between">
										<div>
											<strong class="text-base">{key}:</strong>
											<span class="break-words text-gray-700">{value || 'N/A'}</span>
										</div>
										{#if job?.id}
											<FeedbackButtons
												jobId={job.id}
												path={`verdict.keyGaps.${key}`}
												itemId={key}
												currentData={value}
											/>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-6">
				<p class="text-surface-600-300-token">No strengths assessed yet</p>
				<p class="text-surface-600-300-token">No gaps assessed yet</p>
			</div>
		{/if}
	</div>
	<div class="flex w-full flex-col items-center gap-4">
		<button
			class="btn variant-ghost-tertiary flex items-center gap-2"
			on:click={() => (showAnalysis = !showAnalysis)}
		>
			{#if showAnalysis}
				Hide Analysis
				<iconify-icon icon="solar:alt-arrow-up-bold"></iconify-icon>
			{:else}
				Show Analysis
				<iconify-icon icon="solar:alt-arrow-down-bold"></iconify-icon>
			{/if}
		</button>

		{#if showAnalysis}
			<div transition:slide>
				<ScoreAnalysis {job} />
			</div>
		{/if}
	</div>
</div>

<!-- Fixed position action buttons -->
<div
	class="bg-surface-100 fixed inset-x-0 bottom-0 z-10 border-t p-4 md:left-[25rem] md:right-[1rem]"
>
	<div class="mx-auto flex max-w-4xl flex-wrap justify-center gap-24">
		<button
			class="btn variant-primary flex items-center gap-2 rounded"
			on:click={previousJob}
			disabled={isFirstJob || isHiding}
		>
			<iconify-icon icon="solar:map-arrow-left-bold"></iconify-icon>
		</button>

		<div class="flex gap-4">
			<button
				class="btn variant-ghost-tertiary flex items-center gap-2 rounded"
				on:click={() => handleRetry(job.id)}
				disabled={processingJobs.has(job.id)}
			>
				{#if processingJobs.has(job.id)}
					<iconify-icon icon="svg-spinners:blocks-shuffle-3"></iconify-icon>
					<p>Rematching ~30sec</p>
				{:else}
					<iconify-icon icon="solar:refresh-bold"></iconify-icon>
				{/if}
			</button>

			<button
				class="btn variant-ghost-tertiary flex items-center gap-2 rounded"
				on:click={handleBookmark}
				disabled={isHiding}
			>
				{#if currentStatus === 'bookmarked'}
					<iconify-icon class="text-xl" icon="solar:bookmark-bold"></iconify-icon>
				{:else}
					<iconify-icon class="text-xl" icon="solar:bookmark-outline"></iconify-icon>
				{/if}
			</button>

			<button
				class="btn variant-filled-primary flex items-center gap-2 rounded"
				on:click={handleVisitJob}
				disabled={isHiding}
			>
				Apply to Job
			</button>

			<button
				class="btn variant-ghost-tertiary flex items-center gap-2 rounded"
				on:click={handleHide}
				disabled={isHiding}
			>
				{#if isHiding}
					<iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
				{:else}
					<iconify-icon class="text-xl" icon="solar:trash-bin-minimalistic-outline"></iconify-icon>
				{/if}
			</button>
		</div>

		<button
			class="btn variant-primary flex items-center gap-2 rounded"
			on:click={() => handleNext(job.id)}
			disabled={isLastJob || isHiding}
		>
			<iconify-icon icon="solar:map-arrow-right-bold"></iconify-icon>
		</button>
	</div>
</div>