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

<!-- Match Results Table -->
<h3 class="h5 mb-4">Results of initital assessment</h3>
<table class="table-hover table">
    <thead>
        <tr>
            <th>Requirement</th>
            <th>Score</th>
            <th>Your Assessment</th>
        </tr>
    </thead>
    <tbody>
        {#each sortedSkills as skill}  <!-- Changed from job.matchResult.keySkills to sortedSkills -->
            <tr>
                <td>{skill.skill}</td>
                <td>
                    <div class="flex items-center gap-4">
                        <div class="min-w-[2rem]">{Math.round(skill.score)}</div>
                        <div class="w-48">
                            <ProgressBar 
                                value={Math.round(skill.score)} 
                                max={100}
                                track="bg-surface-800/30"
                                meter="bg-primary-500"
                            />
                        </div>
                    </div>
                </td>
                <td>{skill.assessment}</td>
            </tr>
        {/each}
    </tbody>
</table>

<!-- Domain Expertise Section -->
<div class="card p-4">
    <h3 class="h5 mb-4">Domain Expertise Assessment</h3>
    {#if job.SkillAssessment.DomainExpertise}
        <table class="table-hover table">
            <thead>
                <tr>
                    <th>Area</th>
                    <th>Score</th>
                    <th>Importance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{job.SkillAssessment.DomainExpertise.name || 'N/A'}</td>
                    <td>{job.SkillAssessment.DomainExpertise.score || 0}%</td>
                    <td>{job.SkillAssessment.DomainExpertise.importance || 'N/A'}/5</td>
                </tr>
            </tbody>
        </table>
        <div class="mt-4 space-y-4">
            <div>
                <span class="font-bold">Assessment:</span>
                <p class="mt-2">
                    {job.SkillAssessment.DomainExpertise.assessment || 'No assessment available'}
                </p>
            </div>
            <div>
                <span class="font-bold">Summary:</span>
                <p class="mt-2">
                    {job.SkillAssessment.DomainExpertise.summary || 'No summary available'}
                </p>
            </div>
        </div>
    {/if}
</div>

<!-- Hard Skills Section -->
{#if job.SkillAssessment?.Hardskills}
    <Accordion>
        {#each sortedHardSkills as skill}
            <AccordionItem>
                <svelte:fragment slot="summary">
                    <div class="flex items-center gap-4 w-full">
                        <div class="flex-1">{skill.name}</div>
                        <div class="flex items-center gap-4 w-64">
                            <div class="min-w-[2rem]">{Math.round(skill.score || 0)}</div>
                            <div class="w-48">
                                <ProgressBar 
                                    value={Math.round(skill.score || 0)} 
                                    max={100}
                                    track="bg-surface-800/30"
                                    meter="bg-primary-500"
                                />
                            </div>
                        </div>
                    </div>
                </svelte:fragment>
                <svelte:fragment slot="content">
                    <div class="space-y-4">
                        <div>
                            <span class="font-semibold">Description:</span>
                            <p class="mt-1">{skill.description || 'N/A'}</p>
                        </div>
                        <div>
                            <span class="font-semibold">Required:</span>
                            <p class="mt-1">
                                {#if skill.description}
                                    {skill.description.includes('(required)') ? 'Required' : 'Preferred'}
                                {:else}
                                    N/A
                                {/if}
                            </p>
                        </div>
                        <div>
                            <span class="font-semibold">Assessment:</span>
                            <p class="mt-1">{skill.assessment || 'No assessment available'}</p>
                        </div>
                    </div>
                </svelte:fragment>
            </AccordionItem>
        {/each}
    </Accordion>
{/if}
<p class="text-xs font-color-grey">Job-ID: {job.id || 'N/A'}</p>