<script>
    import { workPreferencesStore, getSavedCount, getProgressPercentage } from '$lib/stores/workPreferencesStore';
    import { goto } from '$app/navigation';

    // Reactive calculation of the saved count
    $: savedCount = getSavedCount($workPreferencesStore);
    $: isLoading = $workPreferencesStore.loading;
    $: questionsReady = $workPreferencesStore.questionsAvailable;
    $: progressPercentage = getProgressPercentage($workPreferencesStore);
    
    function navigateToPreferences() {
        goto('/preferences');
    }
</script>

{#if isLoading}
    <span class="text-sm text-gray-500">Upload your resume</span>
{:else if !questionsReady}
    <span class="text-sm text-gray-500">Awaiting questions...</span>
{:else if savedCount === 0}
    <button 
        on:click={navigateToPreferences}
        class="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
    >
        Start Vibe Check
    </button>
{:else if savedCount === 5}
    <span class="text-sm">Vibe Check completed</span>
{:else}
    <span class="text-sm">Vibe Check {progressPercentage}% done</span>
    <button 
        on:click={navigateToPreferences}
        class="w-full mt-2 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
    >
        Finish Vibe Check
    </button>
{/if}

<style>
    /* Add any specific styles for this counter */
    span {
        margin-right: 0.25rem;
    }
</style>