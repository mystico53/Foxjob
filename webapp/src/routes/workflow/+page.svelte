<script>
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/firebase';
	import { jobStore, sortedJobs, loading, error } from '$lib/jobStore';
	import JobCard from '$lib/JobCard.svelte';
	import CardDetails from '$lib/CardDetails.svelte';
	import SortControls from '$lib/SortControls.svelte';
	import { flip } from 'svelte/animate';
	import SearchBar from '$lib/SearchBar.svelte';

	let currentUser = null;
	let selectedJob = null;
	let selectedJobIndex = -1;
	let sidebar;

	// Add reactive statement to handle initial job selection
	$: if (!selectedJob && $sortedJobs && $sortedJobs.length > 0) {
		selectedJob = $sortedJobs[0];
		selectedJobIndex = 0;
	}

	// Update selectedJob whenever sortedJobs changes to keep it in sync
	$: if (selectedJob && $sortedJobs) {
		const updatedJob = $sortedJobs.find((j) => j.id === selectedJob.id);
		if (updatedJob) {
			selectedJob = updatedJob;
		} else if ($sortedJobs.length > 0) {
			// If the selected job is no longer in the list (e.g., after filtering),
			// select the first available job
			selectedJob = $sortedJobs[0];
			selectedJobIndex = 0;
		}
	}

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			currentUser = user;
			if (user) {
				jobStore.init(user.uid);
			}
		});

		return () => {
			unsubscribe();
			jobStore.cleanup();
		};
	});

	function handleJobClick(job) {
		selectedJob = job;
		selectedJobIndex = $sortedJobs.findIndex((j) => j.id === job.id);

		if (window.innerWidth <= 768) {
			sidebar.style.transform = 'translateX(-100%)';
		}
	}

	function handleNext(jobId) {
		if (selectedJobIndex < $sortedJobs.length - 1) {
			selectedJobIndex++;
			selectedJob = $sortedJobs[selectedJobIndex];
		}
	}

	function handlePrevious() {
		if (selectedJobIndex > 0) {
			selectedJobIndex--;
			selectedJob = $sortedJobs[selectedJobIndex];
		}
	}

	async function toggleBookmark(jobId) {
		try {
			if (!currentUser?.uid) throw new Error('No user logged in');
			const jobToUpdate = $sortedJobs.find((j) => j.id === jobId);
			if (!jobToUpdate) throw new Error('Job not found');

			const newStatus =
				jobToUpdate.generalData?.status?.toLowerCase() === 'bookmarked' ? 'read' : 'bookmarked';
			await jobStore.updateStatus(currentUser.uid, jobId, newStatus);
			// The store will automatically update through Firebase onSnapshot
		} catch (error) {
			console.error('Error toggling bookmark:', error);
		}
	}

	async function hideJobAndNext(jobId) {
		try {
			if (!currentUser?.uid) throw new Error('No user logged in');
			await jobStore.hideJob(currentUser.uid, jobId);
			handleNext(jobId);
		} catch (error) {
			console.error('Error hiding job:', error);
		}
	}

	function openJobLink(url) {
		window.open(url, '_blank');
	}

	function handleMobileNav() {
		const sidebar = document.querySelector('.sidebar');
		if (sidebar) {
			const isHidden = sidebar.style.transform === 'translateX(-100%)';
			sidebar.style.transform = isHidden ? 'translateX(0)' : 'translateX(-100%)';
		}
	}
</script>

<!-- Main Content -->
<div class="fixed left-0 top-[82px] flex h-[calc(100vh-82px)] w-full flex-col md:flex-row">
	<!-- Sidebar -->
	<aside
		class="bg-surface-100 custom-scrollbar h-full w-full transform overflow-y-auto border-r transition-transform md:w-80 md:translate-x-0"
		style="width: 25rem;"
		bind:this={sidebar}
	>
		<SortControls />
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
						<div animate:flip={{ duration: 700 }}>
							<JobCard
								companyName={job.companyInfo?.name || 'no info'}
								jobTitle={job.jobInfo?.jobTitle || 'no info'}
								score={job.Score?.totalScore}
								status={job.generalData?.status}
								remoteType={job.jobInfo?.remoteType || 'no info'}
								compensation={job.compensation || 'no info'}
								timestamp={job.generalData?.timestamp?.toDate()}
								handleClick={() => handleJobClick(job)}
								jobId={job.id}
								isSelected={selectedJob?.id === job.id}
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

	<!-- Main content area -->
	<main class="bg-surface-100 flex-1 overflow-y-auto p-4">
		{#if selectedJob}
			<CardDetails
				job={selectedJob}
				{handleNext}
				previousJob={handlePrevious}
				isFirstJob={selectedJobIndex === 0}
				isLastJob={selectedJobIndex === $sortedJobs.length - 1}
				{toggleBookmark}
				{hideJobAndNext}
				{openJobLink}
			/>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-surface-400 text-center">
					<div class="mb-2 text-4xl">👈</div>
					<div>Select a job to view details</div>
				</div>
			</div>
		{/if}
	</main>
</div>

<!-- Mobile navigation button -->
<button
	class="bg-primary-500 fixed bottom-4 right-4 z-20 rounded-full p-3 text-white shadow-lg md:hidden"
	on:click={handleMobileNav}
>
	{#if selectedJob}
		<!-- Left Arrow Icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	{:else}
		<!-- Right Arrow Icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	{/if}
</button>

<style>
	/* Remove custom styles unless necessary */
</style>
