<!-- FeedbackButtons.svelte -->
<script>
    import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';

    export let jobId;
    export let path;
    export let itemId;
    export let currentData;

    const db = getFirestore();
    let isLoading = false;
    let userVote = null;
    let currentUserId = null;
    let mounted = false;
    
    const FEEDBACK_COLLECTION = 'feedback';

    // Sanitize string for use in document ID
    function sanitizeForId(str) {
        return str.replace(/[/\s]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    }
    
    // Check if user has already voted by querying the feedback collection
    async function checkExistingVote() {
        if (!auth.currentUser || !mounted) return;
        
        const sanitizedItemId = sanitizeForId(itemId);
        const feedbackRef = doc(db, FEEDBACK_COLLECTION, `${jobId}_${sanitizedItemId}_${auth.currentUser.uid}`);
        
        const feedbackSnap = await getDoc(feedbackRef);
        if (feedbackSnap.exists()) {
            const data = feedbackSnap.data();
            if (data.active && data.itemId === itemId) {
                userVote = data.type;
            } else {
                userVote = null;
            }
        } else {
            userVote = null;
        }
    }

    // Initialize vote state for this specific instance
    onMount(() => {
        mounted = true;
        currentUserId = auth.currentUser?.uid;
        if (currentUserId) {
            checkExistingVote();
        }
    });

    // Watch for changes in auth or itemId
    $: if (mounted && auth.currentUser?.uid !== currentUserId) {
        currentUserId = auth.currentUser?.uid;
        checkExistingVote();
    }

    // Watch for changes in itemId
    $: if (mounted && itemId) {
        checkExistingVote();
    }

    async function handleFeedback(type) {
        if (isLoading || !mounted) return;
        
        try {
            isLoading = true;
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const sanitizedItemId = sanitizeForId(itemId);
            const feedbackId = `${jobId}_${sanitizedItemId}_${userId}`;
            const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);

            if (userVote === type) {
                // Remove vote
                await setDoc(feedbackRef, {
                    active: false,
                    updatedAt: new Date()
                }, { merge: true });
                userVote = null;
            } else {
                // Add or update vote
                await setDoc(feedbackRef, {
                    jobId,
                    itemId,
                    userId,
                    type,
                    path,
                    active: true,
                    timestamp: new Date(),
                    updatedAt: new Date(),
                    value: currentData,
                    sanitizedItemId
                }, { merge: true });
                userVote = type;
            }
        } catch (error) {
            console.error('Error saving feedback:', error);
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="inline-flex items-center">
    <button
        class="p-0.2 transition-colors {userVote === 'upvote' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}"
        on:click={() => handleFeedback('upvote')}
        disabled={isLoading}
        title="This is accurate"
    >
        <iconify-icon icon="heroicons-solid:thumb-up" width="14" height="14"></iconify-icon>
    </button>
    <button
        class="p-0.2 transition-colors {userVote === 'downvote' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}"
        on:click={() => handleFeedback('downvote')}
        disabled={isLoading}
        title="This needs improvement"
    >
        <iconify-icon icon="heroicons-solid:thumb-down" width="14" height="14"></iconify-icon>
    </button>
    
    {#if isLoading}
        <span class="text-xs text-gray-400">...</span>
    {/if}
</div>