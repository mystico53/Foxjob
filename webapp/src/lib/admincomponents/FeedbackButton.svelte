<script>
  import { getModalStore } from '@skeletonlabs/skeleton';
  
  const modalStore = getModalStore();
  
  function openFeedbackModal() {
      const modal = {
          type: 'alert',
          title: 'Share Your Feedback',
          body: 'We value your feedback!',
          buttonTextConfirm: 'Submit',
          buttonTextCancel: 'Cancel',
          modalClasses: 'w-modal-slim',
          response: (r) => {
              if (r) {
                  // Handle submit
                  console.log('Submitted');
              }
          }
      };
      
      modalStore.trigger(modal);
  }
</script>

<button 
  class="btn variant-ghost-surface" 
  on:click={openFeedbackModal}
>
  Feedback
</button>