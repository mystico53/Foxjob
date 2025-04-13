<script>
    // Import Firestore functions and auth
    import { userStateStore, getSavedCount, getProgressPercentage, setSavedAnswer } from '$lib/stores/userStateStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
    import { auth, db } from '$lib/firebase';

    // Add function to reset all answers in both store and Firestore
    async function resetAllAnswers() {
        try {
            // Get current user
            const user = auth.currentUser;
            if (!user) {
                console.error('No user logged in');
                return;
            }

            // Get reference to work_preferences document
            const workPreferencesRef = doc(db, 'users', user.uid, 'UserCollections', 'work_preferences');
            
            // Option 1: Delete the document completely
            // await deleteDoc(workPreferencesRef);
            
            // Option 2: Update it to clear all answers but keep questions
            await updateDoc(workPreferencesRef, {
                answer1: null,
                answer2: null,
                answer3: null,
                answer4: null,
                answer5: null,
                // Don't reset questions
            });
            
            console.log("Successfully reset answers in Firestore");
            
            // Reset local state
            setSavedAnswer(1, false);
            setSavedAnswer(2, false);
            setSavedAnswer(3, false);
            setSavedAnswer(4, false);
            setSavedAnswer(5, false);
            
            // Redirect to preferences page so user can answer again
            goto('/preferences');
        } catch (error) {
            console.error("Error resetting answers:", error);
        }
    }

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
                <!-- Make it a link when all questions are answered with checkmark and delete button -->
                <div class="flex items-center space-x-2">
                    <a href="/preferences" class="text-sm font-medium">Vibe Questions answered</a>
                    <iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
                    <button 
                        on:click|preventDefault|stopPropagation={resetAllAnswers} 
                        class="btn btn-sm variant-ghost-surface"
                    >
                        <iconify-icon icon="solar:trash-bin-minimalistic-bold" class="text-xl"></iconify-icon>
                    </button>
                </div>
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