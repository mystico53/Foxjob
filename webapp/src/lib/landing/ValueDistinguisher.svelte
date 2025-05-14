<script>
	const features = [
		{
			icon: 'ph:hand-heart-light',
			title: 'The search happens without you',
			description: 'Your agent scans up to 50 jobs daily while you live your life.'
		},
		{
			icon: 'ion:flash-outline',
			title: 'Your resume does the talking',
			description: 'Your agent understands your skills, not just keywords.'
		},
		{
			icon: 'qlementine-icons:jump-over-16',
			title: 'Only the good stuff',
			description: 'Your agent delivers only jobs worth your attention to your inbox'
		}
	];
</script>

<div class="pb-22 container mx-auto px-4 py-16">
	<h2 class="h2 mb-12 py-8 text-center font-bold">Create an AI agent to handle the boring parts</h2>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each features as feature}
			<div
				class="card card-hover flex flex-col items-center rounded-lg bg-white p-12 text-center shadow-lg"
			>
				<iconify-icon icon={feature.icon} class="text-6xl"></iconify-icon>
				<h3 class="font-base min-h-[3rem] py-4 font-bold">{feature.title}</h3>
				<p class="text-gray-700">{feature.description}</p>
			</div>
		{/each}
	</div>
</div>

<style>
	:global(.card-hover) {
		transition: transform 0.2s ease-in-out;
	}

	:global(.card-hover:hover) {
		transform: translateY(-4px);
	}
</style>