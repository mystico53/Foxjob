<script>
    import { onMount } from 'svelte';
    import { scrapeStore, isLoading, totalJobs, currentBatch, initJobListener } from '$lib/stores/scrapeStore'
    import { authStore } from '$lib/stores/authStore';
    
    let jobs = []
    let currentPage = 1;
    const rowsPerPage = 10;
    let uid;

    authStore.subscribe(user => {
        uid = user?.uid;
        if (uid) {
            console.log('🔑 User authenticated, initializing listener with uid:', uid);
            initJobListener(uid);
        }
    });
    
    scrapeStore.subscribe(value => {
      jobs = value;
      console.log('💫 Component received jobs update:', value.length);
    })
    
    onMount(() => {
      console.log('🏁 Component mounted, initializing listener');
      initJobListener('test_user');
      const unsubscribe = initJobListener('test_user');
      return unsubscribe;
    });
    
    $: totalPages = Math.ceil(jobs.length / rowsPerPage);
    $: paginatedJobs = jobs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    
    function nextPage() {
      if (currentPage < totalPages) currentPage++;
    }
    
    function previousPage() {
      if (currentPage > 1) currentPage--;
    }
    
    function formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString();
    }
</script>

<div class="container">
    <div class="stats">
        <p>Total Jobs: {$totalJobs}</p>
        <p>Current Batch: {$currentBatch}</p>
    </div>
    
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Match</th>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Posted Date</th>
                    <th>Type</th>
                    <th>Applicants</th>
                </tr>
            </thead>
            <tbody>
                {#each paginatedJobs as job (job.id)}
                    <tr>
                        <td>{job.embeddingMatch?.score ?? 'N/A'}</td>
                        <td>{job.basicInfo?.title || 'No Title'}</td>
                        <td>{job.basicInfo?.company || 'Unknown Company'}</td>
                        <td>{job.basicInfo?.location || 'Location not specified'}</td>
                        <td>{formatDate(job.searchMetadata?.processingDate)}</td>
                        <td>{job.details?.employmentType || 'N/A'}</td>
                        <td>{job.details?.numApplicants || 'N/A'}</td>
                    </tr>
                {/each}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="7">
                        <div class="pagination">
                            <span class="pagination-info">
                                Showing {Math.min((currentPage - 1) * rowsPerPage + 1, jobs.length)} - {Math.min(currentPage * rowsPerPage, jobs.length)} of {jobs.length} entries
                            </span>
                            <div class="pagination-controls">
                                <button 
                                    on:click={previousPage} 
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <span>Page {currentPage} of {totalPages}</span>
                                <button 
                                    on:click={nextPage} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>

<style>
    .container {
        padding: 1rem;
    }
    
    .stats {
        margin-bottom: 1rem;
        display: flex;
        gap: 1rem;
    }
    
    .table-container {
        overflow-x: auto;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    
    th {
        background-color: #f8f9fa;
        font-weight: 600;
        color: #2c3e50;
    }
    
    tr:hover {
        background-color: #f8f9fa;
    }
    
    .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
    }
    
    .pagination-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
    }
    
    button {
        padding: 0.5rem 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
    }
    
    button:hover:not(:disabled) {
        background: #f8f9fa;
    }
    
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .pagination-info {
        color: #666;
    }
</style>