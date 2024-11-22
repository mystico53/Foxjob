<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { jobStore, loading, error } from '$lib/stores/jobStore';
    import { db } from '$lib/firebase';
    import { doc, updateDoc } from 'firebase/firestore';

    let user = null;
    let unsubscribeAuth = null;

    $: filteredJobs = $jobStore.filter(job => 
        ['processing', 'cancelled', 'retrying'].includes(job.generalData?.processingStatus)
    );

    async function handleRetry(jobId) {
        if (!user) return;
        try {
            const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
            await updateDoc(jobRef, {
                'generalData.processingStatus': 'retrying'
            });
        } catch (err) {
            console.error('Failed to retry job:', err);
        }
    }

    onMount(() => {
        unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            if (user) {
                jobStore.init(user.uid);
            }
        });
    });

    onDestroy(() => {
        if (unsubscribeAuth) unsubscribeAuth();
        jobStore.cleanup();
    });
</script>

<div>
    {#if $loading}
        <p>Loading...</p>
    {:else if $error}
        <p>{$error}</p>
    {:else if !user}
        <p>Please sign in</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Job ID</th>
                    <th>User ID</th>
                    <th>Processing Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredJobs as job}
                    <tr>
                        <td>{job.id}</td>
                        <td>{user.uid}</td>
                        <td>{job.generalData?.processingStatus || 'pending'}</td>
                        <td>
                            <button on:click={() => handleRetry(job.id)}>
                                Retry
                            </button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>