<!-- C:\coding\jobmatch-extension\webapp\src\routes\+layout.svelte -->
<script>
    import Navbar from '$lib/Navbar.svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';

    let isAuthenticated = false;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            isAuthenticated = !!user;
        });

        return unsubscribe;
    });
</script>

{#if isAuthenticated && $page.url.pathname !== '/'}
    <Navbar />
{/if}

<slot />

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
    }
</style>