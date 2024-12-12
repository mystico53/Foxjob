<!-- src/routes/resume-summary/+page.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { getCloudFunctionUrl } from '$lib/config/environment.config.js';

    let user = null;
    let unsubscribeAuth = null;
    let loading = false;
    let error = null;
    let summary = null;

    async function fetchResumeSummary() {
        if (!user) {
            error = 'Please login first';
            return;
        }
        
        loading = true;
        error = null;
        
        try {
            const response = await fetch(getCloudFunctionUrl('structureResume'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid
                })
            });

            if (!response.ok) {
                throw new Error(await response.text() || 'Failed to fetch resume summary');
            }

            const data = await response.json();
            summary = {
                summary: data.structuredResume.summary || '',
                experience: data.structuredResume.companies || [],
                education: data.structuredResume.education || '',
                remainingText: data.structuredResume.other || ''
            };
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
        });
    });

    onDestroy(() => {
        if (unsubscribeAuth) unsubscribeAuth();
    });
</script>

<div class="container mx-auto p-4">
    <div class="card p-4 mb-4 variant-surface">
        <button 
            class="btn variant-filled-primary w-full relative"
            on:click={fetchResumeSummary}
            disabled={loading || !user}
        >
            {#if loading}
                
                <span class="sr-only">Loading...</span>
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
                {#if summary.summary}
                    <div class="card p-4 variant-ghost-surface">
                        <h3 class="h3 mb-2">Summary</h3>
                        <p>{summary.summary}</p>
                    </div>
                {/if}

                {#if summary.experience.length > 0}
                    <div class="card p-4 variant-ghost-surface">
                        <h3 class="h3 mb-2">Work Experience</h3>
                        {#each summary.experience as company}
                            <div class="mb-4 p-4 variant-ghost-surface">
                                <h4 class="h4 mb-2">{company.name}</h4>
                                {#each company.positions as position}
                                    <div class="ml-4 mb-3">
                                        <div class="flex justify-between items-center">
                                            <h5 class="h5">{position.title}</h5>
                                            <span class="text-sm">{position.dateRange || ''}</span>
                                        </div>
                                        <ul class="list mt-2">
                                            {#each position.bullets as bullet}
                                                <li class="py-1">{bullet}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if summary.education}
                    <div class="card p-4 variant-ghost-surface">
                        <h3 class="h3 mb-2">Education</h3>
                        <p>{summary.education}</p>
                    </div>
                {/if}

                {#if summary.remainingText}
                    <div class="card p-4 variant-ghost-surface">
                        <h3 class="h3 mb-2">Additional Information</h3>
                        <p class="whitespace-pre-wrap">{summary.remainingText}</p>
                    </div>
                {/if}
            </div>
        {:else if !loading}
            <div class="mt-4 card p-4 variant-ghost-surface">
                <p class="text-center">Click the button above to analyze your resume</p>
            </div>
        {/if}
    </div>
</div>
