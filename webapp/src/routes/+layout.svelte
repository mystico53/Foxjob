<script>
    import "../app.css";
    import Navbar from '$lib/Navbar.svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import 'iconify-icon';
    import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
    import { storePopup, initializeStores } from '@skeletonlabs/skeleton';
    
    // Initialize stores first
    initializeStores();
    
    // Then set up popup store
    storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
    
    let isAuthenticated = false;
    let isLoading = true;
    
    // Define public routes that don't require authentication
    const publicRoutes = ['/landing', '/login', '/'];
    
    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            isAuthenticated = !!user;
            isLoading = false;
            
            // Get current path
            const currentPath = $page.url.pathname;
            
            // If user is not authenticated and trying to access a protected route
            if (!isAuthenticated && !publicRoutes.includes(currentPath)) {
                console.log('Unauthorized access, redirecting to landing');
                goto('/landing');
            }
        });
    
        return unsubscribe;
    });
</script>

{#if isLoading}
    <div class="flex h-screen items-center justify-center">
        <div class="spinner" />
    </div>
{:else}
    <div class="flex flex-col min-h-screen">
        {#if isAuthenticated && $page.url.pathname !== '/'}
            <Navbar />
        {/if}

        <main class="flex-grow">
            <slot />
        </main>
    </div>
{/if}

<style>
    :global(.chip) {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>