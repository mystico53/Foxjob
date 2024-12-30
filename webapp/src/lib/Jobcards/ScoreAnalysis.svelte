<script>
    import { Accordion, AccordionItem, ProgressBar } from '@skeletonlabs/skeleton';
    export let job = {};

       // Sort initial assessment skills
    $: sortedSkills = job.matchResult?.keySkills?.sort((a, b) => b.score - a.score) || [];
    
    // Sort hard skills
    $: sortedHardSkills = Object.entries(job.SkillAssessment?.Hardskills || {})
        .filter(([key]) => key.startsWith('HS'))
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));
</script>

<!-- Match Results Section -->
<h1 class="h2 mb-8 font-bold">Detailed Analysis</h1>
<!-- Hard Skills Section -->

    <h3 class="h5 mb-4 mt-4 font-bold">Domain Expertise</h3>
    {#if job.SkillAssessment.DomainExpertise}
        <Accordion>
            <AccordionItem>
                <svelte:fragment slot="summary">
                    <div class="flex items-center gap-4 w-full">
                        <div class="flex-1">{job.SkillAssessment.DomainExpertise.name || 'N/A'}</div>
                        <div class="flex items-center gap-4 w-64">
                            
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
    <h3 class="h5 mb-4 mt-4 font-bold">Hard Skills</h3>
    {#if job.SkillAssessment?.Hardskills}
    <Accordion>
        {#each sortedHardSkills as skill}
            <AccordionItem class="mb-2">
                <svelte:fragment slot="summary">
                    <div class="flex items-center gap-4 w-full">
                        <div class="flex-1">{skill.name}</div>
                        <div class="flex items-center gap-4 w-64">
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
                    <div class="rounded-lg space-y-4 p-4 bg-surface-100 border border-surface-300">
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

<h3 class="h5 mb-4 mt-4 font-bold">Initial assessment</h3>
<Accordion>
    {#each sortedSkills as skill}
        <AccordionItem>
            <svelte:fragment slot="summary">
                <div class="flex items-center gap-4 w-full">
                    <div class="flex-1">{skill.skill}</div>
                    <div class="flex items-center gap-4 w-64">
                        
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