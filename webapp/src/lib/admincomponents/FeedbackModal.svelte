<!-- FeedbackModal.svelte -->
<script>
  import { getModalStore } from '@skeletonlabs/skeleton';
  const modalStore = getModalStore();
</script>

<div class="p-4">
  <h2>Feedback Form</h2>
  <button class="btn variant-filled-primary" on:click={() => modalStore.close()}>
      Close
  </button>
</div>