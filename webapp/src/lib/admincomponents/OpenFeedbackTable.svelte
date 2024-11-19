<!-- OpenFeedbackTable.svelte -->
<script>
    import { getFirestore, collection, query, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
    import { onMount } from 'svelte';

    const db = getFirestore();
    let feedbackItems = [];
    let loading = true;
    let error = null;
    let expandedId = null;
    
    let currentPage = 0;
    let pageSize = 10;
    let totalItems = 0;
    
    let sortField = 'timestamp';
    let sortDirection = 'desc';
    
    let searchTerm = '';
    let lastDoc = null;

    function truncateText(text, length) {
        if (!text) return '';
        return text.length > length ? text.slice(0, length) + '...' : text;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { 
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }

    function toggleExpand(id) {
        expandedId = expandedId === id ? null : id;
    }

    async function loadFeedbackData() {
        try {
            loading = true;
            error = null;
            
            const feedbackRef = collection(db, 'feedback/openfeedback/submissions');
            
            let q = query(
                feedbackRef,
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
                text: doc.data().text || 'No feedback provided',
                timestamp: doc.data().timestamp,
                userId: doc.data().userId || 'Unknown'
            }));
            
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            const totalQuery = query(feedbackRef);
            const totalSnapshot = await getDocs(totalQuery);
            totalItems = totalSnapshot.size;
            
        } catch (err) {
            console.error('Error loading feedback:', err);
            error = `Failed to load feedback data: ${err.message}`;
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

    onMount(() => {
        loadFeedbackData();
    });

    $: totalPages = Math.ceil(totalItems / pageSize);
    $: pages = Array.from({ length: totalPages }, (_, i) => i);
</script>

<div class="container mx-auto space-y-4">
    <div class="flex gap-4 mb-4">
        <input
            bind:value={searchTerm}
            type="search"
            placeholder="Search feedback..."
            class="input"
            on:input={handlePageChange(0)}
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
            <div class="table-container">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th class="cursor-pointer sticky top-0 bg-surface-100-800-token" on:click={() => handleSort('timestamp')}>
                                Date
                                {#if sortField === 'timestamp'}
                                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                {/if}
                            </th>
                            <th class="sticky top-0 bg-surface-100-800-token">User</th>
                            <th class="sticky top-0 bg-surface-100-800-token">Feedback</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each feedbackItems as item}
                            <tr 
                                class="cursor-pointer hover:bg-surface-hover-token"
                                on:click={() => toggleExpand(item.id)}
                            >
                                <td>{formatDate(item.timestamp)}</td>
                                <td>
                                    <div class="skeleton-chip">{item.userId}</div>
                                </td>
                                <td>{truncateText(item.text, 30)}</td>
                            </tr>
                            {#if expandedId === item.id}
                                <tr class="expanded-row">
                                    <td colspan="3" class="p-4 bg-surface-200-700-token">
                                        {item.text}
                                    </td>
                                </tr>
                            {/if}
                        {/each}
                    </tbody>
                </table>
            </div>

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
    
    .table-container {
        @apply h-96 overflow-y-auto relative;
    }
    
    .table {
        @apply w-full;
    }
    
    .table th,
    .table td {
        @apply p-2 text-left border-b;
    }

    .skeleton-chip {
        @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800;
    }

    .expanded-row td {
        @apply border-t-0;
    }
</style>