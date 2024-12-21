<script>
    import { Accordion, AccordionItem, ProgressBar } from '@skeletonlabs/skeleton';
    export let job = {};
</script>

<!-- Match Results Table -->
<table class="table-hover table">
    <thead>
        <tr>
            <th>Requirement</th>
            <th>Score</th>
            <th>Your Assessment</th>
        </tr>
    </thead>
    <tbody>
        {#each job.matchResult.keySkills as skill}
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
    <p class="text-xs font-color-grey">Job-ID: {job.id || 'N/A'}</p>
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
<div class="card p-4">
    <h3 class="h5 mb-4">Hard Skills Assessment</h3>
    {#if job.SkillAssessment.Hardskills.hardSkillScore}
        <div class="mt-4">
            <span class="font-bold">Overall Hard Skills Score:</span>
            <p class="mt-2">{job.SkillAssessment.Hardskills.hardSkillScore.totalScore || 0}%</p>
            <span class="font-bold">Summary:</span>
            <p class="mt-2">
                {job.SkillAssessment.Hardskills.hardSkillScore.summary || 'No summary available'}
            </p>
        </div>
    {/if}
    {#if job.SkillAssessment.Hardskills}
        <Accordion>
            {#each ['HS1', 'HS2', 'HS3', 'HS4', 'HS5'] as key}
                {#if job.SkillAssessment.Hardskills[key]}
                    <AccordionItem>
                        <svelte:fragment slot="summary">
                            {job.SkillAssessment.Hardskills[key].name} ({job.SkillAssessment.Hardskills[key].score || 0}%)
                        </svelte:fragment>
                        <svelte:fragment slot="content">
                            <div class="space-y-4">
                                <div>
                                    <span class="font-semibold">Description:</span>
                                    <p class="mt-1">{job.SkillAssessment.Hardskills[key].description || 'N/A'}</p>
                                </div>
                                <div>
                                    <span class="font-semibold">Required:</span>
                                    <p class="mt-1">
                                        {#if job.SkillAssessment.Hardskills[key].description}
                                            {job.SkillAssessment.Hardskills[key].description.includes('(required)') ? 'Required' : 'Preferred'}
                                        {:else}
                                            N/A
                                        {/if}
                                    </p>
                                </div>
                                <div>
                                    <span class="font-semibold">Assessment:</span>
                                    <p class="mt-1">
                                        {job.SkillAssessment.Hardskills[key].assessment || 'No assessment available'}
                                    </p>
                                </div>
                            </div>
                        </svelte:fragment>
                    </AccordionItem>
                {/if}
            {/each}
        </Accordion>
    {/if}
</div>