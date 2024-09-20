<!-- src/routes/list/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let user = null;

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((currentUser) => {
			user = currentUser;
		});

		return () => unsubscribe();
	});

	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/'); // Redirect to the home page after logout
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}
</script>

<main>
	<h1>Job List</h1>
	{#if user}
		<p>Welcome to your job list, {user.displayName}!</p>
		<button on:click={handleLogout}>Log Out</button>
		<!-- Add your job list content here -->
	{:else}
		<p>Please sign in to view your job list.</p>
	{/if}
</main>
