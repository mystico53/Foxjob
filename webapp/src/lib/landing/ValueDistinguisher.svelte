<script>
	const features = [
		{
			icon: 'material-symbols-light:mark-unread-chat-alt-outline',
			title: 'Receive a personalized compatibility score for every job',
			description: ''
		},
		{
			icon: 'game-icons:direction-signs',
			title: 'Your strengths and weaknesses assessed before you apply',
			description: ''
		},
		{
			icon: 'bxs:star-half',
			title: 'Skip mismatches and free up time to focus your job search',
			description: ''
		}
	];
</script>

<div class="pb-22 container mx-auto px-4 py-16">
	<h2 class="h2 mb-12 py-8 text-center font-bold">
		Foxjob matches your resume with job descriptions
	</h2>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each features as feature}
			<div
				class="card card-hover flex flex-col items-center rounded-lg bg-white p-12 text-center shadow-lg"
			>
				<iconify-icon icon={feature.icon} class="text-6xl"></iconify-icon>
				<h3 class="font-base mb-4 min-h-[3rem] py-8 font-bold">{feature.title}</h3>
				<p class="text-base">{feature.description}</p>
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
