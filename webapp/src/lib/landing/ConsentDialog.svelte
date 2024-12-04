<script>
	import { goto } from '$app/navigation';
	import { signInWithGoogle } from '$lib/firebase';
	import { db } from '$lib/firebase';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { onMount } from 'svelte';

	export let onClose;
	export let onSuccess = undefined; // Optional success callback

	let hasAcceptedTerms = false;
	let error = null;
	let isLoading = false;
	let hasExistingConsent = false;

	onMount(async () => {
		isLoading = true;
		try {
			// Check if user is already signed in
			const currentUser = await signInWithGoogle.currentUser;

			if (currentUser) {
				const userRef = doc(db, 'users', currentUser.uid);
				const userDoc = await getDoc(userRef);

				if (userDoc.exists() && userDoc.data().termsAccepted) {
					hasExistingConsent = true;
					if (onSuccess) await onSuccess(currentUser);
					onClose(true);
				}
			}
		} catch (err) {
			console.error('Error checking consent:', err);
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

			// Store consent in Firestore
			const userRef = doc(db, 'users', user.uid);
			await setDoc(
				userRef,
				{
					displayName: user.displayName,
					email: user.email,
					termsAccepted: true,
					termsAcceptedAt: new Date().toISOString(),
					privacyPolicyAccepted: true,
					privacyPolicyAcceptedAt: new Date().toISOString()
				},
				{ merge: true }
			);

			if (onSuccess) await onSuccess(user);
			onClose(true);
		} catch (err) {
			console.error('Error:', err);
			error = err.message;
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
