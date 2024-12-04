<script>
	import { goto } from '$app/navigation';
	import ConsentDialog from '$lib/landing/ConsentDialog.svelte';

	let showConsentDialog = false;

	function handleStartJobMatching() {
		showConsentDialog = true;
	}

	function handleDialogClose() {
		showConsentDialog = false;
	}

	async function handleSignInSuccess() {
		showConsentDialog = false;
		await goto('/list');
	}
</script>

<div class="card w-full bg-white px-4 py-16">
	<div class="container mx-auto max-w-3xl text-center">
		<h2 class="mb-4 text-4xl font-bold text-slate-900">Start finding jobs based on your skills.</h2>

		<p class="mb-8 text-lg text-slate-600">Use Foxjob to focus on jobs that matter.</p>

		<button
			type="button"
			class="btn px-4 font-bold text-white shadow-lg shadow-[#DC3701]/20 transition-all hover:-translate-y-0.5 hover:brightness-110"
			style="background-color: #DC3701; border-radius: 0.250rem;"
			on:click={handleStartJobMatching}
		>
			Upload your resume
		</button>
	</div>
</div>

{#if showConsentDialog}
	<ConsentDialog onClose={handleDialogClose} onSuccess={handleSignInSuccess} />
{/if}

<style>
	/* Add a subtle shadow effect to the container */
	.container {
		filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07));
	}

	/* Optional: Add a glow effect to the button on hover */
	.btn:hover {
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
	}
</style>
