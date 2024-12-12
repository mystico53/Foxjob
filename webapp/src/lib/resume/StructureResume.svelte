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
        if (!user) {
            error = 'Please login first';
            return;
        }
        
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
                throw new Error(await response.text() || 'Failed to fetch resume summary');
            }

            const data = await response.json();
            // Ensure summary has all required properties with defaults
            summary = {
                summary: data.summary?.summary || '',
                experience: data.summary?.experience || [],
                education: data.summary?.education || [],
                remainingText: data.summary?.remainingText || ''
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
                <div class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]" role="status">
                    <span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
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

                {#if summary.experience?.length > 0}
                    <div class="card p-4 variant-ghost-surface">
                        <h3 class="h3 mb-2">Work Experience</h3>
                        {#each summary.experience as company}
                            <div class="mb-4 p-4 variant-ghost-surface">
                                <h4 class="h4 mb-2">{company.companyName}</h4>
                                {#each company.positions || [] as position}
                                    <div class="ml-4 mb-3">
                                        <div class="flex justify-between items-center">
                                            <h5 class="h5">{position.title}</h5>
                                            <span class="text-sm">{position.dateRange}</span>
                                        </div>
                                        <ul class="list mt-2">
                                            {#each position.bullets || [] as bullet}
                                                <li class="py-1">{bullet}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if summary.education?.length > 0}
                    <div class="card p-4 variant-ghost-surface">
                        <h3 class="h3 mb-2">Education</h3>
                        {#each summary.education as edu}
                            <div class="mb-4">
                                <div class="flex justify-between items-center">
                                    <h4 class="h4">{edu.school}</h4>
                                    <span class="text-sm">{edu.dateRange}</span>
                                </div>
                                <p class="mt-1">{edu.degree}</p>
                                {#if edu.details?.length > 0}
                                    <ul class="list mt-2">
                                        {#each edu.details as detail}
                                            <li class="py-1">{detail}</li>
                                        {/each}
                                    </ul>
                                {/if}
                            </div>
                        {/each}
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