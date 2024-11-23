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
        // First update Firestore status
        const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
        await updateDoc(jobRef, {
            'generalData.processingStatus': 'retrying'
        });

        // Call the cloud function with the data
        const response = await fetch('https://retryprocessing-kvshkfhmua-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jobId: jobId,
                userId: user.uid
            })
        });

        const result = await response.json();
        console.log('Retry initiated - Response:', {
            success: result.success,
            messageId: result.messageId,
            docId: result.docId,
            timestamp: result.timestamp
        });

    } catch (err) {
        console.error('Error in handleRetry:', err);
        const jobRef = doc(db, 'users', user.uid, 'jobs', jobId);
        await updateDoc(jobRef, {
            'generalData.processingStatus': 'cancelled'
        });
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