<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { ProgressRadial } from '@skeletonlabs/skeleton';

    let user = null;
    let unsubscribeAuth = null;
    let isProcessing = false;
    let lastResponse = null;

    async function structureResume() {
        if (!user || isProcessing) return;
        
        isProcessing = true;
        lastResponse = null;

        try {
            const response = await fetch('http://127.0.0.1:5001/jobille-45494/us-central1/structureResume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Response from cloud function:', result);
            lastResponse = result;
            
        } catch (error) {
            console.error('Error structuring resume:', error);
            // Optional: Show error notification to user
        } finally {
            isProcessing = false;
        }
    }

    onMount(() => {
        unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
        });
    });

    onDestroy(() => {
        if (unsubscribeAuth) unsubscribeAuth();
    });
</script>

<div class="container mx-auto p-4">
    <div class="card p-4 mb-4 variant-surface">
        <button 
            class="btn variant-filled-primary w-full"
            on:click={structureResume}
            disabled={isProcessing}
        >
            {#if isProcessing}
                <ProgressRadial stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" width="w-6"/>
            {:else}
                Structure Resume
            {/if}
        </button>

        {#if lastResponse}
            <div class="mt-4 p-4 variant-ghost-surface">
                <h4 class="h4 mb-2">Structure Results:</h4>
                <pre class="whitespace-pre-wrap text-sm">
                    {JSON.stringify(lastResponse, null, 2)}
                </pre>
            </div>
        {/if}
    </div>
</div>