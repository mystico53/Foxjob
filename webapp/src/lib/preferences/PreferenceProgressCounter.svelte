<script>
    import { userStateStore, getSavedCount, getProgressPercentage } from '$lib/stores/userStateStore';
    import { goto } from '$app/navigation';

    // Reactive calculations using the combined store
    $: workPreferences = $userStateStore.workPreferences;
    $: resumeStatus = $userStateStore.resume;
    $: savedCount = getSavedCount($userStateStore);
    $: isLoading = workPreferences.loading;
    $: questionsReady = workPreferences.questionsAvailable;
    $: progressPercentage = getProgressPercentage($userStateStore);
    
    function navigateToPreferences() {
        goto('/preferences');
    }
</script>

{#if isLoading}
    <span class="text-sm text-gray-500">Upload your resume</span>
    {#if resumeStatus.isUploaded}
        {#if resumeStatus.status === 'processing'}
            <span class="text-sm text-yellow-500 ml-1">• Resume processing: {resumeStatus.fileName}</span>
        {:else if resumeStatus.status === 'processed'}
            <span class="text-sm text-green-500 ml-1">• Resume uploaded: {resumeStatus.fileName}</span>
        {:else if resumeStatus.status === 'error'}
            <span class="text-sm text-red-500 ml-1">• Resume error: {resumeStatus.fileName}</span>
        {:else}
            <span class="text-sm text-green-500 ml-1">• Resume uploaded: {resumeStatus.fileName}</span>
        {/if}
    {/if}
{:else if !questionsReady}
    <span class="text-sm text-gray-500">Awaiting questions...</span>
    {#if resumeStatus.isUploaded}
        {#if resumeStatus.status === 'processing'}
            <span class="text-sm text-yellow-500 ml-1">• Resume processing</span>
        {:else if resumeStatus.status === 'processed'}
            <span class="text-sm text-green-500 ml-1">• Resume processed</span>
        {:else if resumeStatus.status === 'error'}
            <span class="text-sm text-red-500 ml-1">• Resume error</span>
        {:else}
            <span class="text-sm text-green-500 ml-1">• Resume uploaded</span>
        {/if}
    {/if}
{:else if savedCount === 0}
    {#if resumeStatus.isUploaded}
        {#if resumeStatus.status === 'processing'}
            <span class="text-sm text-yellow-500 mb-2">Resume processing</span>
        {:else if resumeStatus.status === 'processed'}
            <span class="text-sm text-green-500 mb-2">Resume processed</span>
        {:else if resumeStatus.status === 'error'}
            <span class="text-sm text-red-500 mb-2">Resume error</span>
        {:else}
            <span class="text-sm text-green-500 mb-2">Resume uploaded</span>
        {/if}
    {/if}
    <button 
        on:click={navigateToPreferences}
        class="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
    >
        Start Vibe Check
    </button>
{:else if savedCount === 5}
    <span class="text-sm">Vibe Check completed</span>
    {#if resumeStatus.isUploaded}
        {#if resumeStatus.status === 'processing'}
            <span class="text-sm text-yellow-500 ml-1">• Resume processing</span>
        {:else if resumeStatus.status === 'processed'}
            <span class="text-sm text-green-500 ml-1">• Resume ready</span>
        {:else if resumeStatus.status === 'error'}
            <span class="text-sm text-red-500 ml-1">• Resume error</span>
        {:else}
            <span class="text-sm text-green-500 ml-1">• Resume ready</span>
        {/if}
    {/if}
{:else}
    <span class="text-sm">Vibe Check {progressPercentage}% done</span>
    {#if resumeStatus.isUploaded}
        <span class="text-sm text-green-500 ml-1">• Resume ready</span>
    {/if}
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
        display: block;
    }
</style>