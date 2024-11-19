<!-- +layout.svelte -->
<script>
    import "../app.css";
    import Navbar from '$lib/Navbar.svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import 'iconify-icon';
    import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
    import { storePopup, initializeStores, Modal } from '@skeletonlabs/skeleton';
    
    // Initialize stores first
    initializeStores();
    
    // Then set up popup store
    storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
    
    let isAuthenticated = false;
    
    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            isAuthenticated = !!user;
        });
    
        return unsubscribe;
    });
</script>

<!-- Add a portal element for the modal -->
<div class="modal-container">
    <Modal />
</div>

<div class="flex flex-col min-h-screen">
    {#if isAuthenticated && $page.url.pathname !== '/'}
        <Navbar />
    {/if}

    <main class="flex-grow">
        <slot />
    </main>
</div>

<style>
    :global(.chip) {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    :global(.modal-container) {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999;
        pointer-events: none;
    }
    
    :global(.modal-container :global(.modal)) {
        pointer-events: auto;
    }
</style>