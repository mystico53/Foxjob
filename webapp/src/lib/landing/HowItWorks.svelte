<!-- HowItWorks.svelte -->
<script>
	const steps = [
		{
			number: 1,
			title: 'Set up',
			description: 'Upload your resume and install our Chrome extension (takes 32 secs).'
		},
		{
			number: 2,
			title: 'Scan away!',
			description: 'Analyse any job description with a buttonpress, no more reading.'
		},
		{
			number: 3,
			title: 'Your score',
			description: 'Only three out of 25 jobs are a match, focus on those.'
		}
	];
</script>

<div class="bg-tertiary-300 container mx-auto px-4 py-16">
	<h2 class="h2 mb-12 py-8 text-center font-bold">How we match you</h2>

	<div class="mb-12 grid grid-cols-1 gap-8 px-8 md:grid-cols-3">
		{#each steps as step}
			<div class="flex flex-col items-start px-8">
				<div class="mb-4 flex items-center gap-4">
					<iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
					<h3 class="font-base">
						<span class="font-semibold">Step {step.number}: </span>
						<span class="font-medium">{step.title}</span>
					</h3>
				</div>
				<p class="text-base">{step.description}</p>
			</div>
		{/each}
	</div>

	<!-- Demo/Screenshot Area -->
	<div class="card bg-tertiary-700 rounded-lg p-4" style="height: 400px;">
		<!-- Placeholder for demo/screenshot -->
		<div class="text-surface-600 flex h-full w-full items-center justify-center">
			<p>Demo Area / Screenshot</p>
		</div>
	</div>
</div>
