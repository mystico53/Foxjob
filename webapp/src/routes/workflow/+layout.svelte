<script>
	import { page } from '$app/stores';
	import { auth } from '$lib/firebase';
	import { jobStore, sortedJobs, loading, timeFilter } from '$lib/stores/jobStore';
	import JobCard from '$lib/Jobcards/JobCard.svelte';
	import SortControls from '$lib/SortControls.svelte';
	import SearchBar from '$lib/SearchBar.svelte';
	import { goto } from '$app/navigation';
	import { onMount, setContext } from 'svelte';
	import ProcessingJobsCount from '$lib/utilities/ProcessingJobsCount.svelte';

	let isSidebarOpen = true; // Default to open
	let isSmallScreen = false;

	onMount(() => {
		// Initialize jobStore if needed
		if (auth.currentUser) {
			jobStore.init(auth.currentUser.uid, $timeFilter);
		}
		
		// Handle initial state based on screen size
		checkScreenSize();
		
		// Add resize listener
		window.addEventListener('resize', checkScreenSize);
		
		return () => {
			window.removeEventListener('resize', checkScreenSize);
		};
	});
	
	// Check screen size and set sidebar state accordingly
	function checkScreenSize() {
		isSmallScreen = window.innerWidth <= 768;
		if (isSmallScreen) {
			isSidebarOpen = false;
		} else {
			isSidebarOpen = true;
		}
	}
	
	// Function to toggle sidebar visibility
	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	function handleJobClick(job) {
		if (isSmallScreen) {
			isSidebarOpen = false;
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

<div class="fixed left-0 flex h-[calc(100vh-72px)] w-full flex-row">
	<!-- Mobile Toggle Button - positioned below navbar -->
	<button 
		class="fixed top-20 left-4 z-50 rounded-md bg-primary-500 p-2 text-white shadow-md transition-all duration-300 md:hidden"
		style="left: {isSidebarOpen && isSmallScreen ? '280px' : '1rem'}"
		on:click={toggleSidebar}
		aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="3" y1="12" x2="21" y2="12"></line>
			<line x1="3" y1="6" x2="21" y2="6"></line>
			<line x1="3" y1="18" x2="21" y2="18"></line>
		</svg>
	</button>

	<!-- Sidebar with responsive behavior -->
	<div 
		class="bg-surface-100 custom-scrollbar fixed h-[calc(100vh-72px)] overflow-y-auto border-r z-40 transition-all duration-300 w-[25rem] md:static"
		style="transform: {isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)'}"
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
	</div>

	<!-- Main content area that adapts to sidebar state -->
	<div 
		class="flex-1 h-[calc(100vh-72px)] overflow-y-auto p-4 transition-all duration-300 bg-surface-100"
		style="margin-left: 0;"
	>
		<slot />
	</div>
</div>