<script>
	import { page } from '$app/stores';
	import { auth } from '$lib/firebase';
	import { jobStore, sortedJobs, loading } from '$lib/stores/jobStore';
	import JobCard from '$lib/Jobcards/JobCard.svelte';
	import SortControls from '$lib/SortControls.svelte';
	import SearchBar from '$lib/SearchBar.svelte';
	import { goto } from '$app/navigation';
	import { onMount, setContext } from 'svelte';
	import ProcessingJobsCount from '$lib/utilities/ProcessingJobsCount.svelte';

	let sidebar;

	onMount(() => {
		// Initialize jobStore if needed
		if (auth.currentUser) {
			jobStore.init(auth.currentUser.uid);
		}
	});

	function handleJobClick(job) {
		if (window.innerWidth <= 768) {
			sidebar.style.transform = 'translateX(-100%)';
		}
		goto(`/workflow/${job.id}`);
	}

	async function toggleBookmark(jobId) {
		if (!auth.currentUser?.uid) return;
		try {
			const jobToUpdate = $sortedJobs.find((j) => j.id === jobId);
			if (!jobToUpdate) return;
			const newStatus =
				jobToUpdate.generalData?.status?.toLowerCase() === 'bookmarked' ? 'read' : 'bookmarked';
			await jobStore.updateStatus(auth.currentUser.uid, jobId, newStatus);
		} catch (error) {
			console.error('Error toggling bookmark:', error);
		}
	}

	// Add this: Set the toggleBookmark function in context
	setContext('toggleBookmark', toggleBookmark);
</script>

<div class="fixed left-0 flex h-[calc(100vh-72px)] w-full flex-col md:flex-row">
	<aside
		class="bg-surface-100 custom-scrollbar h-full w-full transform overflow-y-auto border-r transition-transform md:w-80 md:translate-x-0"
		style="width: 25rem;"
		bind:this={sidebar}
	>
		<SortControls />
		<ProcessingJobsCount />
		<SearchBar />

		<div class="p-4">
			{#if $loading}
				<div class="flex justify-center p-4">
					<span class="loading loading-spinner loading-lg text-primary-500"></span>
				</div>
			{/if}

			{#if $sortedJobs && $sortedJobs.length > 0}
				<div class="flex flex-col gap-4">
					{#each $sortedJobs as job (job.id)}
						<div>
							<JobCard
								companyName={job.companyInfo?.name || 'no info'}
								companyLogo={job.companyInfo?.logoUrl || null}
								jobTitle={job.jobInfo?.jobTitle || 'no info'}
								score={job.AccumulatedScores?.accumulatedScore}
								status={job.generalData?.status}
								remoteType={job.jobInfo?.remoteType || job.jobInfo?.location || 'no info'}
								compensation={job.compensation || 'no info'} 
								postedDate={job.jobInfo?.postedDate || null}
								handleClick={() => handleJobClick(job)}
								jobId={job.id}
								isSelected={job.id === $page.params.jobId}
								{toggleBookmark}
							/>
						</div>
					{/each}
				</div>
			{:else if !$loading}
				<div class="text-surface-400 p-4 text-center">No jobs found.</div>
			{/if}
		</div>
	</aside>

	<main class="bg-surface-100 flex-1 overflow-y-auto p-4">
		<slot />
	</main>
</div>
