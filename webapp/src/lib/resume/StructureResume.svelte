<!-- src/routes/resume-summary/+page.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    import { getCloudFunctionUrl } from '$lib/config/environment.config.js';

    let user = null;
    let unsubscribeAuth = null;
    let loading = false;
    let error = null;
    let summary = null;

    async function fetchResumeSummary() {
        if (!user || loading) return;
        
        loading = true;
        error = null;
        
        try {
            const response = await fetch('http://127.0.0.1:5001/jobille-45494/us-central1/structureResume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch resume summary');
            }

            const data = await response.json();
            summary = data.summary;
        } catch (e) {
            error = e.message;
            console.error('Error fetching resume summary:', e);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            if (user) {
                fetchResumeSummary();
            }
        });
    });

    onDestroy(() => {
        if (unsubscribeAuth) unsubscribeAuth();
    });
</script>

<div class="container mx-auto p-4">
    <div class="card p-4 mb-4 variant-surface">
        <button 
            class="btn variant-filled-primary w-full"
            on:click={fetchResumeSummary}
            disabled={loading}
        >
            {#if loading}
                <ProgressRadial stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" width="w-6"/>
            {:else}
                Analyze Resume
            {/if}
        </button>

        {#if error}
            <div class="mt-4 alert variant-filled-error">
                <p>{error}</p>
            </div>
        {/if}

        {#if summary}
            <div class="mt-4 space-y-4">
                <div class="card p-4 variant-ghost-surface">
                    <h3 class="h3 mb-2">Professional Summary</h3>
                    <p>{summary.professionalSummary}</p>
                </div>

                <div class="card p-4 variant-ghost-surface">
                    <h3 class="h3 mb-2">Key Skills</h3>
                    <div class="flex flex-wrap gap-2">
                        {#each summary.keySkills as skill}
                            <span class="chip variant-filled">{skill}</span>
                        {/each}
                    </div>
                </div>

                <div class="card p-4 variant-ghost-surface">
                    <h3 class="h3 mb-2">Experience Highlights</h3>
                    <ul class="list">
                        {#each summary.experienceHighlights as highlight}
                            <li class="py-2">{highlight}</li>
                        {/each}
                    </ul>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="card p-4 variant-ghost-surface">
                        <h4 class="h4 mb-2">Years of Experience</h4>
                        <p>{summary.yearsOfExperience}</p>
                    </div>
                    <div class="card p-4 variant-ghost-surface">
                        <h4 class="h4 mb-2">Recommended Roles</h4>
                        <div class="flex flex-wrap gap-2">
                            {#each summary.recommendedRoles as role}
                                <span class="chip variant-filled-primary">{role}</span>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {:else if !loading}
            <div class="mt-4 card p-4 variant-ghost-surface">
                <p class="text-center">No resume analysis found</p>
            </div>
        {/if}
    </div>
</div>