<!-- FeedbackButtons.svelte -->
<script>
    import { getFirestore, updateDoc, setDoc, arrayUnion, arrayRemove, doc, increment, getDoc } from 'firebase/firestore';
    import { auth } from '$lib/firebase';

    export let jobId;
    export let path;
    export let itemId;
    export let currentData;

    const db = getFirestore();
    let isLoading = false;
    let userVote = null;
    
    const FEEDBACK_COLLECTION = 'feedback';

    // Sanitize string for use in document ID
    function sanitizeForId(str) {
        return str.replace(/[/\s]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    }
    
    // Check if user has already voted by querying the feedback collection
    async function checkExistingVote() {
        if (!auth.currentUser) return;
        
        const sanitizedItemId = sanitizeForId(itemId);
        const feedbackRef = doc(db, FEEDBACK_COLLECTION, `${jobId}_${sanitizedItemId}_${auth.currentUser.uid}`);
        
        console.log('Checking feedback document:', feedbackRef.path);
        
        const feedbackSnap = await getDoc(feedbackRef);
        if (feedbackSnap.exists()) {
            userVote = feedbackSnap.data().type;
        }
    }

    // Initial check for existing vote
    $: if (auth.currentUser) {
        checkExistingVote();
    }

    async function handleFeedback(type) {
        if (isLoading) return;
        
        try {
            isLoading = true;
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            // Create a unique ID for this feedback using sanitized itemId
            const sanitizedItemId = sanitizeForId(itemId);
            const feedbackId = `${jobId}_${sanitizedItemId}_${userId}`;
            const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);

            console.log('=== Operation Details ===');
            console.log('Feedback ID:', feedbackId);
            console.log('Job ID:', jobId);
            console.log('Original Item ID:', itemId);
            console.log('Sanitized Item ID:', sanitizedItemId);
            console.log('Type:', type);

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
                    value: currentData, // Store the actual text/value being rated
                    sanitizedItemId // Store this for reference
                }, { merge: true });
                userVote = type;
            }

            console.log('=== Operation Completed Successfully ===');
            console.log('Document path:', feedbackRef.path);
        } catch (error) {
            console.error('Error saving feedback:', error);
            console.error('Context:', {
                jobId,
                itemId,
                sanitizedItemId: sanitizeForId(itemId),
                userId: auth.currentUser?.uid
            });
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="inline-flex gap-1 items-center group">
    <button
        class="btn btn-sm {userVote === 'upvote' ? 'variant-filled-success' : 'variant-ghost-success'}"
        on:click={() => handleFeedback('upvote')}
        disabled={isLoading}
        title="This is accurate"
    >
        <iconify-icon icon="heroicons-solid:thumb-up"></iconify-icon>
    </button>
    <button
        class="btn btn-sm {userVote === 'downvote' ? 'variant-filled-error' : 'variant-ghost-error'}"
        on:click={() => handleFeedback('downvote')}
        disabled={isLoading}
        title="This needs improvement"
    >
        <iconify-icon icon="heroicons-solid:thumb-down"></iconify-icon>
    </button>
    
    {#if isLoading}
        <span class="text-xs">...</span>
    {/if}
</div>