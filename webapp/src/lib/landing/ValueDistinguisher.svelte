<script>
	const features = [
		{
			icon: 'ph:hand-heart-light',
			title: 'Receive a personalized compatibility score for every job'
		},
		{
			icon: 'ion:flash-outline',
			title: 'Your strengths and weaknesses explained before you apply'
		},
		{
			icon: 'qlementine-icons:jump-over-16',
			title: 'Skip mismatches'
		}
	];
</script>

<div class="pb-22 container mx-auto px-4 py-16">
	<h2 class="h2 mb-12 py-8 text-center font-bold">The GenAI filter for your jobsearch</h2>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each features as feature}
			<div
				class="card card-hover flex flex-col items-center rounded-lg bg-white p-12 text-center shadow-lg"
			>
				<iconify-icon icon={feature.icon} class="text-6xl"></iconify-icon>
				<h3 class="font-base min-h-[3rem] py-4 font-bold">{feature.title}</h3>
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
