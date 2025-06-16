<!-- src/routes/unsubscribe/[searchId]/+page.svelte -->
<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let status = 'processing';
    let message = 'Processing your unsubscribe request...';

    onMount(async () => {
        try {
            const searchId = $page.params.searchId;
            const token = new URLSearchParams(window.location.search).get('token');

            if (!token) {
                status = 'error';
                message = 'Invalid unsubscribe link. Please try again or contact support.';
                return;
            }

            const response = await fetch(`/api/unsubscribe/${searchId}?token=${token}`);
            const data = await response.json();

            if (response.ok) {
                status = 'success';
                message = 'You have been successfully unsubscribed from this job search.';
            } else {
                status = 'error';
                message = data.message || 'Failed to unsubscribe. Please try again or contact support.';
            }
        } catch (err) {
            status = 'error';
            message = 'An error occurred. Please try again or contact support.';
        }
    });
</script>

<div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 class="text-2xl font-bold mb-4">Unsubscribe from Job Search</h1>
        
        {#if status === 'processing'}
            <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
        {:else if status === 'success'}
            <div class="text-green-600 mb-4">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p class="text-lg">{message}</p>
            </div>
        {:else}
            <div class="text-red-600 mb-4">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <p class="text-lg">{message}</p>
            </div>
        {/if}

        <a href="/" class="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Return to Homepage
        </a>
    </div>
</div> 