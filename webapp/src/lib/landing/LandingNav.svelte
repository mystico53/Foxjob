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
		  console.log("User email:", user.email);
		  console.log("User display name:", user.displayName);
		  console.log("Redirecting to /list");
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
		// The user will be redirected to /list by the onAuthStateChanged listener
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
  
	function refreshToken() {
	  if (auth.currentUser) {
		auth.currentUser.getIdToken(true)
		  .then(() => {
			console.log("Token refreshed");
		  })
		  .catch((error) => {
			console.error("Error refreshing token:", error);
		  });
	  } else {
		console.log("No user to refresh token");
	  }
	}
  </script>

<AppBar
    background="bg-white"
    class="border-b-2 px-4 py-2"
    style="border-color: rgb(107, 114, 128);"
    gridColumns="grid-cols-3"
    slotDefault="place-self-center"
    slotTrail="place-self-end"
>
    <svelte:fragment slot="trail">
        <div class="flex items-center">
            {#if user}
            <button class="login-button" on:click={handleSignOut}>Sign Out</button>
            {:else}
            <button class="login-button" on:click={handleSignIn}>Login</button>
            {/if}
        </div>
    </svelte:fragment>
</AppBar>