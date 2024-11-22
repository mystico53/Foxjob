<!-- src/lib/utilities/JobsProcessing.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    import { getAuth } from 'firebase/auth';
    import { jobStore } from '$lib/stores/statusMonitoringStore.js';

    let filterStatus = 'all';
    let currentUserId = '';

    $: filteredJobs = $jobStore.jobs.filter(job => {
        if (filterStatus === 'all') return true;
        return job.generalData?.processingStatus === filterStatus;
    });

    function getStatusVariant(status) {
        switch (status?.toLowerCase()) {
            case 'processing': return 'variant-filled-primary';
            case 'completed': return 'variant-filled-success';
            case 'failed': return 'variant-filled-error';
            default: return 'variant-filled-surface';
        }
    }

    onMount(() => {
        const auth = getAuth();
        if (auth.currentUser) {
            currentUserId = auth.currentUser.uid;
            jobStore.init(currentUserId);
        }
    });

    onDestroy(() => {
        jobStore.cleanup();
    });
</script>

{#if $jobStore.loading}
    <div class="flex justify-center p-4">
        <ProgressRadial />
    </div>
{:else if $jobStore.error}
    <div class="alert variant-filled-error p-4">
        {$jobStore.error}
    </div>
{:else}
    <div class="container mx-auto p-4">
        <!-- Debug Info -->
        <div class="card variant-glass-surface p-4 mb-4">
            <h3 class="h3 mb-2">Debug Info</h3>
            <p>Total Jobs: {$jobStore.jobs.length}</p>
            <p>Filtered Jobs: {filteredJobs.length}</p>
            <p>Current Filter: {filterStatus}</p>
        </div>

        <!-- Status Filter -->
        <div class="flex gap-2 mb-4">
            <select
                class="select"
                bind:value={filterStatus}
            >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
            </select>
            
            <span class="badge variant-filled">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
            </span>
        </div>

        {#if filteredJobs.length === 0}
            <div class="card variant-ghost p-4 text-center">
                No jobs found for the selected filter.
            </div>
        {:else}
            <div class="table-container">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Job ID</th>
                            <th>Status</th>
                            <th>Processing</th>
                            <th>Has Summary</th>
                            <th>Has Score</th>
                            <th>URL</th>
                            <th>Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredJobs as job (job.id)}
                            <tr class={job.generalData?.processingStatus === 'processing' ? 'bg-primary-500/20' : ''}>
                                <td class="font-mono">{job.id}</td>
                                <td>
                                    <span class="badge variant-filled-surface">
                                        {job.generalData?.status || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge {getStatusVariant(job.generalData?.processingStatus)}">
                                        {job.generalData?.processingStatus || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge variant-filled-{job.summarized ? 'success' : 'error'}">
                                        {job.summarized ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge variant-filled-{job.Score ? 'success' : 'error'}">
                                        {job.Score ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td>
                                    {#if job.generalData?.url}
                                        <a href={job.generalData.url} target="_blank" rel="noopener" class="link">
                                            View
                                        </a>
                                    {:else}
                                        N/A
                                    {/if}
                                </td>
                                <td>
                                    {#if job.generalData?.timestamp}
                                        {job.generalData.timestamp.toDate().toLocaleString()}
                                    {:else}
                                        N/A
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
{/if}

<style>
    .table-container {
        overflow-x: auto;
    }
    
    th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        white-space: nowrap;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    tr:hover {
        background-color: rgb(var(--color-surface-500) / 0.1);
    }

    tr.bg-primary-500\/20:hover {
        background-color: rgb(var(--color-primary-500) / 0.25);
    }

    select {
        background-color: rgb(var(--color-surface-500) / 0.1);
        border: 1px solid rgb(var(--color-surface-500) / 0.2);
        border-radius: 0.25rem;
        padding: 0.5rem;
    }

    .link {
        color: rgb(var(--color-primary-500));
        text-decoration: none;
    }

    .link:hover {
        text-decoration: underline;
    }
</style>