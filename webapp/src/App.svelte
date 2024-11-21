<script>
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { user } from '$/lib/stores/authStore';
	import { onAuthStateChanged } from 'firebase/auth';
	import { Router, Route, navigate } from 'svelte-routing';
	import Login from './Login.svelte';
	import Navbar from '$lib/Navbar.svelte';
	import List from './routes/list/+page.svelte';
	import Cards from './routes/Cards.svelte';
	import Workflow from './routes/workflow/+page.svelte';

	let isAuthenticated = false;

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			user.set(currentUser);
			isAuthenticated = !!currentUser;
			if (currentUser) {
				console.log('User is signed in', currentUser);
				if (window.location.pathname === '/') {
					navigate('/list');
				}
			} else {
				console.log('No user signed in');
				if (window.location.pathname !== '/') {
					navigate('/');
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
		<Navbar />
		<Router>
			<div class="content">
				<Route path="/" component={Login} />
				<Route path="/list" component={List} />
				<Route path="/cards" component={Cards} />
				<Route path="/workflow" component={Workflow} />
			</div>
		</Router>
	{/if}
</main>

<style>
	main {
		padding: 1em;
		margin: 0 auto;
	}
	.content {
		padding-top: 1em;
	}
</style>
