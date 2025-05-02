<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { auth } from '$lib/firebase';
    
    let isAuthenticated = false;
    let isLoading = true;
    let error = '';

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            isLoading = true;
            
            if (user) {
                // Get the ID token with claims
                const idTokenResult = await user.getIdTokenResult();
                
                // Check if user has admin claim
                if (idTokenResult.claims.admin === true) {
                    isAuthenticated = true;
                    error = '';
                } else {
                    isAuthenticated = false;
                    error = 'You do not have admin privileges';
                }
            } else {
                isAuthenticated = false;
                error = 'Please sign in to access admin area';
            }
            
            isLoading = false;
        });

        return unsubscribe;
    });

    function handleSignIn() {
        goto('/auth/signin');
    }
</script>

{#if isLoading}
    <div class="flex justify-center items-center min-h-screen">
        <div class="card p-4 w-full max-w-sm">
            <h1 class="h3 mb-4">Loading admin access...</h1>
        </div>
    </div>
{:else if !isAuthenticated}
    <div class="flex justify-center items-center min-h-screen">
        <div class="card p-4 w-full max-w-sm">
            <h1 class="h1 mb-4">Admin Access</h1>
            
            {#if error}
                <p class="text-red-500 mb-4">{error}</p>
            {/if}
            
            <button class="btn variant-filled w-full" on:click={handleSignIn}>
                Sign In
            </button>
        </div>
    </div>
{:else}
    <slot />
{/if} 