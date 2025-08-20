<!-- src/routes/unsubscribe/[searchId]/+page.svelte -->
<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAuth, signInWithCustomToken } from 'firebase/auth';
	import { initializeApp } from 'firebase/app';
	import { getFirebaseConfig } from '$lib/config/firebase.config';

	let status = 'processing';
	let message = 'Processing your unsubscribe request...';
	let error = null;

	onMount(async () => {
		try {
			const searchId = $page.params.searchId;
			const token = new URLSearchParams(window.location.search).get('token');

			if (!token) {
				status = 'error';
				message = 'Invalid unsubscribe link. The token is missing.';
				return;
			}

			// Initialize Firebase if not already initialized
			if (!getAuth().app) {
				initializeApp(getFirebaseConfig());
			}

			// Get auth instance
			const auth = getAuth();

			try {
				// First sign in with the custom token
				await signInWithCustomToken(auth, token);

				// Now make the unsubscribe request
				const response = await fetch(`/api/unsubscribe/${searchId}?token=${token}`);
				const data = await response.json();

				if (response.ok) {
					status = 'success';
					message = 'You have been successfully unsubscribed from this job search.';
				} else {
					status = 'error';
					message = data.message || 'Failed to unsubscribe. Please try again or contact support.';
					error = data.error;
				}
			} catch (err) {
				status = 'error';
				message = 'Invalid or expired unsubscribe link.';
				error = err.message;
			}
		} catch (err) {
			status = 'error';
			message = 'An error occurred while processing your request.';
			error = err.message;
		}
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
	<div class="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
		<h1 class="mb-4 text-2xl font-bold">Unsubscribe from Job Search</h1>

		{#if status === 'processing'}
			<div class="animate-pulse">
				<div class="mx-auto mb-4 h-4 w-3/4 rounded bg-gray-200"></div>
				<div class="mx-auto h-4 w-1/2 rounded bg-gray-200"></div>
			</div>
		{:else if status === 'success'}
			<div class="mb-4 text-green-600">
				<svg class="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
					></path>
				</svg>
				<p class="text-lg">{message}</p>
			</div>
		{:else}
			<div class="mb-4 text-red-600">
				<svg class="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
				<p class="text-lg">{message}</p>
				{#if error}
					<p class="mt-2 text-sm text-gray-600">Error details: {error}</p>
				{/if}
			</div>
		{/if}

		<a
			href="/"
			class="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
		>
			Return to Homepage
		</a>
	</div>
</div>
