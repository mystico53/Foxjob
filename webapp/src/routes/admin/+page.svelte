<script>
    import { auth } from '$lib/firebase';
    import AgentsOverview from '$lib/admincomponents/AgentsOverview.svelte';
    import AdminUsers from '$lib/admincomponents/AdminUsers.svelte';
    import { page } from '$app/stores';
    import AdminDashboard from '$lib/admincomponents/AdminDashboard.svelte';

    let activeTab = 'dashboard';
    let currentView = 'batches'; // Default view
    let selectedBatchId = null;
    
    function setView(view) {
        currentView = view;
    }

    function handleBatchSelect(event) {
        const { batchId } = event.detail;
        selectedBatchId = batchId;
        currentView = 'batches';
    }
</script>

<div class="container mx-auto p-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Sidebar -->
        <div class="card p-4">
            <nav class="list-nav">
                <ul>
                    <li>
                        <button
                            class="btn w-full justify-start {activeTab === 'dashboard' ? 'variant-filled-primary' : 'variant-ghost'}"
                            on:click={() => activeTab = 'dashboard'}
                        >
                            Dashboard
                        </button>
                    </li>
                    <li>
                        <button
                            class="btn w-full justify-start {activeTab === 'batches' ? 'variant-filled-primary' : 'variant-ghost'}"
                            on:click={() => activeTab = 'batches'}
                        >
                            Batches
                        </button>
                    </li>
                    <li>
                        <button
                            class="btn w-full justify-start {activeTab === 'users' ? 'variant-filled-primary' : 'variant-ghost'}"
                            on:click={() => activeTab = 'users'}
                        >
                            Users
                        </button>
                    </li>
                </ul>
            </nav>
        </div>

        <!-- Content -->
        <div class="md:col-span-3">
            {#if activeTab === 'dashboard'}
                <AdminDashboard />
            {:else if activeTab === 'batches'}
                <AgentsOverview selectedBatchId={selectedBatchId} />
            {:else if activeTab === 'users'}
                <AdminUsers on:selectBatch={handleBatchSelect} />
            {/if}
        </div>
    </div>
</div>