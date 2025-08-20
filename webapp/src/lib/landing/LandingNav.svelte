<script>
	import { onMount } from 'svelte';
	import { auth, signInWithGoogle, signOutUser, authState } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { AppBar } from '@skeletonlabs/skeleton';

	let error = null;
	let isLoading = false;
	let isRedirecting = false;

	// Subscribe to auth state changes
	$: if ($authState && !isRedirecting) {
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] LandingNav detected auth state change:`, {
			uid: $authState.uid,
			email: $authState.email,
			provider: $authState.providerData?.[0]?.providerId
		});

		isRedirecting = true;
		goto('/list').catch((err) => {
			console.error(`[${timestamp}] Navigation error:`, err);
			isRedirecting = false;
		});
	}

	async function handleSignIn() {
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] User initiated sign in`);
		isLoading = true;
		error = null;

		try {
			await signInWithGoogle();
			// Auth state store will handle the redirect
		} catch (err) {
			console.error(`[${timestamp}] Sign-in error:`, {
				error: err.message,
				code: err.code,
				stack: err.stack
			});
			error = err.message;
			isLoading = false;
		}
	}

	async function handleSignOut() {
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] User initiated sign out`);
		isLoading = true;
		error = null;

		try {
			await signOutUser();
			isRedirecting = false;
			console.log(`[${timestamp}] User signed out successfully`);
		} catch (err) {
			console.error(`[${timestamp}] Error during sign out:`, err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}
</script>

<AppBar class="border-none bg-transparent" slotTrail="place-self-end">
	<svelte:fragment slot="trail">
		<div class="flex items-center">
			{#if $authState}
				<button
					type="button"
					class="btn bg-transparent p-0 transition-colors duration-200 hover:bg-black/40"
					on:click={handleSignOut}
					disabled={isLoading}
				>
					{#if isLoading}Loading...{:else}Sign Out{/if}
				</button>
			{:else}
				<button
					type="button"
					class="btn bg-transparent p-0 transition-colors duration-200 hover:bg-black/40"
					on:click={handleSignIn}
					disabled={isLoading}
				>
					{#if isLoading}
						Loading...
					{:else}
						<iconify-icon icon="flat-color-icons:google" width="24" height="24"></iconify-icon>
						<span class="ml-2">Sign In with Google</span>
					{/if}
				</button>
			{/if}

			{#if error}
				<div class="ml-4 text-sm text-red-600">{error}</div>
			{/if}
		</div>
	</svelte:fragment>
</AppBar>

<style>
	/* Override any default AppBar background colors */
	:global(.bg-transparent) {
		background: transparent !important;
	}

	/* Ensure the buttons maintain transparency */
	:global(.btn.bg-transparent) {
		background-color: transparent !important;
	}

	:global(.btn.bg-transparent:hover) {
		background-color: rgba(255, 255, 255, 0.1) !important;
	}
</style>
