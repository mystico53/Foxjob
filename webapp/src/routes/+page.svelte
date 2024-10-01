<script>
	import { onMount } from 'svelte';
	import { auth, signInWithGoogle } from '$lib/firebase';
	import { goto } from '$app/navigation';

	let user = null;

	onMount(() => {
	const unsubscribe = auth.onAuthStateChanged((currentUser) => {
		console.log("Auth state changed, user:", currentUser);
		user = currentUser;
		if (user) {
		console.log("User authenticated, redirecting to /list");
		goto('/list');
		}
	});

	return () => unsubscribe();
	});

	async function handleSignIn() {
		try {
			await signInWithGoogle();
			// The user will be redirected to /list by the onAuthStateChanged listener
		} catch (error) {
			console.error('Error signing in with Google', error);
			// Handle error (e.g., show error message to user)
		}
	}
</script>

<main>
	<h1>Welcome to JobMatch</h1>
	{#if user}
		<p>You're already signed in. Redirecting to your list...</p>
	{:else}
		<button on:click={handleSignIn}>Sign in with Google</button>
	{/if}
</main>
