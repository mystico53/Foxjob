<script>
    import { onMount } from 'svelte';
    import { auth } from '$lib/firebase';
    
    let currentUser = null;
    let idToken = '';
    let idTokenClaims = null;
    let userDetails = null;
    let isLoading = true;
    
    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            isLoading = true;
            currentUser = user;
            
            if (user) {
                // Get ID token
                try {
                    idToken = await user.getIdToken();
                    const idTokenResult = await user.getIdTokenResult();
                    idTokenClaims = idTokenResult.claims;
                    
                    userDetails = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        providerData: user.providerData
                    };
                } catch (error) {
                    console.error('Error getting ID token', error);
                }
            } else {
                idToken = '';
                idTokenClaims = null;
                userDetails = null;
            }
            
            isLoading = false;
        });
        
        return unsubscribe;
    });

    // Refresh token to get latest claims
    async function refreshToken() {
        isLoading = true;
        try {
            await auth.currentUser.getIdToken(true);
            idToken = await auth.currentUser.getIdToken();
            const idTokenResult = await auth.currentUser.getIdTokenResult();
            idTokenClaims = idTokenResult.claims;
        } catch (error) {
            console.error('Error refreshing token', error);
        }
        isLoading = false;
    }
</script>

<div class="container mx-auto p-4">
    <h1 class="h1 mb-4">Development Tools</h1>
    <p class="text-amber-500 mb-4">⚠️ This page is for development purposes only.</p>

    {#if isLoading}
        <p>Loading user details...</p>
    {:else if !currentUser}
        <div class="card p-4 mb-4">
            <p>Not signed in. Please sign in to view your authentication details.</p>
        </div>
    {:else}
        <div class="grid gap-4">
            <div class="card p-4">
                <h2 class="h3 mb-2">Current User</h2>
                <pre class="text-sm bg-surface-200-700-token p-2 rounded">{JSON.stringify(userDetails, null, 2)}</pre>
            </div>
            
            <div class="card p-4">
                <div class="flex justify-between items-center mb-2">
                    <h2 class="h3">ID Token Claims</h2>
                    <button class="btn btn-sm variant-filled" on:click={refreshToken}>
                        Refresh Token
                    </button>
                </div>
                <pre class="text-sm bg-surface-200-700-token p-2 rounded">{JSON.stringify(idTokenClaims, null, 2)}</pre>
                
                <div class="mt-4">
                    <h3 class="h4 mb-2">Admin Status</h3>
                    {#if idTokenClaims?.admin === true}
                        <p class="text-success-500">✅ You have admin privileges</p>
                    {:else}
                        <p class="text-error-500">❌ You do not have admin privileges</p>
                        <p class="text-sm mt-2">
                            To set admin privileges, you need to run the script in keys/setAdminClaim.cjs 
                            with your user ID as the UID.
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div> 