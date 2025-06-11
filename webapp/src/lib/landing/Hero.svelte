<!-- Hero.svelte -->
<script>
	import LandingNav from '$lib/landing/LandingNav.svelte';
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

<div class="gradient-background">
	<div class="container mx-auto max-w-6xl px-4 pb-0 sm:pb-16">
		<LandingNav />
		<div class="grid grid-cols-1 gap-8 pt-8 md:pl-14 md:pt-12 md:grid-cols-2">
			<!-- Right Column: Image (on mobile, appears first) -->
			<div class="flex justify-center order-1 md:order-2">
				<img src="/images/fox-hero.png" alt="Fox hero illustration" class="h-32 w-32 md:h-72 md:w-72 rounded-lg" />
			</div>

			<!-- Left Column: Content (on mobile, appears second) -->
			<div class="space-y-6 order-2 md:order-1">
				<h1 class="h1 font-bold" style="line-height: 1.3;">Stop reading <br> job descriptions</h1>
				<h2 class="h4 pb-20 font-normal">An AI agent that knows you personally finds jobs that actually fit.</h2>
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
					<div class="text-red-600 text-sm mt-2">{error}</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Protest+Riot&display=swap');

	.gradient-background {
		background: linear-gradient(
			to top,
			rgba(220, 55, 1, 0.15) 0%,
			rgba(255, 156, 0, 0.15) 54%,
			rgba(66, 153, 225, 0.15) 100%
		);
		width: 100vw;
		position: relative;
		left: 50%;
		transform: translateX(-50%);
	}

	@media (max-width: 640px) {
		.gradient-background {
			min-height: 98vh;
		}
		.space-y-6 h1 {
			margin-top: 1.5rem;
		}
		.space-y-6 h2 {
			padding-top: 1.25rem;
			padding-bottom: 0.75rem;
		}
		.space-y-6 button {
			margin-bottom: 0.5rem;
		}
		.space-y-6 {
			text-align: center;
		}
	}

	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
