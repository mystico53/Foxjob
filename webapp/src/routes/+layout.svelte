<!-- +layout.svelte -->
<script>
    import "../app.css";
    import Navbar from '$lib/Navbar.svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import 'iconify-icon';
    import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
    import { storePopup, initializeStores } from '@skeletonlabs/skeleton';
    import { Modal } from '@skeletonlabs/skeleton';
    import FeedbackModal from '$lib/admincomponents/FeedbackModal.svelte';
    
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

<Modal />

<div class="flex flex-col min-h-screen">
    {#if isAuthenticated && $page.url.pathname !== '/'}
        <Navbar />
    {/if}

    <main class="flex-grow">
        <slot />
    </main>
</div>