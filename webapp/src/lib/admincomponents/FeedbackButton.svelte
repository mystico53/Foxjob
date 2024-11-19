<script>
  import Modal from '$lib/admincomponents/FeedbackModal.svelte';
  import { getFirestore, collection, addDoc } from 'firebase/firestore';
  import { auth } from '$lib/firebase';
  
  let showModal = false;
  let feedbackText = '';
  let isLoading = false;
  
  const db = getFirestore();
  
  async function handleSubmit() {
      if (!feedbackText.trim()) return;
      
      isLoading = true;
      
      try {
          const feedbackRef = collection(db, 'feedback');
          await addDoc(feedbackRef, {
              userId: auth.currentUser?.uid || 'anonymous',
              feedback: feedbackText,
              timestamp: new Date(),
              status: 'new'
          });
          
          showModal = false;
          feedbackText = '';
          alert('Feedback submitted successfully!');
      } catch (error) {
          console.error('Error submitting feedback:', error);
          alert('Error submitting feedback. Please try again.');
      } finally {
          isLoading = false;
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
  <div class="space-y-4">
      <textarea
          class="textarea w-full"
          bind:value={feedbackText}
          rows="4"
          placeholder="Enter your feedback here..."
      />
      
      <div class="flex justify-end gap-2">
          <button 
              class="btn variant-ghost-surface" 
              on:click={() => showModal = false}
              disabled={isLoading}
          >
              Cancel
          </button>
          <button
              class="btn variant-filled-primary"
              on:click={handleSubmit}
              disabled={isLoading || !feedbackText.trim()}
          >
              {isLoading ? 'Submitting...' : 'Submit'}
          </button>
      </div>
  </div>
</Modal>