<script>
    import { workPreferencesStore, getSavedCount } from '$lib/stores/workPreferencesStore';

    // Reactive calculation of the saved count
    $: savedCount = getSavedCount($workPreferencesStore);
    $: isLoading = $workPreferencesStore.loading;
    $: questionsReady = $workPreferencesStore.questionsAvailable;

</script>

{#if isLoading}
    <span class="text-sm text-gray-500">Loading prefs...</span>
{:else if !questionsReady}
     <span class="text-sm text-gray-500">Awaiting questions...</span>
{:else}
    <span class="font-medium">{savedCount}</span>
    <span class="text-sm text-gray-600">/5 preferences saved</span>
{/if}

<!-- Optional: Add styling as needed -->
<style>
    /* Add any specific styles for this counter */
    span {
        /* example */
        margin-right: 0.25rem;
    }
</style>