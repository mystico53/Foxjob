<script>
	import { Accordion, AccordionItem, ProgressBar } from '@skeletonlabs/skeleton';
	export let job = {};

	// Sort match details by score (highest first)
	$: matchDetails = (job.match?.match_details || []).sort(
		(a, b) => b.match_score_percent - a.match_score_percent
	);
</script>

<!-- Match Results Section -->
<h1 class="h2 mb-8 font-bold">Detailed Analysis</h1>

<!-- Match Details Section -->
<h3 class="h5 mb-4 mt-4 font-bold">Match Requirements</h3>
{#if matchDetails.length > 0}
	<Accordion>
		{#each matchDetails as detail}
			<AccordionItem class="mb-2">
				<svelte:fragment slot="summary">
					<div class="flex w-full items-center gap-4">
						<div class="flex-1">{detail.requirement}</div>
						<div class="flex w-64 items-center gap-4">
							<div class="w-64">
								<ProgressBar
									value={Math.round(detail.match_score_percent)}
									max={100}
									track="bg-surface-800/30"
									meter="!bg-gradient-to-r from-[#FF9C00] to-[#DC3701]"
								/>
							</div>
						</div>
					</div>
				</svelte:fragment>
				<svelte:fragment slot="content">
					<div class="space-y-4 rounded-lg border border-surface-300 bg-surface-100 p-4">
						<div>
							<span class="font-semibold">Match Score: {detail.match_score_percent}%</span>
						</div>
						<div>
							<span class="font-semibold">Evidence:</span>
							<p class="mt-1">{detail.evidence}</p>
						</div>
					</div>
				</svelte:fragment>
			</AccordionItem>
		{/each}
	</Accordion>
{:else}
	<p class="text-surface-600-300-token">No match details available</p>
{/if}

<!-- For legacy compatibility, include the original sections if data exists -->
{#if job.SkillAssessment?.DomainExpertise || job.SkillAssessment?.Hardskills || job.matchResult?.keySkills?.length > 0}
	<h3 class="h5 mb-4 mt-6 font-bold">Legacy Assessment</h3>

	<!-- Domain Expertise -->
	{#if job.SkillAssessment?.DomainExpertise}
		<h4 class="h6 mb-2 font-bold">Domain Expertise</h4>
		<Accordion>
			<AccordionItem>
				<svelte:fragment slot="summary">
					<div class="flex w-full items-center gap-4">
						<div class="flex-1">{job.SkillAssessment.DomainExpertise.name || 'N/A'}</div>
						<div class="flex w-64 items-center gap-4">
							<div class="w-64">
								<ProgressBar
									value={Math.round(job.SkillAssessment.DomainExpertise.score || 0)}
									max={100}
									track="bg-surface-800/30"
									meter="!bg-gradient-to-r from-[#FF9C00] to-[#DC3701]"
								/>
							</div>
						</div>
					</div>
				</svelte:fragment>
				<svelte:fragment slot="content">
					<div class="space-y-4">
						<div>
							<span class="font-semibold">What is needed</span>
							<p class="mt-1">
								{job.SkillAssessment.DomainExpertise.assessment || 'No assessment available'}
							</p>
						</div>
						<div>
							<span class="font-semibold">Assessment</span>
							<p class="mt-1">
								{job.SkillAssessment.DomainExpertise.summary || 'No summary available'}
							</p>
						</div>
					</div>
				</svelte:fragment>
			</AccordionItem>
		</Accordion>
	{/if}

	<!-- Hard Skills -->
	{#if job.SkillAssessment?.Hardskills}
		<h4 class="h6 mb-2 mt-4 font-bold">Hard Skills</h4>
		<Accordion>
			{#each Object.entries(job.SkillAssessment.Hardskills || {})
				.filter(([key]) => key.startsWith('HS'))
				.map(([key, value]) => ({ key, ...value }))
				.sort((a, b) => (b.score || 0) - (a.score || 0)) as skill}
				<AccordionItem class="mb-2">
					<svelte:fragment slot="summary">
						<div class="flex w-full items-center gap-4">
							<div class="flex-1">{skill.name}</div>
							<div class="flex w-64 items-center gap-4">
								<div class="w-64">
									<ProgressBar
										value={Math.round(skill.score || 0)}
										max={100}
										track="bg-surface-800/30"
										meter="!bg-gradient-to-r from-[#FF9C00] to-[#DC3701]"
									/>
								</div>
							</div>
						</div>
					</svelte:fragment>
					<svelte:fragment slot="content">
						<div class="space-y-4 rounded-lg border border-surface-300 bg-surface-100 p-4">
							<div>
								<span class="font-semibold">Description:</span>
								<p class="mt-1">{skill.description || 'N/A'}</p>
							</div>
							<div>
								<span class="font-semibold">Quote from Resume:</span>
								<p class="mt-1 italic">{skill.assessment || 'No assessment available'}</p>
							</div>
						</div>
					</svelte:fragment>
				</AccordionItem>
			{/each}
		</Accordion>
	{/if}

	<!-- Initial assessment -->
	{#if job.matchResult?.keySkills?.length > 0}
		<h4 class="h6 mb-2 mt-4 font-bold">Initial assessment</h4>
		<Accordion>
			{#each job.matchResult.keySkills.sort((a, b) => b.score - a.score) as skill}
				<AccordionItem>
					<svelte:fragment slot="summary">
						<div class="flex w-full items-center gap-4">
							<div class="flex-1">{skill.skill}</div>
							<div class="flex w-64 items-center gap-4">
								<div class="w-64">
									<ProgressBar
										value={Math.round(skill.score)}
										max={100}
										track="bg-surface-800/30"
										meter="!bg-gradient-to-r from-[#FF9C00] to-[#DC3701]"
									/>
								</div>
							</div>
						</div>
					</svelte:fragment>
					<svelte:fragment slot="content">
						<div class="space-y-4">
							<div>
								<span class="font-semibold">Assessment</span>
								<p class="mt-1">{skill.assessment || 'No assessment available'}</p>
							</div>
						</div>
					</svelte:fragment>
				</AccordionItem>
			{/each}
		</Accordion>
	{/if}
{/if}
