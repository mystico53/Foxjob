<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
    import { fade } from 'svelte/transition';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/jobStore';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import { popup } from '@skeletonlabs/skeleton';
	import { onMount, onDestroy } from 'svelte';
	import FeedbackButtons from '$lib/admincomponents/FeedbackThumbs.svelte';
    import ScoreAnalysis from '$lib/Jobcards/ScoreAnalysis.svelte';
    import { slide } from 'svelte/transition';

	export let job = {};
	export let handleNext;
	export let previousJob;
	export let isFirstJob;
	export let isLastJob;
	export let toggleBookmark;
	export let openJobLink;
    let showAnalysis = false;

	const popupHover = {
        event: 'hover',
        target: 'popupHover',
        placement: 'left',
        duration: 200  // Added a small duration to smooth the transition
    };

    $: score = job?.AccumulatedScores?.accumulatedScore;
    $: isVisible = score !== undefined;

    let popupInstance;
    
    onMount(() => {
        // Give the DOM a moment to fully render
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
	<div class="card p-8">
        <div class="flex w-full justify-between gap-4">
            <!-- Left Column: All info except radial -->
            <div class="flex-1 space-y-4">
                <!-- Company and Title -->
                <div>
                    <h5 class="h5 m-0 flex items-center pb-4">{job.jobInfo?.jobTitle || 'N/A'}</h5>				
                    <h1 class="h1 font-bold pb-2">{job.companyInfo?.name || 'N/A'}</h1>
                </div>

                <!-- Meta Information -->
                <div class="flex flex-row flex-wrap max-w-2xl">
                    <span class="chip variant-ghost-surface text-base" title={job.companyInfo?.industry || 'N/A'}>
                        <iconify-icon icon="solar:buildings-3-bold"></iconify-icon>
                        <span>{truncateText(job.companyInfo?.industry)}</span>
                    </span>
                
                    <span class="chip variant-ghost-surface text-base" title={job.jobInfo?.remoteType || 'N/A'}>
                        <iconify-icon icon="solar:pin-bold"></iconify-icon>
                        <span>{truncateText(job.jobInfo?.remoteType)}</span>
                    </span>
                
                    <span class="chip variant-ghost-surface text-base" title={job.compensation || 'N/A'}>
                        <iconify-icon icon="solar:money-bag-bold"></iconify-icon>
                        <span>{truncateText(job.compensation)}</span>
                    </span>
                
                    <span class="chip variant-ghost-surface text-base" title={formatDate(job.generalData?.timestamp)}>
                        <iconify-icon icon="solar:calendar-mark-linear"></iconify-icon>
                        <span>{truncateText(formatDate(job.generalData?.timestamp))}</span>
                    </span>
                </div>
            </div>
            <!-- ProgressRadial section -->
            {#if job?.AccumulatedScores?.accumulatedScore !== undefined}
                    {#key job.id}
                        {#if isVisible}
                            <div class="flex items-start justify-end">
                                <div class="relative">
                                    <div class="relative w-32 h-32 flex items-center justify-center">
                                        <div
                                            in:fade={{ duration: 400, delay: 100 }}
                                            class="relative w-full h-full flex items-center justify-center"
                                        >
                                            <ProgressRadial
                                                class="!w-32"
                                                stroke={60}
                                                font={150}
                                                meter="!stroke-primary-500"
                                                track="!stroke-tertiary-500/30"
                                                strokeLinecap="round"
                                                value={Math.round(score || 0)}
                                            >
                                                {Math.round(score || 0)}
                                            </ProgressRadial>
                                        </div>
                                        
                                        <div class="absolute -right-2 -top-2" use:popup={popupHover}>
                                            <iconify-icon 
                                                icon="solar:info-circle-bold" 
                                                class="text-tertiary-900 rounded-full cursor-pointer"
                                            />
                                            <div 
                                                class="card p-4 variant-filled-tertiary w-[400px]" 
                                                data-popup="popupHover"
                                            >
                                                <div class="space-y-4">
                                                    <p class="text-sm opacity-75 break-words hyphens-auto">
                                                        Heads up! The score is estimated by an LLM, which can make mistakes. Please double-check the result. The LLM compares different parts of your resume to the job requirements. Feedback from curious people like yourself improves its accuracy. 🦊
                                                    </p>
                                                    
                                                    <div class="grid grid-cols-[1fr,auto] gap-x-6 gap-y-2 w-full">
                                                        <span class="text-sm font-semibold opacity-75">Main score = Average of the following scores:</span>
                                                        <span class="text-sm font-semibold text-right">{Math.round(score || 0)}</span>

                                                        <!-- Only render these if job.AccumulatedScores exists -->
                                                        {#if job.AccumulatedScores}
                                                            <span class="text-sm opacity-75">Six most important requirements</span>
                                                            <span class="text-sm text-right">{Math.round(job.AccumulatedScores?.requirementScore || 0)}</span>
                                                            
                                                            <span class="text-sm opacity-75">Does domain expertise match?</span>
                                                            <span class="text-sm text-right">{Math.round(job.AccumulatedScores?.domainScore || 0)}</span>
                                                            
                                                            <span class="text-sm opacity-75">Hard Skills:</span>
                                                            <span class="text-sm text-right">{Math.round(job.AccumulatedScores?.hardSkillScore || 0)}</span>
                                                            
                                                            <span class="text-sm opacity-75">All infos considered:</span>
                                                            <span class="text-sm text-right">{Math.round(job.AccumulatedScores?.verdictScore || 0)}</span>
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

        <div class="pt-8 w-full">
            <p class="text-base mb-4">
                <span class="font-bold">Company Focus: </span>
                {job?.companyInfo?.companyFocus || 'No company focus information available'}
            </p>
            <p class="text-base mb-4">
                <span class="font-bold">Job Description: </span>
                {job?.jobInfo?.jobSummary || 'No job summary available'}
            </p>
        </div>
</div>	

	

<!-- Final Verdict Section -->
<div class="card p-4 w-full">
    <!-- Headers with icons -->
    <div class="grid grid-cols-2 gap-6 mb-8">
        <div class="flex items-center gap-2">
            <h4 class="h4 font-bold">Your Strengths</h4>
            <iconify-icon 
                icon="solar:shield-plus-bold" 
                class="text-2xl text-primary-500"
                width="32" 
                height="32"
            ></iconify-icon>
        </div>
        <div class="flex items-center gap-2">
            <h4 class="h4 font-bold">Your Gaps</h4>
            <iconify-icon 
                icon="solar:minus-square-bold" 
                class="text-2xl text-primary-500"
                width="32" 
                height="32"
            ></iconify-icon>
        </div>
    </div>

    <!-- Content -->
    {#if job.verdict}
        <div>
            {#each Array.from({ length: Math.max(
                Object.keys(job.verdict.keyStrengths || {}).length,
                Object.keys(job.verdict.keyGaps || {}).length
            ) }) as _, index}
                <div class="grid grid-cols-2 gap-6 last:border-b-0">
                    <!-- Strength Item -->
                    <div class="pb-6">
                        {#if Object.entries(job.verdict.keyStrengths || {})[index]}
                            {@const [key, value] = Object.entries(job.verdict.keyStrengths)[index]}
                            <div class="text-base">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <strong class="font-bold">{key}:</strong> <span class="break-words text-gray-700">{value || 'N/A'}</span>
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
                                <div class="flex justify-between items-start">
                                    <div>
                                        <strong class="text-base">{key}:</strong> <span class="break-words text-gray-700">{value || 'N/A'}</span>
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
</div><div class="w-full flex flex-col items-center gap-4">
    <button 
        class="btn variant-ghost-tertiary flex items-center gap-2"
        on:click={() => showAnalysis = !showAnalysis}
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
</div></div>



<!-- Fixed position action buttons -->
<div
    class="bg-surface-100 fixed inset-x-0 bottom-0 z-10 border-t p-4 md:left-[25rem] md:right-[1rem]"
>
    <div class="mx-auto flex max-w-4xl flex-wrap justify-center gap-24">
        <button
            class="btn variant-primary rounded flex items-center gap-2"
            on:click={previousJob}
            disabled={isFirstJob || isHiding}
        >
            <iconify-icon icon="solar:map-arrow-left-bold"></iconify-icon>
        </button>

        <div class="flex gap-4">
            <button 
                class="btn variant-ghost-tertiary rounded  flex items-center gap-2" 
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
                class="btn variant-filled-primary rounded flex items-center gap-2" 
                on:click={handleVisitJob} 
                disabled={isHiding}
            >
                Apply to Job
            </button>

            <button 
                class="btn variant-ghost-tertiary rounded flex items-center gap-2" 
                on:click={handleHide} 
                disabled={isHiding}
            >
                {#if isHiding}
                    <iconify-icon icon="solar:archive-check-bold"></iconify-icon>
                {:else}
                    <iconify-icon class="text-xl" icon="solar:archive-bold"></iconify-icon>
                    
                {/if}
            </button>
        </div>

        <button
            class="btn variant-primary rounded flex items-center gap-2"
            on:click={() => handleNext(job.id)}
            disabled={isLastJob || isHiding}
        >
            <iconify-icon icon="solar:map-arrow-right-bold"></iconify-icon>
        </button>
    </div>
</div>