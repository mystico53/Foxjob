<script>
	import { onMount } from 'svelte';
	import {
		getFirestore,
		collection,
		query,
		getDocs,
		orderBy,
		limit,
		startAfter,
		where
	} from 'firebase/firestore';
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import FeedbackCard from '$lib/admincomponents/FeedbackCard.svelte';
	import FeedbackDetails from '$lib/admincomponents/FeedbackDetails.svelte';

	const db = getFirestore();
	let feedbackItems = [];
	let loading = true;
	let error = null;
	let sidebar;

	// Selected feedback state
	let selectedFeedback = null;
	let selectedFeedbackIndex = -1;

	// Pagination state
	let currentPage = 0;
	let pageSize = 10;
	let totalItems = 0;
	let lastDoc = null;

	// Add reactive statement to handle initial feedback selection
	$: if (!selectedFeedback && feedbackItems && feedbackItems.length > 0) {
		selectedFeedback = feedbackItems[0];
		selectedFeedbackIndex = 0;
	}

	function goBack() {
		goto('/admin');
	}

	async function loadFeedbackData() {
		try {
			loading = true;
			error = null;

			const feedbackRef = collection(db, 'feedback');
			let q = query(
				feedbackRef,
				where('active', '==', true),
				orderBy('timestamp', 'desc'),
				limit(pageSize)
			);

			if (lastDoc && currentPage > 0) {
				q = query(q, startAfter(lastDoc));
			}

			const snapshot = await getDocs(q);

			feedbackItems = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate() || null
			}));

			lastDoc = snapshot.docs[snapshot.docs.length - 1];

			const totalQuery = query(feedbackRef, where('active', '==', true));
			const totalSnapshot = await getDocs(totalQuery);
			totalItems = totalSnapshot.size;
		} catch (err) {
			console.error('Error loading feedback:', err);
			error = 'Failed to load feedback data';
		} finally {
			loading = false;
		}
	}

	function handleFeedbackClick(feedback) {
		selectedFeedback = feedback;
		selectedFeedbackIndex = feedbackItems.findIndex((f) => f.id === feedback.id);

		if (window.innerWidth <= 768) {
			sidebar.style.transform = 'translateX(-100%)';
		}
	}

	function handleMobileNav() {
		if (sidebar) {
			const isHidden = sidebar.style.transform === 'translateX(-100%)';
			sidebar.style.transform = isHidden ? 'translateX(0)' : 'translateX(-100%)';
		}
	}

	onMount(() => {
		loadFeedbackData();
	});
</script>

<div class="fixed left-0 flex h-[calc(100vh-72px)] w-full flex-col">
	<!-- Header with back button -->
	<div class="flex items-center gap-4 border-b bg-surface-100 p-4">
		<button class="variant-ghost btn btn-sm" on:click={goBack}>
			<iconify-icon icon="solar:arrow-left-linear" class="text-xl" />
			Back to Dashboard
		</button>
		<h1 class="h2">Feedback Details</h1>
	</div>

	<!-- Your existing feedback layout -->
	<div class="flex flex-1 flex-col md:flex-row">
		<!-- Sidebar -->
		<aside
			class="custom-scrollbar h-full w-full transform overflow-y-auto border-r bg-surface-100 transition-transform md:w-80 md:translate-x-0"
			style="width: 25rem;"
			bind:this={sidebar}
		>
			<!-- Your existing sidebar content -->
		</aside>

		<!-- Main content area -->
		<main class="flex-1 overflow-y-auto bg-surface-100 p-4">
			<!-- Your existing main content -->
		</main>
	</div>
</div>

<div class="fixed left-0 flex h-[calc(100vh-72px)] w-full flex-col md:flex-row">
	<!-- Sidebar -->
	<aside
		class="custom-scrollbar h-full w-full transform overflow-y-auto border-r bg-surface-100 transition-transform md:w-80 md:translate-x-0"
		style="width: 25rem;"
		bind:this={sidebar}
	>
		<div class="p-4">
			{#if loading}
				<div class="flex justify-center p-4">
					<span class="loading loading-spinner loading-lg text-primary-500" />
				</div>
			{/if}

			{#if feedbackItems && feedbackItems.length > 0}
				<div class="flex flex-col gap-4">
					{#each feedbackItems as feedback (feedback.id)}
						<div animate:flip={{ duration: 700 }}>
							<FeedbackCard
								{feedback}
								isSelected={selectedFeedback?.id === feedback.id}
								handleClick={() => handleFeedbackClick(feedback)}
							/>
						</div>
					{/each}
				</div>
			{:else if !loading}
				<div class="p-4 text-center text-surface-400">No feedback found.</div>
			{/if}
		</div>
	</aside>

	<!-- Main content area -->
	<main class="flex-1 overflow-y-auto bg-surface-100 p-4">
		{#if selectedFeedback}
			<FeedbackDetails
				feedback={selectedFeedback}
				isFirstFeedback={selectedFeedbackIndex === 0}
				isLastFeedback={selectedFeedbackIndex === feedbackItems.length - 1}
			/>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-center text-surface-400">
					<div class="mb-2 text-4xl">👈 Select feedback to view details</div>
				</div>
			</div>
		{/if}
	</main>
</div>
