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

<div class="flex flex-col min-h-screen">
    {#if isAuthenticated && $page.url.pathname !== '/'}
        <Navbar />
    {/if}

    <main class="flex-grow pb-16">
        <slot />
    </main>

    <footer class="sticky bottom-0 left-0 right-0 py-4 bg-gray-100 mt-auto">
        <div class="container mx-auto px-4">
            <a href="/privacy" class="text-blue-600 hover:underline" data-sveltekit-preload-data="off">
                Privacy Policy
            </a>
        </div>
    </footer>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    :global(#svelte) {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
</style>