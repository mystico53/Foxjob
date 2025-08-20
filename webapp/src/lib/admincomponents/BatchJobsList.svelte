<!-- BatchJobsList.svelte -->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { getFirestore, collection, getDocs, doc, getDoc, where, query } from 'firebase/firestore';
	import { fade } from 'svelte/transition';
	import EmailRequestDetails from './EmailRequestDetails.svelte';

	const dispatch = createEventDispatcher();

	// Props
	export let selectedBatch = null;
	export let userId = null;

	// State
	let jobs = [];
	let isLoading = false;
	let error = null;
	let emailRequest = null;
	let isEmailExpanded = false;

	// Initialize DB
	const db = getFirestore();

	function handleClose() {
		dispatch('close');
	}

	// Watch for changes in the selected batch
	$: if (selectedBatch && userId) {
		loadBatchJobs(selectedBatch, userId);
		loadEmailRequest(selectedBatch);
	} else {
		jobs = [];
		emailRequest = null;
	}

	async function loadBatchJobs(batch, userId) {
		if (!batch || !batch.jobIds || !userId) {
			jobs = [];
			return;
		}

		isLoading = true;
		error = null;

		try {
			// Fetch jobs by their IDs from the batch
			const jobPromises = batch.jobIds.map((jobId) =>
				getDoc(doc(db, 'users', userId, 'scrapedJobs', jobId))
			);

			const jobSnapshots = await Promise.all(jobPromises);

			// Process the job data and sort by score
			jobs = jobSnapshots
				.filter((doc) => doc.exists()) // Filter out any that don't exist
				.map((doc) => {
					const data = doc.data();
					return {
						id: doc.id,
						title: data.title || data.basicInfo?.title || 'No Title',
						company: data.basicInfo?.company || 'Unknown Company',
						finalScore: data.match?.final_score || 0,
						// Additional fields that might be useful
						location: data.basicInfo?.location || 'No Location',
						url: data.basicInfo?.url || '',
						// Raw data for debugging
						rawData: data
					};
				})
				.sort((a, b) => b.finalScore - a.finalScore); // Sort by score in descending order
		} catch (err) {
			console.error('Error loading batch jobs:', err);
			error = `Failed to load jobs: ${err.message}`;
		} finally {
			isLoading = false;
		}
	}

	async function loadEmailRequest(batch) {
		if (!batch) {
			emailRequest = null;
			return;
		}

		console.log(`Loading email request for batch ${batch.id}`);

		try {
			// Track whether we found the email request
			let found = false;

			// First try to get emailRequestId directly from batch
			if (batch.emailRequestId) {
				console.log(`Batch has emailRequestId: ${batch.emailRequestId}`);
				const emailDoc = await getDoc(doc(db, 'emailRequests', batch.emailRequestId));
				if (emailDoc.exists()) {
					emailRequest = { id: emailDoc.id, ...emailDoc.data() };
					console.log(`Found email request by ID: ${emailDoc.id}`);
					found = true;
				} else {
					console.warn(`Email request with ID ${batch.emailRequestId} not found`);
				}
			} else {
				console.log('Batch does not have emailRequestId field');
			}

			// If not found, query the emailRequests collection by batchId
			if (!found) {
				console.log(`Querying emailRequests collection for batchId: ${batch.id}`);
				try {
					const emailQuery = query(
						collection(db, 'emailRequests'),
						where('batchId', '==', batch.id)
					);

					const querySnapshot = await getDocs(emailQuery);

					if (!querySnapshot.empty) {
						const emailDoc = querySnapshot.docs[0];
						emailRequest = { id: emailDoc.id, ...emailDoc.data() };
						console.log(`Found email request by batch ID query: ${emailDoc.id}`);
						found = true;
					} else {
						console.log(`No email requests found with batchId: ${batch.id}`);
					}
				} catch (queryErr) {
					console.error('Error querying email requests by batchId:', queryErr);
				}
			}

			// If still not found but emailSent is true, we'll show a message to the user
			if (!found) {
				if (batch.emailSent) {
					console.warn(`Batch ${batch.id} has emailSent=true but no email request found`);
				} else {
					console.log(
						`Batch ${batch.id} has emailSent=${batch.emailSent}, no email request expected`
					);
				}
				emailRequest = null;
			}
		} catch (err) {
			console.error('Error loading email request:', err);
			emailRequest = null;
		}
	}
</script>

<div class="flex h-full flex-col text-black" transition:fade={{ duration: 200 }}>
	<!-- Sticky Header -->
	<div class="bg-surface-100-800-token border-surface-300-600-token sticky top-0 z-10 border-b p-4">
		<div class="flex items-center justify-between">
			<h2 class="h3">
				{#if selectedBatch}
					<div class="text-lg font-semibold text-black">Jobs in Batch</div>
					<div class="font-mono text-sm text-black">{selectedBatch.id}</div>
					<div class="mt-1 text-sm text-black">
						{jobs.length} of {selectedBatch.jobIds?.length || 0} jobs loaded
					</div>
				{:else}
					Select a Batch to View Jobs
				{/if}
			</h2>

			<div class="flex items-center gap-2">
				{#if selectedBatch && selectedBatch.emailSent}
					<button
						class="variant-soft-primary btn"
						on:click={() => (isEmailExpanded = !isEmailExpanded)}
					>
						{isEmailExpanded ? 'Hide Email' : 'Show Email'}
					</button>
				{/if}

				<!-- Close button -->
				<button
					class="variant-ghost-surface btn btn-icon text-black"
					on:click={handleClose}
					title="Close"
				>
					<svg
						class="h-6 w-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		</div>

		<!-- Add email request info section -->
		{#if selectedBatch && selectedBatch.emailSent && isEmailExpanded}
			<div class="mt-4">
				<EmailRequestDetails {emailRequest} isExpanded={true} />
			</div>
		{/if}
	</div>

	<!-- Scrollable Content -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if isLoading}
			<div class="py-4 text-center">
				<div class="spinner"></div>
				<p class="mt-2 text-black">Loading jobs...</p>
			</div>
		{:else if error}
			<div class="alert variant-filled-error p-4">
				{error}
			</div>
		{:else if jobs.length === 0}
			<div class="py-4 text-center">
				<p class="text-black">No jobs found in this batch.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each jobs as job}
					<div class="card variant-soft p-4 transition-colors hover:variant-soft-primary">
						<h3 class="h4 mb-2 text-black">{job.title}</h3>
						<div class="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
							<div class="font-semibold text-black">Company:</div>
							<div class="text-black">{job.company}</div>

							<div class="font-semibold text-black">Location:</div>
							<div class="text-black">{job.location}</div>

							<div class="font-semibold text-black">Match Score:</div>
							<div class="font-semibold text-success-500">{job.finalScore}%</div>

							{#if job.url}
								<div class="font-semibold text-black">URL:</div>
								<div>
									<a
										href={job.url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-1 text-primary-500 hover:underline"
									>
										View Job
										<svg
											class="h-4 w-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
											<polyline points="15 3 21 3 21 9"></polyline>
											<line x1="10" y1="14" x2="21" y2="3"></line>
										</svg>
									</a>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.spinner {
		border: 3px solid #f3f3f3;
		border-top: 3px solid #3498db;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		animation: spin 1s linear infinite;
		margin: 0 auto;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Hide scrollbar for cleaner look */
	.overflow-y-auto {
		scrollbar-width: thin;
		scrollbar-color: var(--color-surface-300) transparent;
	}

	.overflow-y-auto::-webkit-scrollbar {
		width: 6px;
	}

	.overflow-y-auto::-webkit-scrollbar-track {
		background: transparent;
	}

	.overflow-y-auto::-webkit-scrollbar-thumb {
		background-color: var(--color-surface-300);
		border-radius: 3px;
	}

	/* Add hover effect for close button */
	.btn-icon:hover {
		background-color: var(--color-surface-200);
	}
</style>
