<script>
	import { ProgressRadial, Accordion, AccordionItem, ProgressBar } from '@skeletonlabs/skeleton';
	import { fade } from 'svelte/transition';
	import { auth } from '$lib/firebase';
	import { jobStore } from '$lib/stores/jobStore';
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
	let showJobDescription = false;
	let processingJobs = new Set();

	// Sort match details by score (highest first)
	$: matchDetails = (job.match?.match_details || []).sort((a, b) => b.match_score_percent - a.match_score_percent);

	const popupHover = {
		event: 'hover',
		target: 'popupHover',
		placement: 'left',
		duration: 200
	};

	$: score = job?.match?.final_score || job?.AccumulatedScores?.accumulatedScore;
	$: isVisible = score !== undefined;

	// Access the new summary fields
	$: shortDescription = job?.match?.summary?.short_description || 'No job description available';
	$: shortResponsibility = job?.match?.summary?.short_responsibility || 'No responsibility information available';
	$: shortGaps = job?.match?.summary?.short_gaps || 'No gaps information available';

	$: preferenceScore = job?.match?.preferenceScore?.score;
	$: preferenceExplanation = job?.match?.preferenceScore?.explanation;
	$: hasPreferenceScore = preferenceScore !== undefined;

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
	
	function formatTimeAgo(dateValue) {
		if (!dateValue) return 'N/A';
		
		let date;
		// Handle Firebase Timestamp objects
		if (dateValue && dateValue.toDate) {
			date = dateValue.toDate();
		}
		// Handle ISO date strings
		else if (typeof dateValue === 'string') {
			date = new Date(dateValue);
			if (isNaN(date)) return 'N/A';
		} else {
			return 'N/A';
		}
		
		const now = new Date();
		const diffMs = now - date;
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffMinutes < 60) {
			return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
		} else if (diffHours < 24) {
			return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
		} else if (diffDays < 30) {
			return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
		} else {
			const diffMonths = Math.floor(diffDays / 30);
			return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
		}
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
		// Check multiple possible locations for the apply URL
		if (job.jobInfo?.applyUrl) {
			openJobLink(job.jobInfo.applyUrl);
		} else if (job.basicInfo?.applyLink) {
			openJobLink(job.basicInfo.applyLink);
		} else if (job.basicInfo?.url) {
			openJobLink(job.basicInfo.url);
		} else if (job.details?.url) {
			openJobLink(job.details.url);
		} else if (job.generalData?.url) {
			openJobLink(job.generalData.url);
		} else {
			// If no URL is found, try to construct one from the job ID
			const linkedInBaseUrl = "https://www.linkedin.com/jobs/view/";
			if (job.id) {
				openJobLink(`${linkedInBaseUrl}${job.id}`);
			} else {
				console.error('No apply URL or job ID found:', job);
			}
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
						title={formatDate(job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp)}
					>
						<iconify-icon icon="solar:calendar-minimalistic-bold"></iconify-icon>
						<span>
							{formatTimeAgo(job.details?.postedDate || job.jobInfo?.postedDate || job.generalData?.timestamp)}
						</span>
					</span>
					
					<span
						class="chip variant-ghost-surface text-base"
						title={`${job.details?.numApplicants || 0} applicants`}
					>
						<iconify-icon icon="solar:users-group-rounded-bold"></iconify-icon>
						<span>{job.details?.numApplicants || 0} applicants</span>
					</span>
				</div>
			</div>
			<!-- ProgressRadial section -->
			{#if score !== undefined}
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

		<!-- New Summary Section -->
		<div class="w-full pt-8">
			<p class="mb-4 text-base">
				<span class="font-bold">Job Summary: </span>
				{shortDescription}
			</p>
			<p class="mb-4 text-base">
				<span class="font-bold">Main Responsibilities: </span>
				{shortResponsibility}
			</p>
			<p class="mb-4 text-base">
				<span class="font-bold">Your Gaps: </span>
				{shortGaps}
			</p>
			{#if hasPreferenceScore}
			<div class="mt-6 pt-2 border-t border-surface-300">
				<p class="mb-2 text-base">
					<span class="font-bold">Preference Match: </span>
					<span class="text-primary-500 font-semibold">{preferenceScore}/100</span>
				</p>
				<p class="text-base italic">"{preferenceExplanation}"</p>
			</div>
{/if}
		</div>
	</div>

	<!-- Updated Match Details Section with Accordion -->
	<div class="card w-full p-4">
		<h4 class="h4 mb-4 font-bold">Match Details</h4>
		
		{#if matchDetails.length > 0}
			<Accordion>
				{#each matchDetails as detail}
					<AccordionItem class="mb-2">
						<svelte:fragment slot="summary">
							<div class="flex items-center gap-4 w-full">
								<div class="flex-1">{detail.requirement}</div>
								<div class="flex items-center gap-4 w-64">
									<div class="w-64">
										<ProgressBar 
											value={Math.round(detail.match_score_percent)} 
											max={100}
											track="bg-surface-800/30"
											meter="!bg-gradient-to-r from-[#FF9C00] to-[#DC3701]"
										/>
									</div>
								</div>
							</div>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="rounded-lg space-y-4 p-4 bg-surface-100 border border-surface-300">
								<div>
									<span class="font-semibold">Match Score: {detail.match_score_percent}%</span>
								</div>
								<div>
									<span class="font-semibold">Evidence:</span>
									<p class="mt-1">{detail.evidence}</p>
								</div>
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		{:else}
			<p class="text-surface-600-300-token">No match details available</p>
		{/if}
	</div>

	<!-- Job Description Section (Expandable) -->
	<div class="flex w-full flex-col items-center gap-4">
		<button
			class="btn variant-ghost-tertiary flex items-center gap-2"
			on:click={() => (showJobDescription = !showJobDescription)}
		>
			{#if showJobDescription}
				Hide Job Description
				<iconify-icon icon="solar:alt-arrow-up-bold"></iconify-icon>
			{:else}
				Show Job Description
				<iconify-icon icon="solar:alt-arrow-down-bold"></iconify-icon>
			{/if}
		</button>

		{#if showJobDescription}
			<div transition:slide class="card w-full p-4">
				<h4 class="h4 mb-4 font-bold">Full Job Description</h4>
				{#if job?.jobInfo?.descriptionHtml}
					<!-- Render HTML content safely -->
					<div class="description-html">{@html job.jobInfo.descriptionHtml}</div>
				{:else}
					<p>{job?.jobInfo?.description || job?.details?.description || 'No job description available'}</p>
				{/if}
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

<style>
/* Add these styles to your component's <style> section */

/* General styles for HTML content */
:global(.description-html) {
  display: block;
  line-height: 1.6;
  white-space: pre-line !important; /* This helps preserve line breaks */
}

/* Fix for bullet points */
:global(.description-html ul) {
  display: block;
  padding-left: 24px;
  margin: 12px 0;
  list-style-type: disc !important;
}

:global(.description-html li) {
  display: list-item !important;
  margin-bottom: 8px;
}

/* Special fix for line breaks inside <strong> tags */
:global(.description-html strong) {
  font-weight: bold;
  display: block; /* Make it a block element so line breaks work */
  margin-bottom: 16px; /* Add space after the title */
}

/* Make br tags render properly */
:global(.description-html br) {
  content: "";
  display: block;
  margin-top: 0.5em;
}

/* Additional paragraph spacing */
:global(.description-html p) {
  margin-bottom: 16px;
}
</style>