<!-- src/routes/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let user = null;

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((currentUser) => {
			user = currentUser;
			if (user) {
				goto('/list');
			}
		});

		return () => unsubscribe();
	});

	async function signInWithGoogle() {
		const provider = new GoogleAuthProvider();
		try {
			await signInWithPopup(auth, provider);
			// The user will be redirected to /list by the onAuthStateChanged listener
		} catch (error) {
			console.error('Error signing in with Google', error);
		}
	}
</script>

<main>
	<h1>Welcome to JobMatch</h1>
	{#if user}
		<p>You're already signed in. Redirecting to your list...</p>
	{:else}
		<button on:click={signInWithGoogle}>Sign in with Google</button>
	{/if}
</main>
