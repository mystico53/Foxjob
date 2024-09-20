<script>
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { user } from './stores/authStore'; // Assuming you've created this store
	import { onAuthStateChanged } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import Login from './Login.svelte';

	let isAuthenticated = false;

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			user.set(currentUser);
			isAuthenticated = !!currentUser;
			if (currentUser) {
				console.log('User is signed in', currentUser);
				if (window.location.pathname === '/') {
					goto('/list');
				}
			} else {
				console.log('No user signed in');
				if (window.location.pathname !== '/') {
					goto('/');
				}
			}
		});

		return unsubscribe;
	});
</script>

<main>
	{#if !isAuthenticated}
		<Login />
	{:else}
		<!-- Your authenticated app content here -->
		<p>Welcome, you're logged in!</p>
		<!-- You might want to add navigation or other components here -->
	{/if}
</main>

<style>
	main {
		padding: 1em;
		margin: 0 auto;
	}
</style>
