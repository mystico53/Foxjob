<!-- Hero.svelte -->
<script>
	import LandingNav from '$lib/landing/LandingNav.svelte';
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

<div class="gradient-background">
	<div class="container px-4 pb-16">
		<LandingNav />
		<div class="grid grid-cols-1 gap-8 pl-14 pt-12 md:grid-cols-2">
			<!-- Left Column: Content -->
			<div class="space-y-6">
				<h1 class="h1 font-bold" style="line-height: 1.3;">Find jobs that fit you</h1>
				<h2 class="h4 pb-20 font-normal">Foxjob matches your resume with job descriptions</h2>
				<button
					type="button"
					class="btn px-4 font-bold text-white shadow-lg shadow-[#DC3701]/20 transition-all hover:-translate-y-0.5 hover:brightness-110"
					style="background-color: #DC3701; border-radius: 0.250rem;"
					on:click={handleStartJobMatching}
				>
					Upload your Resume
				</button>
			</div>

			<!-- Right Column: Image -->
			<div class="flex justify-center">
				<img src="/images/fox-hero.png" alt="Fox hero illustration" class="h-72 w-72 rounded-lg" />
			</div>
		</div>
	</div>
</div>

{#if showConsentDialog}
	<ConsentDialog onClose={handleDialogClose} onSuccess={handleSignInSuccess} />
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Protest+Riot&display=swap');

	.gradient-background {
		background: linear-gradient(
			to top,
			rgba(220, 55, 1, 0.15) 0%,
			rgba(255, 156, 0, 0.15) 54%,
			rgba(66, 153, 225, 0.15) 100%
		);
		width: 100%;
	}

	:global(body) {
		margin: 0;
		padding: 0;
	}

	.foxjob-title {
		font-family: 'Protest Riot', sans-serif;
		background: linear-gradient(to right, #fd5440 0%, #ff9c00 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		font-size: 40px;
		line-height: 1;
		letter-spacing: 0.02em;
	}
</style>
