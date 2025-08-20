<script>
	import { goto } from '$app/navigation';
	import { signInWithGoogle } from '$lib/firebase';

	let isLoading = false;
	let error = null;

	async function handleStartJobMatching() {
		isLoading = true;
		error = null;
		try {
			await signInWithGoogle();
			// Auth state listener in LandingNav will handle the redirect
		} catch (err) {
			console.error(`[${new Date().toISOString()}] Error starting job matching:`, err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="card w-full bg-white px-4 py-16">
	<div class="container mx-auto max-w-3xl text-center">
		<h2 class="mb-4 text-4xl font-bold text-slate-900">Let your agent do the lifting</h2>

		<p class="mb-8 text-lg text-slate-600">Start finding jobs based on your skills</p>

		<button
			type="button"
			class="btn px-4 font-bold text-white shadow-lg shadow-[#DC3701]/20 transition-all hover:-translate-y-0.5 hover:brightness-110"
			style="background-color: #DC3701; border-radius: 0.250rem;"
			on:click={handleStartJobMatching}
			disabled={isLoading}
		>
			{#if isLoading}
				Loading...
			{:else}
				Create Your Job Agent
			{/if}
		</button>
		{#if error}
			<div class="mt-4 text-sm text-red-600">{error}</div>
		{/if}
	</div>
</div>

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
