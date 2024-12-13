<script>
	import { goto } from '$app/navigation';
	import { signInWithGoogle } from '$lib/firebase';
	import { db } from '$lib/firebase';
	import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
	import { onMount } from 'svelte';
  
	export let onClose;
	export let onSuccess = undefined;
  
	let hasAcceptedTerms = false;
	let error = null;
	let isLoading = false;
	let hasExistingConsent = false;
  
	onMount(async () => {
	  isLoading = true;
	  try {
		// Sign in with Google
		const user = await signInWithGoogle();
  
		if (user) {
		  const userId = user.uid; // Use user.uid as the document ID
		  const googleSubId = user.providerData[0].uid; // Store this as a field
  
		  console.log("User authenticated, user ID:", userId);
  
		  // Reference to the user's document using user.uid
		  const userRef = doc(db, 'users', userId);
		  let userDoc = await getDoc(userRef);
  
		  if (!userDoc.exists()) {
			console.log("User document does not exist. Creating a new one.");
			// Create a new user document with googleSubId and other details
			await setDoc(userRef, {
			  googleSubId: googleSubId,
			  displayName: user.displayName,
			  email: user.email,
			});
			userDoc = await getDoc(userRef);
		  } else {
			// Update user document with googleSubId if not present
			if (!userDoc.data().googleSubId) {
			  await setDoc(userRef, { googleSubId: googleSubId }, { merge: true });
			  userDoc = await getDoc(userRef);
			}
		  }
  
		  console.log("Checking for user consent in document:", userId);
  
		  // Check consent
		  if (userDoc.exists() && userDoc.data().termsAccepted) {
			hasExistingConsent = true;
			if (onSuccess) await onSuccess(user);
			onClose(true);
		  }
		}
	  } catch (err) {
		console.error('Error checking consent:', err);
		error = 'An error occurred while checking consent. Please try again.';
	  } finally {
		isLoading = false;
	  }
	});
  
	async function handleConsent() {
	  if (!hasAcceptedTerms) {
		error = 'Please accept the Terms of Service and Privacy Policy to continue';
		return;
	  }
  
	  isLoading = true;
	  error = null;
  
	  try {
		const user = await signInWithGoogle();
		const userId = user.uid;
		const googleSubId = user.providerData[0].uid;
  
		console.log('Using user.uid:', userId);
  
		const userRef = doc(db, 'users', userId);
		const userDoc = await getDoc(userRef);
  
		console.log('Checking user document:', `users/${userId}`);
		console.log('User doc exists:', userDoc.exists());
  
		// Check for pending data
		const pendingSnapshot = await getDocs(
		  query(
			collection(db, 'pending_users'),
			where('googleSubId', '==', googleSubId)
		  )
		);
  
		let pendingData = {};
		if (!pendingSnapshot.empty) {
		  console.log('Found pending data, migrating...');
		  const pendingDoc = pendingSnapshot.docs[0];
		  pendingData = pendingDoc.data();
  
		  if (pendingData.processedData && pendingData.processedData.length > 0) {
			pendingData.processedData = pendingData.processedData.map(ref => ({
			  ...ref,
			  migratedAt: new Date().toISOString()
			}));
		  }
  
		  await deleteDoc(doc(db, 'pending_users', pendingDoc.id));
		}
  
		if (userDoc.exists()) {
		  // Update existing user document with consent fields
		  await setDoc(
			userRef,
			{
			  ...userDoc.data(),
			  ...pendingData,
			  displayName: user.displayName,
			  email: user.email,
			  googleSubId: googleSubId, // Ensure googleSubId is set
			  termsAccepted: true,
			  termsAcceptedAt: new Date().toISOString(),
			  privacyPolicyAccepted: true,
			  privacyPolicyAcceptedAt: new Date().toISOString()
			},
			{ merge: true }
		  );
		} else {
		  // Create a new user document with consent fields
		  await setDoc(
			userRef,
			{
			  ...pendingData,
			  displayName: user.displayName,
			  email: user.email,
			  googleSubId: googleSubId,
			  termsAccepted: true,
			  termsAcceptedAt: new Date().toISOString(),
			  privacyPolicyAccepted: true,
			  privacyPolicyAcceptedAt: new Date().toISOString()
			},
			{ merge: true }
		  );
		}
  
		if (onSuccess) await onSuccess(user);
		onClose(true);
	  } catch (err) {
		console.error('Error:', err);
		error = err.message || 'An unexpected error occurred.';
	  } finally {
		isLoading = false;
	  }
	}
  
	async function handleTermsClick(e) {
	  e.preventDefault();
	  await goto('/terms');
	}
  
	async function handlePrivacyClick(e) {
	  e.preventDefault();
	  await goto('/privacy');
	}
  </script>
  
  {#if !isLoading && !hasExistingConsent}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
	  <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
		<h2 class="mb-4 text-xl font-bold">Your privacy matters to us</h2>
  
		<p class="mb-4">Before you start using our service, please review and accept our terms:</p>
  
		<div class="mb-6">
		  <label class="flex items-start">
			<input
			  type="checkbox"
			  bind:checked={hasAcceptedTerms}
			  class="mt-1 h-4 w-4 rounded border-gray-300"
			/>
			<span class="ml-2 text-sm">
			  I accept the <a
				href="/terms"
				on:click={handleTermsClick}
				class="text-[#DC3701] hover:underline">Terms of Service</a
			  >
			  and
			  <a href="/privacy" on:click={handlePrivacyClick} class="text-[#DC3701] hover:underline"
				>Privacy Policy</a
			  >
			</span>
		  </label>
		</div>
  
		{#if error}
		  <div class="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">
			{error}
		  </div>
		{/if}
  
		<div class="flex justify-end gap-3">
		  <button
			on:click={() => onClose(false)}
			class="px-4 py-2 text-gray-600 hover:text-gray-800"
			disabled={isLoading}
		  >
			Cancel
		  </button>
		  <button
			on:click={handleConsent}
			disabled={!hasAcceptedTerms || isLoading}
			class="rounded bg-[#DC3701] px-4 py-2 font-bold text-white shadow-lg shadow-[#DC3701]/20 transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100"
		  >
			{#if isLoading}
			  Loading...
			{:else}
			  Continue to Foxjob
			{/if}
		  </button>
		</div>
	  </div>
	</div>
  {/if}
  