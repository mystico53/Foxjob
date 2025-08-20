<!-- src/lib/searchJobs/JobAgentList.svelte -->
<script>
	import { searchQueriesStore } from '$lib/stores/searchQueriesStore';
	import { authStore } from '$lib/stores/authStore';
	import { setJobAgentLoading, setJobAgentStatus } from '$lib/stores/userStateStore';
	import { getCloudFunctionUrl } from '$lib/config/environment.config';
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { deleteDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import foxIcon from '../../assets/icon128.png';
	import InfoCard from '$lib/searchJobs/InfoCard.svelte';
	import dayjs from 'dayjs';
	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';

	// Initialize dayjs plugins
	dayjs.extend(utc);
	dayjs.extend(timezone);

	const dispatch = createEventDispatcher();

	// Fox-themed search terms that rotate every 10 seconds
	const funnySearchVerbs = [
		"Sniffing...", "Pouncing...", "Prowling...", "Scavenging...", 
		"Yipping...", "Digging...", "Stalking...", "Tiptoeing...", 
		"Snuffling...", "Scampering...", "Rustling...", "Creeping...", 
		"Scratching...", "Snorting...", "Padding...", "Nosing...", 
		"Skulking...", "Rummaging...", "Slinking...", "Pawing..."
	];

	let uid;
	let deletingId = null;
	let error = null;
	let showInfoCard = false; // Start hidden by default
	let agentCreating = false; // Don't start in loading state by default
	let currentVerbIndex = 0;
	let verbInterval;
	
	// Make the verb reactive
	$: currentSearchVerb = funnySearchVerbs[currentVerbIndex];

	authStore.subscribe((user) => {
		uid = user?.uid;
	});

	// Format date for display
	function formatDate(date) {
		if (!date) return 'Never';
		return new Date(date).toLocaleString();
	}

	// Format search parameters for display
	function formatSearchParams(params) {
		if (!params || !params.length) return 'No parameters';
		const param = params[0]; // Get the first search param

		let parts = [];
		if (param.keyword) parts.push(`${param.keyword}`);
		if (param.location) parts.push(`in ${param.location}`);
		if (param.job_type) parts.push(param.job_type);

		return parts.join(' ') || 'Custom search';
	}

	// Format delivery time - UPDATED to convert from UTC to local time
	function formatDeliveryTime(time) {
		if (!time) return '8:00 AM';

		// Parse the time string (HH:MM format in UTC)
		const [hourStr, minuteStr] = time.split(':');
		const utcHour = parseInt(hourStr, 10);
		const utcMinute = parseInt(minuteStr, 10);

		// Create a UTC dayjs object with today's date and the specified time
		const utcTime = dayjs.utc().hour(utcHour).minute(utcMinute).second(0);

		// Convert to local time
		const localTime = utcTime.local();

		// Format in 12-hour format with AM/PM
		return localTime.format('h:mm A');
	}

	// Get status text based on query state - make it reactive
	function getStatusText(query, searchVerb) {
		if (!query.isActive) return 'Inactive';
		if (query.searchingStatus === 'searching') return searchVerb;
		return 'Active';
	}

	// Get status text color
	function getStatusColor(query) {
		if (!query.isActive) return 'text-red-600';
		if (query.searchingStatus === 'searching') return 'text-blue-600';
		return 'text-green-600';
	}

	// Get status dot color
	function getStatusDotColor(query) {
		if (!query.isActive) return 'bg-red-600';
		if (query.searchingStatus === 'searching') return 'bg-blue-600';
		return 'bg-green-600';
	}

	// Format last results count
	function formatLastResults(query) {
		if (query.lastResultsCount === undefined || query.lastResultsCount === null) {
			return null;
		}
		if (query.lastResultsCount === 0) {
			return 'Last search: No jobs found';
		}
		return `Last search: ${query.lastResultsCount} job${query.lastResultsCount !== 1 ? 's' : ''} found`;
	}

	// Function to delete job agent
	async function deleteJobAgent(agentId) {
		if (!uid || !agentId) return;

		deletingId = agentId;
		error = null;

		try {
			// Delete directly from Firestore
			await deleteDoc(doc(db, 'users', uid, 'searchQueries', agentId));

			// The searchQueriesStore will automatically update due to the onSnapshot listener
			setJobAgentStatus(false, null);
		} catch (error) {
			error = error.message || 'An error occurred while deleting the job agent';
		} finally {
			deletingId = null;
		}
	}

	// Function to handle edit button click
	function editJobAgent(query) {
		dispatch('edit', query);
	}

	// Function to dismiss info card
	function dismissInfoCard() {
		showInfoCard = false;
		// Ensure localStorage is set when dismissed
		localStorage.setItem('hasSeenJobAgentCreationMessage', 'true');
	}

	onMount(() => {
		// Check if this is the first time creating a job agent
		const hasSeenJobAgentCreationMessage = localStorage.getItem('hasSeenJobAgentCreationMessage');

		// Start the rotating verbs interval
		verbInterval = setInterval(() => {
			currentVerbIndex = (currentVerbIndex + 1) % funnySearchVerbs.length;
			console.log('Rotated to verb:', funnySearchVerbs[currentVerbIndex]);
		}, 10000);

		// Subscribe to store to detect when queries are available
		const unsubscribe = searchQueriesStore.subscribe((store) => {
			// If user hasn't seen the message before AND there's at least one query
			if (!hasSeenJobAgentCreationMessage && !store.loading && store.queries.length > 0) {
				showInfoCard = true;

				// Set a short loading state for visual feedback
				agentCreating = true;
				setTimeout(() => {
					agentCreating = false;
				}, 2000);

				// Save to localStorage so it won't show again
				localStorage.setItem('hasSeenJobAgentCreationMessage', 'true');
			}
		});

		return unsubscribe;
	});

	onDestroy(() => {
		if (verbInterval) {
			clearInterval(verbInterval);
		}
	});
</script>

<InfoCard
	message="Your agent is being created! You can expect an email with first results within the next few minutes."
	show={showInfoCard}
	loading={agentCreating}
	on:dismiss={dismissInfoCard}
/>

<div class="mt-4 rounded-lg bg-white p-6 shadow">
	{#if $searchQueriesStore.loading}
		<div class="flex items-center justify-center py-4">
			<div class="h-6 w-6 animate-pulse rounded-full bg-orange-500"></div>
			<span class="ml-3">Loading your job agents...</span>
		</div>
	{:else if $searchQueriesStore.queries.length === 0}
		<div class="py-4 text-center text-gray-500">
			<p>You don't have any job agents yet.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each $searchQueriesStore.queries as query}
				<div
					class="rounded-lg border p-4 hover:bg-gray-50 {query.searchingStatus === 'searching'
						? 'border-blue-300 bg-blue-50'
						: ''}"
				>
					<div class="flex items-center">
						<!-- Icon avatar on the left, now centered vertically -->
						<div class="mr-4 flex flex-shrink-0 items-center justify-center">
							<img src={foxIcon} alt="Job Agent" class="h-12 w-12 rounded-lg" />
						</div>

						<!-- Main content pushed to the right -->
						<div class="flex-grow">
							<div class="flex items-start justify-between">
								<!-- Title at the top -->
								<div>
									<h3 class="font-bold">{formatSearchParams(query.searchParams)}</h3>
									{#if query.searchingStatus === 'searching' && query.lastSearchStarted}
										<p class="mt-1 text-sm text-blue-600">
											Search started {formatDate(query.lastSearchStarted)}
										</p>
									{:else if formatLastResults(query)}
										<p class="mt-1 text-sm text-gray-500">
											{formatLastResults(query)}
										</p>
									{/if}
								</div>

								<!-- Status indicator at top right -->
								<div class="inline-flex items-center {getStatusColor(query)}">
									{getStatusText(query, currentSearchVerb)}
									<span
										class="h-2 w-2 rounded-full {getStatusDotColor(
											query
										)} ml-1 {query.searchingStatus === 'searching' ? 'animate-pulse' : ''}"
									></span>
								</div>
							</div>

							<!-- Modified section: Timing info and Actions in same row -->
							<div class="mt-2 flex items-center justify-between text-sm text-gray-600">
								<div class="flex flex-wrap items-center">
									{#if query.limit !== undefined && query.limit !== null}
										<span class="mr-4 inline-flex items-center text-gray-600">
											<iconify-icon icon="tabler:stack-2" width="18" height="18" class="mr-1"
											></iconify-icon>
											matches {query.limit} job{query.limit !== 1 ? 's' : ''}
										</span>
									{/if}

									<span class="inline-flex items-center">
										<svg
											class="mr-1 h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											></path>
										</svg>
										{query.frequency || 'daily'}, {formatDeliveryTime(query.deliveryTime)}
									</span>

									{#if query.lastRun}
										<span class="ml-4 inline-flex items-center text-gray-600">
											Last run: {formatDate(query.lastRun)}
										</span>
									{/if}
								</div>

								<!-- Actions moved to the right side of the timing info -->
								<div class="flex">
									<button
										on:click={() => editJobAgent(query)}
										class="rounded-full p-1 text-sm text-black hover:text-gray-700"
										aria-label="Edit"
									>
										<iconify-icon icon="mynaui:edit-solid" width="18" height="18"></iconify-icon>
									</button>

									<button
										on:click={() => deleteJobAgent(query.id)}
										class="ml-1 rounded-full p-1 text-sm text-black hover:text-gray-700"
										disabled={deletingId === query.id}
										aria-label="Delete"
									>
										{#if deletingId === query.id}
											<div class="h-4 w-4 animate-pulse rounded-full bg-gray-400"></div>
										{:else}
											<iconify-icon icon="solar:trash-bin-trash-bold" width="18" height="18"
											></iconify-icon>
										{/if}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if error}
		<div class="mt-4 rounded-lg bg-red-100 p-4 text-red-700">
			{error}
		</div>
	{/if}

	{#if $searchQueriesStore.error}
		<div class="mt-4 rounded-lg bg-red-100 p-4 text-red-700">
			{$searchQueriesStore.error}
		</div>
	{/if}
</div>
