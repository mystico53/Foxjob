<script>
	import { onMount } from 'svelte';
	import { auth, signInWithGoogle, signOutUser } from '$lib/firebase';
	import { goto } from '$app/navigation';
  
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
  
  <style>
	/* Import the font */
	@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap');
  
	/* Global styles */
	:global(body) {
	  margin: 0;
	  font-family: 'Quicksand', sans-serif;
	  background-color: #f5f5f5;
	  background-size: cover;
	  margin: 1rem;
	  color: #333;
	}
  
	/* Container */
	.container {
	  max-width: 1140px;
	  margin: 0 auto;
	  padding: 0 1rem;
	}
  
	/* Navigation Bar */
	nav {
	  display: flex;
	  justify-content: space-between;
	  align-items: center;
	  padding: 0rem 0;
	}
  
	.logo {
	  display: flex;
	  align-items: center;
	  font-weight: 700;
	  font-size: 1.75rem;
	  color: #333;
	  text-decoration: none;
	}
  
	.logo img {
	  width: 30px;
	  height: 30px;
	  margin-right: 0.75rem;
	}
  
	.login-button {
	  background-color: #000;
	  color: #fff;
	  padding: 0.75rem 1.5rem;
	  margin: 0.5rem 0rem;
	  border: none;
	  border-radius: 30px;
	  cursor: pointer;
	  font-weight: 600;
	  transition: transform 0.2s, box-shadow 0.2s;
	}
  
	.login-button:hover {
	  transform: scale(1.05);
	  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
  
	/* Hero Section */
	
	
	header {
	  display: grid;
	  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	  align-items: center;
	  gap: 2rem;
	  padding: 3rem 0;
	}
  
	.hero-text {
	  order: 1;
	}
  
	.hero-text h1 {
	  font-size: 3.5rem;
	  line-height: 1.2;
	  margin-bottom: 3.5rem;
	  margin-top: 5.5rem;
	  
	  letter-spacing: -0.5px;
	}

  
	.cta-container {
	display:inline;
	flex-direction: column;
	align-items: center;
	
	}

	.cta-button {
	background-color: #FFD600;
	color: #333;
	padding: 0.7rem 2.5rem;
	border: none;
	border-radius: 30px;
	cursor: pointer;
	font-weight: 600;
	font-size: 1.15rem;
	transition: transform 0.2s, box-shadow 0.2s;
	}

	.cta-button:hover {
	transform: scale(1.05);
	box-shadow: 0 6px 16px rgba(255, 214, 0, 0.4);
	}

	.terms {
		font-size: 0.775rem;
		color: #777;
		margin-top: 0.5rem;
		text-align: left;
	}
  
	.hero-image {
	  order: 2;
	  position: relative;
	}
  
	.hero-image img {
	  width: 100%;
	  height: auto;
	  object-fit: cover;
	}
  
	/* Value Distinguisher Section */

	footer {
    padding: 1rem 0;
  }

  footer .container {
    display: flex;
    justify-content: flex-end;
  }

  .privacy {
    font-size: 1rem;
    color: #000;
    text-decoration: none;
  }

  .privacy:hover {
    text-decoration: underline;
  }
  
  
	/* Error Message */
	.error-message {
	  color: red;
	  margin-top: 1rem;
	}
  
	@media (max-width: 767px) {
	  .hero-text, .hero-image {
		order: unset;
	  }
  
	  header {
		grid-template-columns: 1fr;
	  }
	}
  </style>
  
  <!-- Navigation Bar -->
  <nav class="container">
	<a href="https://jobille-45494.web.app/" class="logo">
	  <!-- Placeholder for logo image -->
	  <img src="/images/bee-icon.png" alt="Jobbee Logo">
	  JobBee
	</a>
	{#if user}
	  <button class="login-button" on:click={handleSignOut}>Sign Out</button>
	{:else}
	  <button class="login-button" on:click={handleSignIn}>Login</button>
	{/if}
  </nav>
  
  <!-- Hero Section -->
  <header class="container">
	<div class="hero-text">
	  <h1>Less looking, more finding</h1>
	  {#if user}
		<p>Welcome back, {user.displayName}!</p>
		<button class="cta-button" on:click={refreshToken}>Refresh Token</button>
	  {:else}
		
	  <div class="cta-container">
		<button class="cta-button" on:click={handleSignIn}>Request Early Access</button>
		<p class="terms">By signing up, you agree to our Terms of Service.</p>
	  </div>
	  {/if}
	  {#if error}
		<p class="error-message">{error}</p>
	  {/if}
	</div>
	<div class="hero-image">
	  
	  <img src="/images/dashboard-mockup.png" alt="JOBBEE Dashboard">
	</div>
  </header>

  <footer>
	<div class="container">
		<a class="privacy" href="/privacy" data-sveltekit-preload-data="off">
			Privacy Policy
		</a>
	</div>
</footer>

  