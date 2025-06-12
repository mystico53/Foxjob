<script>
    import { auth } from '$lib/firebase';
    import AgentsOverview from '$lib/admincomponents/AgentsOverview.svelte';
    import AdminUsers from '$lib/admincomponents/AdminUsers.svelte';
    import { page } from '$app/stores';

    let currentView = 'batches'; // Default view
    
    function setView(view) {
        currentView = view;
    }
</script>

<div class="flex h-screen">
    <!-- Sidebar -->
    <div class="w-64 bg-surface-100-800-token border-r border-surface-300-600-token">
        <div class="p-4">
            <h1 class="h3 mb-6">Admin Dashboard</h1>
            <nav class="space-y-2">
                <button 
                    class="w-full text-left px-4 py-2 rounded {currentView === 'batches' ? 'bg-primary-500 text-white' : 'hover:bg-surface-200-700-token'}"
                    on:click={() => setView('batches')}
                >
                    Batches
                </button>
                <button 
                    class="w-full text-left px-4 py-2 rounded {currentView === 'users' ? 'bg-primary-500 text-white' : 'hover:bg-surface-200-700-token'}"
                    on:click={() => setView('users')}
                >
                    Users
                </button>
            </nav>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto">
        <div class="p-4">
            {#if currentView === 'batches'}
                <AgentsOverview />
            {:else if currentView === 'users'}
                <AdminUsers />
            {/if}
        </div>
    </div>
</div>