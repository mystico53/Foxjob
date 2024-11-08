<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/jobStore';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import { popup } from '@skeletonlabs/skeleton';
	import { onMount, onDestroy } from 'svelte';
	import FeedbackButtons from '$lib/FeedbackButtons.svelte';

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
        duration: 200  // Added a small duration to smooth the transition
    };

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
				<div class="relative">
					<div class="relative">
						<ProgressRadial
							class="!w-32"
							stroke={60}
							font={150}
							meter="!stroke-primary-500"
							track="!stroke-tertiary-500/30"
							strokeLinecap="round"
							value={Math.round(job.AccumulatedScores.accumulatedScore || 0)}
						>
							{Math.round(job.AccumulatedScores.accumulatedScore || 0)}
						</ProgressRadial>
						<!-- Info badge with tooltip -->
							<div class="absolute -right-2 -top-2" use:popup={popupHover}>
								<iconify-icon 
									icon="solar:info-circle-bold" 
									class="text-tertiary-900 rounded-full cursor-pointer"
								></iconify-icon>
								<!-- Tooltip with opacity transition -->
										<div 
										class="card p-4 variant-filled-tertiary opacity-0 transition-opacity duration-200 w-[400px]" 
										data-popup="popupHover"
										>
										<div class="space-y-4">
											<!-- Explanation text with proper wrapping -->
											<p class="text-sm opacity-75 break-words hyphens-auto">
												Heads up! The score is estimated by an LLM, which can make mistakes. Please double-check the result. The LLM compares different parts of your resume to the job requirements. Feedback from curious people like yourself  improves its accuracy. 🦊
											</p>
											
											<div class="grid grid-cols-[1fr,auto] gap-x-6 gap-y-2 w-full">
												<span class="text-sm font-semibold opacity-75">Main score = Average of the following scores:</span>
												<span class="text-sm font-semibold text-right">{Math.round(job.AccumulatedScores?.accumulatedScore || 0)}</span>

												<span class="text-sm opacity-75">Six most important requirements</span>
												<span class="text-sm text-right">{Math.round(job.AccumulatedScores?.requirementScore || 0)}</span>
												
												<span class="text-sm opacity-75">Does domain expertise match?</span>
												<span class="text-sm text-right">{Math.round(job.AccumulatedScores?.domainScore || 0)}</span>
												
												<span class="text-sm opacity-75">Hard Skills:</span>
												<span class="text-sm text-right">{Math.round(job.AccumulatedScores?.hardSkillScore || 0)}</span>        
												
												<span class="text-sm opacity-75">All infos considered:</span>
												<span class="text-sm text-right">{Math.round(job.AccumulatedScores?.verdictScore || 0)}</span>
											</div>
										</div>
										<div class="arrow variant-filled-secondary" />
										</div>
							</div>
					</div>
				</div>
			</div>
			{/if}
			</div>

		

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
						<ul class="space-y-2">
							{#each Object.entries(job.verdict.keyStrengths) as [key, value]}
								<li class="text-sm flex items-start gap-4">
									{#if job?.id}
										<FeedbackButtons 
											jobId={job.id}
											path={`verdict.keyStrengths.${key}`}
											itemId={key}
											currentData={job.verdict.keyStrengths[key]}
										/>
									{/if}
									<div class="grid grid-cols-[120px_1fr] gap-4 min-w-0">
										<span class="font-bold break-words">{key}:</span>
										<span class="break-words">{value || 'N/A'}</span>
									</div>
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
							<ul class="space-y-2">
								{#each Object.entries(job.verdict.keyGaps) as [key, value]}
									<li class="text-sm flex items-start gap-4">
										{#if job?.id}
											<FeedbackButtons 
												jobId={job.id}
												path={`verdict.keyGaps.${key}`}
												itemId={key}
												currentData={job.verdict.keyGaps[key]}
											/>
										{/if}
										<div class="grid grid-cols-[120px_1fr] gap-4 min-w-0">
											<span class="font-bold break-words">{key}:</span>
											<span class="break-words">{value || 'N/A'}</span>
										</div>
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

<!-- Domain Expertise Section -->
<div class="card p-4">
    <h3 class="h5 mb-4">Domain Expertise Assessment</h3>
    {#if job.SkillAssessment.DomainExpertise}
        <table class="table-hover table">
            <thead>
                <tr>
                    <th>Area</th>
                    <th>Score</th>
                    <th>Importance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{job.SkillAssessment.DomainExpertise.name || 'N/A'}</td>
                    <td>{job.SkillAssessment.DomainExpertise.score || 0}%</td>
                    <td>{job.SkillAssessment.DomainExpertise.importance || 'N/A'}/5</td>
                </tr>
            </tbody>
        </table>
        <div class="mt-4 space-y-4">
            <div>
                <span class="font-bold">Assessment:</span>
                <p class="mt-2">
                    {job.SkillAssessment.DomainExpertise.assessment || 'No assessment available'}
                </p>
            </div>
            <div>
                <span class="font-bold">Summary:</span>
                <p class="mt-2">
                    {job.SkillAssessment.DomainExpertise.summary || 'No summary available'}
                </p>
            </div>
        </div>
    {/if}
</div>

<!-- Hard Skills Section -->
<div class="card p-4">
    <h3 class="h5 mb-4">Hard Skills Assessment</h3>
    {#if job.SkillAssessment.Hardskills.hardSkillScore}
        <div class="mt-4">
            <span class="font-bold">Overall Hard Skills Score:</span>
            <p class="mt-2">{job.SkillAssessment.Hardskills.hardSkillScore.totalScore || 0}%</p>
            <span class="font-bold">Summary:</span>
            <p class="mt-2">
                {job.SkillAssessment.Hardskills.hardSkillScore.summary || 'No summary available'}
            </p>
        </div>
    {/if}
    {#if job.SkillAssessment.Hardskills}
        <Accordion>
            {#each ['HS1', 'HS2', 'HS3', 'HS4', 'HS5'] as key}
                {#if job.SkillAssessment.Hardskills[key]}
                    <AccordionItem>
                        <svelte:fragment slot="summary">
                            {job.SkillAssessment.Hardskills[key].name} ({job.SkillAssessment.Hardskills[key].score || 0}%)
                        </svelte:fragment>
                        <svelte:fragment slot="content">
                            <div class="space-y-4">
                                <div>
                                    <span class="font-semibold">Description:</span>
                                    <p class="mt-1">{job.SkillAssessment.Hardskills[key].description || 'N/A'}</p>
                                </div>
                                <div>
                                    <span class="font-semibold">Required:</span>
                                    <p class="mt-1">
                                        {#if job.SkillAssessment.Hardskills[key].description}
                                            {job.SkillAssessment.Hardskills[key].description.includes('(required)') ? 'Required' : 'Preferred'}
                                        {:else}
                                            N/A
                                        {/if}
                                    </p>
                                </div>
                                <div>
                                    <span class="font-semibold">Assessment:</span>
                                    <p class="mt-1">
                                        {job.SkillAssessment.Hardskills[key].assessment || 'No assessment available'}
                                    </p>
                                </div>
                            </div>
                        </svelte:fragment>
                    </AccordionItem>
                {/if}
            {/each}
        </Accordion>
    {/if}
</div>

<!-- Soft Skills Section -->
<div class="card p-4">
    <h3 class="h5 mb-4">Soft Skills Assessment</h3>
    {#if job.SkillAssessment.Softskills.softSkillScore}
        <div class="mt-4">
            <span class="font-bold">Overall Soft Skills Score:</span>
            <p class="mt-2">{job.SkillAssessment.Softskills.softSkillScore.totalScore || 0}%</p>
            <span class="font-bold">Summary:</span>
            <p class="mt-2">
                {job.SkillAssessment.Softskills.softSkillScore.summary || 'No summary available'}
            </p>
        </div>
    {/if}
    {#if job.SkillAssessment.Softskills}
        <Accordion>
            {#each ['SS1', 'SS2', 'SS3', 'SS4', 'SS5'] as key}
                {#if job.SkillAssessment.Softskills[key]}
                    <AccordionItem>
                        <svelte:fragment slot="summary">
                            {job.SkillAssessment.Softskills[key].name} ({job.SkillAssessment.Softskills[key].score || 0}%)
                        </svelte:fragment>
                        <svelte:fragment slot="content">
                            <div class="space-y-4">
                                <div>
                                    <span class="font-semibold">Description:</span>
                                    <p class="mt-1">{job.SkillAssessment.Softskills[key].description || 'N/A'}</p>
                                </div>
                                <div>
                                    <span class="font-semibold">Required:</span>
                                    <p class="mt-1">
                                        {#if job.SkillAssessment.Softskills[key].description}
                                            {job.SkillAssessment.Softskills[key].description.includes('(required)') ? 'Required' : 'Preferred'}
                                        {:else}
                                            N/A
                                        {/if}
                                    </p>
                                </div>
                                <div>
                                    <span class="font-semibold">Assessment:</span>
                                    <p class="mt-1">
                                        {job.SkillAssessment.Softskills[key].assessment || 'No assessment available'}
                                    </p>
                                </div>
                            </div>
                        </svelte:fragment>
                    </AccordionItem>
                {/if}
            {/each}
        </Accordion>
    {/if}
</div>

<!-- Match Results Table -->
{#if job.matchResult}
    <div class="card p-4">
        <h3 class="h5 mb-4">Old Match Results</h3>
        <table class="table-hover table">
            <thead>
                <tr>
                    <th>Key Skill</th>
                    <th>Score</th>
                    <th>Assessment</th>
                </tr>
            </thead>
            <tbody>
                {#each job.matchResult.keySkills as skill}
                    <tr>
                        <td>{skill.skill}</td>
                        <td>{Math.round(skill.score)}</td>
                        <td>{skill.assessment}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}

<!-- Fixed position action buttons -->
<div
	class="bg-surface-100 fixed inset-x-0 bottom-0 z-10 border-t p-4 md:left-[25rem] md:right-[1rem]"
>
	<div class="mx-auto flex max-w-4xl flex-wrap justify-center gap-24">
		<button
			class="btn variant-primary flex items-center gap-2"
			on:click={previousJob}
			disabled={isFirstJob || isHiding}
		>
			<iconify-icon icon="solar:map-arrow-left-bold"></iconify-icon>
		</button>

		<button class="btn variant-ghost-tertiary flex items-center gap-2" on:click={handleHide} disabled={isHiding}>
			{#if isHiding}
			  Archiving...
			{:else}
			  <iconify-icon class="text-xl" icon="solar:archive-bold"></iconify-icon>
			  Archive
			{/if}
		  </button>

		<button 
			class="btn variant-filled-primary flex items-center gap-2" 
			on:click={handleBookmark} 
			disabled={isHiding}
		>
			{#if currentStatus === 'bookmarked'}
				<iconify-icon class="text-xl" icon="solar:bookmark-bold"></iconify-icon>
				Bookmarked
			{:else}
				<iconify-icon class="text-xl" icon="solar:bookmark-outline"></iconify-icon>
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