<script>
  import Modal from '$lib/admincomponents/FeedbackModal.svelte';
  import { getFirestore, setDoc, doc } from 'firebase/firestore';
  import { auth } from '$lib/firebase';
  
  let showModal = false;
  let feedbackText = '';
  let isSubmitting = false;
  
  const db = getFirestore();
  
  async function handleSubmit() {
    if (!feedbackText.trim() || isSubmitting) return;
    
    try {
        isSubmitting = true;
        const feedbackId = `feedback_${Date.now()}`;
        
        await setDoc(doc(db, 'feedback', 'openfeedback', 'submissions', feedbackId), {
            userId: auth.currentUser?.uid || 'anonymous',
            text: feedbackText,
            timestamp: new Date(),
            status: 'new'
        });

        showModal = false;
        feedbackText = '';
    } catch (error) {
        console.error('Error saving feedback:', error);
    } finally {
        isSubmitting = false;
    }
}
</script>

<button 
  class="btn variant-ghost-surface" 
  on:click={() => showModal = true}
>
  Feedback
</button>

<Modal 
  bind:show={showModal}
  title="Share Your Feedback"
  on:close={() => showModal = false}
>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
          <textarea
              bind:value={feedbackText}
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your feedback..."
              disabled={isSubmitting}
          ></textarea>
      </div>
      
      <div class="flex justify-end gap-3">
          <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              on:click={() => showModal = false}
              disabled={isSubmitting}
          >
              Cancel
          </button>
          <button
              type="submit"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!feedbackText.trim() || isSubmitting}
          >
              {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
      </div>
  </form>
</Modal>