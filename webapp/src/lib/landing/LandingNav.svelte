<script>
    import { onMount } from 'svelte';
    import { auth, signInWithGoogle, signOutUser } from '$lib/firebase';
    import { goto } from '$app/navigation';
    import { AppBar, Avatar } from '@skeletonlabs/skeleton';
  
    let user = null;
    let error = null;
  
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
  
    async function handleSignIn() {
      try {
        error = null;
        console.log("Attempting to sign in with Google...");
        await signInWithGoogle();
        console.log("Sign in successful");
      } catch (err) {
        console.error('Error signing in with Google', err);
        error = err.message;
        if (err.code === 'auth/unauthorized-domain') {
          console.log('Current domain:', window.location.hostname);
          console.log('Expected domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
        }
      }
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