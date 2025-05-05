<script>
    import { auth } from '$lib/firebase';
    import AgentsOverview from '$lib/admincomponents/AgentsOverview.svelte';

    function handleLogout() {
        auth.signOut();
    }
</script>

    <div class="container mx-auto p-4">
        <div class="flex justify-between items-center mb-4">
            <h1 class="h1">Admin Dashboard</h1>
            <button class="btn variant-filled-warning" on:click={handleLogout}>
            Logout
            </button>
        </div>
        
        <div class="grid gap-4">
            <div class="card p-4">
                <AgentsOverview />
            </div>
        </div>
    </div>