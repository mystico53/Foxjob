<script>
    import { onMount, onDestroy } from 'svelte';
    import { auth } from '$lib/firebase';
    import { jobStore, loading, error } from '$lib/stores/jobStore';

    let user = null;
    let unsubscribeAuth = null;

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
                </tr>
            </thead>
            <tbody>
                {#each $jobStore as job}
                    <tr>
                        <td>{job.id}</td>
                        <td>{user.uid}</td>
                        <td>{job.generalData?.processingStatus || 'pending'}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>