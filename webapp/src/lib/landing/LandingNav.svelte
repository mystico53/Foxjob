<script>
  import { onMount } from 'svelte';
  import { auth, signOutUser } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { AppBar, Avatar } from '@skeletonlabs/skeleton';
  import ConsentDialog from '$lib/landing/ConsentDialog.svelte';

  let user = null;
  let error = null;
  let showConsentDialog = false;

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("Auth state changed, user:", currentUser);
      user = currentUser;
      if (user) {
        console.log("User authenticated, user ID:", user.uid);
        goto('/list');
      } else {
        console.log("No user authenticated");
      }
    });

    return () => unsubscribe();
  });

  function handleSignIn() {
    showConsentDialog = true;
  }

  function handleDialogClose() {
    showConsentDialog = false;
  }

  async function handleSignInSuccess() {
    showConsentDialog = false;
    // Additional success handling if needed
    await goto('/list');
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      user = null;
      console.log("User signed out successfully");
    } catch (err) {
      console.error('Error signing out', err);
      error = err.message;
    }
  }
</script>

<AppBar
class="bg-transparent border-none"
slotTrail="place-self-end"
>
<svelte:fragment slot="trail">
  <div class="flex items-center">
    {#if user}
      <button 
        type="button" 
        class="btn p-0 bg-transparent hover:bg-black/40 transition-colors duration-200" 
        on:click={handleSignOut}
      >
        Sign Out
      </button>
    {:else}         
      <button 
        type="button" 
        class="btn p-0 bg-transparent hover:bg-black/40 transition-colors duration-200" 
        on:click={handleSignIn}
      >
        <iconify-icon icon="flat-color-icons:google" width="24" height="24"></iconify-icon>
        <span class="ml-2">Sign In with Google</span>
      </button>
    {/if}
  </div>
</svelte:fragment>
</AppBar>

{#if showConsentDialog}
<ConsentDialog 
  onClose={handleDialogClose}
  onSuccess={handleSignInSuccess}
/>
{/if}
  
  <style>
    /* Override any default AppBar background colors */
    :global(.bg-transparent) {
      background: transparent !important;
    }
    
    /* Ensure the buttons maintain transparency */
    :global(.btn.bg-transparent) {
      background-color: transparent !important;
    }
    
    :global(.btn.bg-transparent:hover) {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
  </style>