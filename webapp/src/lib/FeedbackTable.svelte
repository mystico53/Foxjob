<!-- FeedbackTable.svelte -->
<script>
    import { getFirestore, collection, query, getDocs, orderBy, limit, startAfter, where } from 'firebase/firestore';
    import { onMount } from 'svelte';

    const db = getFirestore();
    let feedbackItems = [];
    let loading = true;
    let error = null;
    
    // Pagination state
    let currentPage = 0;
    let pageSize = 10;
    let totalItems = 0;
    
    // Sorting state
    let sortField = 'timestamp';
    let sortDirection = 'desc';
    
    // Search state
    let searchTerm = '';
    let lastDoc = null;

    async function loadFeedbackData() {
        try {
            loading = true;
            error = null;
            
            const feedbackRef = collection(db, 'feedback');
            let q = query(
                feedbackRef,
                where('active', '==', true),
                orderBy(sortField, sortDirection),
                limit(pageSize)
            );
            
            if (lastDoc && currentPage > 0) {
                q = query(q, startAfter(lastDoc));
            }
            
            const snapshot = await getDocs(q);
            
            feedbackItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()?.toLocaleString() || 'N/A'
            }));
            
            // Update lastDoc for pagination
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Get total count
            const totalQuery = query(feedbackRef, where('active', '==', true));
            const totalSnapshot = await getDocs(totalQuery);
            totalItems = totalSnapshot.size;
            
        } catch (err) {
            console.error('Error loading feedback:', err);
            error = 'Failed to load feedback data';
        } finally {
            loading = false;
        }
    }

    function handlePageChange(newPage) {
        currentPage = newPage;
        loadFeedbackData();
    }

    function handleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
        currentPage = 0;
        lastDoc = null;
        loadFeedbackData();
    }

    function handleSearch() {
        currentPage = 0;
        lastDoc = null;
        loadFeedbackData();
    }

    onMount(() => {
        loadFeedbackData();
    });

    $: totalPages = Math.ceil(totalItems / pageSize);
    $: pages = Array.from({ length: totalPages }, (_, i) => i);
</script>

<div class="container mx-auto space-y-4">
    <!-- Search -->
    <div class="flex gap-4 mb-4">
        <input
            bind:value={searchTerm}
            type="search"
            placeholder="Search feedback..."
            class="input"
            on:input={handleSearch}
        />
    </div>

    {#if error}
        <div class="alert variant-filled-error">
            <span>{error}</span>
        </div>
    {/if}

    {#if loading}
        <div class="flex justify-center">
            <div class="loading">Loading...</div>
        </div>
    {:else}
        <div class="card p-4">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th class="cursor-pointer" on:click={() => handleSort('timestamp')}>
                            Timestamp
                            {#if sortField === 'timestamp'}
                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            {/if}
                        </th>
                        <th class="cursor-pointer" on:click={() => handleSort('type')}>
                            Type
                            {#if sortField === 'type'}
                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            {/if}
                        </th>
                        <th>Job ID</th>
                        <th>Item ID</th>
                        <th>Path</th>
                    </tr>
                </thead>
                <tbody>
                    {#each feedbackItems as item}
                        <tr>
                            <td>{item.timestamp}</td>
                            <td>
                                {#if item.type === 'upvote'}
                                    <span class="badge bg-success">Upvote</span>
                                {:else}
                                    <span class="badge bg-error">Downvote</span>
                                {/if}
                            </td>
                            <td>{item.jobId}</td>
                            <td>{item.itemId}</td>
                            <td>{item.path}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>

            <!-- Simple Pagination -->
            <div class="flex justify-center gap-2 mt-4">
                <button 
                    class="btn btn-sm"
                    disabled={currentPage === 0}
                    on:click={() => handlePageChange(currentPage - 1)}
                >
                    Previous
                </button>
                
                {#each pages as page}
                    <button 
                        class="btn btn-sm {currentPage === page ? 'variant-filled' : ''}"
                        on:click={() => handlePageChange(page)}
                    >
                        {page + 1}
                    </button>
                {/each}
                
                <button 
                    class="btn btn-sm"
                    disabled={currentPage === totalPages - 1}
                    on:click={() => handlePageChange(currentPage + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .loading {
        @apply animate-pulse text-center py-4;
    }
    
    .table {
        @apply w-full;
    }
    
    .table th,
    .table td {
        @apply p-2 text-left border-b;
    }
    
    .table th {
        @apply bg-surface-100-800-token;
    }
    
    .badge {
        @apply px-2 py-1 rounded text-sm;
    }
    
    .bg-success {
        @apply bg-green-500 text-white;
    }
    
    .bg-error {
        @apply bg-red-500 text-white;
    }
</style>