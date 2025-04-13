<script>
    import { userStateStore, getSavedCount, getProgressPercentage } from '$lib/stores/userStateStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let currentMessageText = "Nice to meet you, let's find the right job for you";
    
    // Add more detailed debugging
    onMount(() => {
        const unsubscribe = userStateStore.subscribe(state => {
            console.log("PreferenceProgressCounter store updated:", state);
            console.log("Saved count:", getSavedCount(state));
            console.log("Questions ready:", state.workPreferences.questionsAvailable);
            console.log("Work preferences status:", state.workPreferences.status);
            
            // Force message update
            updateMessageText(state);
        });
        
        return unsubscribe;
    });

    // Reactive calculations using the combined store
    $: workPreferences = $userStateStore.workPreferences;
    $: resumeStatus = $userStateStore.resume;
    $: savedCount = getSavedCount($userStateStore);
    $: isLoading = workPreferences?.loading || false;
    $: questionsReady = workPreferences?.questionsAvailable || false;
    $: progressPercentage = getProgressPercentage($userStateStore);
    
    // Force update message when key variables change
    $: {
        // This block will re-run whenever these variables change
        console.log("REACTIVE UPDATE - questionsReady:", questionsReady, "savedCount:", savedCount);
        updateMessageText($userStateStore);
    }
    
    function navigateToPreferences() {
        goto('/preferences');
    }

    // Determine if button should be active - only active when questions are ready or partially answered
    $: buttonActive = (questionsReady && savedCount === 0) || (savedCount > 0 && savedCount < 5);
    
    function updateMessageText(state) {
        const savedCount = getSavedCount(state);
        const questionsReady = state.workPreferences?.questionsAvailable || false;
        const workPrefStatus = state.workPreferences?.status || '';
        
        console.log("UPDATE MESSAGE - savedCount:", savedCount, "questionsReady:", questionsReady, "status:", workPrefStatus);
        
        if (questionsReady && savedCount === 0) {
            currentMessageText = "Thanks! To find the best jobs, tell us how you vibe";
            console.log("Setting message to: Thanks! To find the best jobs, tell us how you vibe");
        } else if (!questionsReady) {
            if (workPrefStatus === 'pending') {
                currentMessageText = "Reading your resume, checking your vibe";
            } else if (workPrefStatus === 'error') {
                currentMessageText = "Oops, please re-upload your resume";
            } else {
                currentMessageText = "Nice to meet you, let's find the right job for you";
            }
        } else if (savedCount > 0 && savedCount < 5) {
            currentMessageText = `${savedCount} of 5 questions answered`;
        } else if (savedCount === 5) {
            currentMessageText = "Vibe Questions answered";
        } else {
            currentMessageText = "Nice to meet you, let's find the right job for you";
        }
    }
</script>

<div class="flex flex-col w-full mt-4">
    <!-- Content area with left-aligned button -->
    <div class="flex flex-col">
        <!-- Button (hidden when all questions answered) -->
        {#if savedCount < 5}
            <button 
                on:click={navigateToPreferences}
                class="btn variant-filled-primary self-start {buttonActive ? '' : 'opacity-50 cursor-not-allowed'}"
                disabled={!buttonActive}
            >
                {savedCount === 0 ? 'Start Vibe Check' : 'Finish Vibe Check'}
            </button>
        {/if}
        
        <!-- Message area -->
        <div class="mt-2">
            {#if savedCount === 5}
                <!-- Make it a link when all questions are answered -->
                <a href="/preferences" class="text-sm font-medium">Vibe Questions answered</a>
            {:else}
                <span class="text-sm">{currentMessageText}</span>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Center everything and add consistent spacing */
    div {
        margin-top: 1rem;
        padding-bottom: 0.5rem;
    }
    
    span {
        display: block;
        margin: 0.5rem 0;
    }
    
    .btn {
        min-width: 120px;
    }
</style>