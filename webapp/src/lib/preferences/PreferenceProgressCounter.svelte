<script>
    // Import Firestore functions and auth
    import { userStateStore, getSavedCount, getProgressPercentage, setSavedAnswer } from '$lib/stores/userStateStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
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

    function navigateToPreferences() {
        goto('/preferences');
    }

    let currentMessageText = "";
    
    // Add more detailed debugging
    onMount(async () => {
        // Check Firestore for answers on initial load
        await checkFirestoreAnswers();
        
        const unsubscribe = userStateStore.subscribe(state => { 
            // Force message update
            updateMessageText(state);
        });
        
        return unsubscribe;
    });

    // Function to check Firestore for saved answers on initial load
    async function checkFirestoreAnswers() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('No user logged in');
                return;
            }
            
            const workPreferencesRef = doc(db, 'users', user.uid, 'UserCollections', 'work_preferences');
            const docSnap = await getDoc(workPreferencesRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Update local store based on Firestore data
                setSavedAnswer(1, !!data.answer1);
                setSavedAnswer(2, !!data.answer2);
                setSavedAnswer(3, !!data.answer3);
                setSavedAnswer(4, !!data.answer4);
                setSavedAnswer(5, !!data.answer5);
                
                console.log("Loaded answers from Firestore");
            }
        } catch (error) {
            console.error("Error checking Firestore answers:", error);
        }
    }

    // Reactive calculations using the combined store
    $: workPreferences = $userStateStore.workPreferences;
    $: resumeStatus = $userStateStore.resume;
    $: savedCount = getSavedCount($userStateStore);
    $: isLoading = workPreferences?.loading || false;
    $: questionsReady = workPreferences?.questionsAvailable || false;
    $: progressPercentage = getProgressPercentage($userStateStore);
    $: resumeUploaded = resumeStatus?.status === true || resumeStatus?.status === 'processing' || resumeStatus?.status === 'processed';
    
    // Force update message when key variables change
    $: {
        // This block will re-run whenever these variables change
        updateMessageText($userStateStore);
    }

    // Determine if button should be active - only active when questions are ready or partially answered
    $: buttonActive = (questionsReady && savedCount === 0) || (savedCount > 0 && savedCount < 5);
    
    function updateMessageText(state) {
        const savedCount = getSavedCount(state);
        const questionsReady = state.workPreferences?.questionsAvailable || false;
        const workPrefStatus = state.workPreferences?.status || '';
        const resumeUploadStatus = state.resume?.status || false;
        
        // Resume not uploaded yet - no message needed
        if (!resumeUploadStatus) {
            currentMessageText = "";
            return;
        }
        
        // Resume is uploaded but vibe check not started
        if (resumeUploadStatus && savedCount === 0) {
            currentMessageText = "To improve accuracy of job matches, tell us how you vibe";
        } 
        // Vibe check in progress (started but not finished)
        else if (savedCount > 0 && savedCount < 5) {
            currentMessageText = `${savedCount} of 5 questions answered`;
        } 
        // Vibe check completed - no message needed
        else if (savedCount === 5) {
            currentMessageText = "";
        }
    }
</script>


<div class="flex flex-col w-full">
    <!-- Content area with left-aligned button -->
    <div class="flex flex-col">
        <!-- Only show button if resume is uploaded and vibe check is not completed -->
        {#if resumeUploaded && savedCount < 5}
            <button 
                on:click={navigateToPreferences}
                class="btn variant-filled-primary self-start {buttonActive ? '' : 'opacity-50 cursor-not-allowed'}"
                disabled={!buttonActive}
            >
                {savedCount === 0 ? '🎵 Start Vibe Check' : 'Finish Vibe Check'}
            </button>
            
            <!-- Message area - only show when vibe check not completed -->
            {#if currentMessageText}
                <div class="mt-2">
                    <span class="text-sm">{currentMessageText}</span>
                </div>
            {/if}
        {/if}
        
<!-- Completed state - only show checkmark and edit/delete buttons -->
{#if savedCount === 5}
<div class="flex w-full justify-between items-center">
    <span class="font-medium whitespace-nowrap">Vibe Questions answered</span>
    <div class="flex gap-2">
        <iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
        <button 
            on:click={navigateToPreferences} 
            class="btn btn-sm variant-ghost-surface"
        >
        <iconify-icon icon="mynaui:edit-solid" width="18" height="18"></iconify-icon>
        </button>
        
        <button 
            on:click|preventDefault|stopPropagation={resetAllAnswers} 
            class="btn btn-sm variant-ghost-surface"
        >
            <iconify-icon icon="solar:trash-bin-minimalistic-bold" class="text-xl"></iconify-icon>
        </button>
    </div>
</div>
{/if}
    </div>
</div>

<style>
    /* Remove top margin to match resume component */
    .btn {
        min-width: 120px;
    }
    
    span {
        display: block;
    }
</style>