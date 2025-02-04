<script>
    import { onMount } from 'svelte';
    import { scrapeStore, isLoading, totalJobs, currentBatch, initJobListener } from '$lib/stores/scrapeStore'
    import { authStore } from '$lib/stores/authStore';
    import { slide } from 'svelte/transition';
    import { formatJobDescription } from './job-description-formatter';
    
    let jobs = [];
    let currentPage = 1;
    const rowsPerPage = 5; // Reduced for better card viewing
    let uid;
    let expandedJobId = null;

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
    });
    
    onMount(() => {
      console.log('🏁 Component mounted, initializing listener');
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

    function toggleJobExpansion(jobId) {
        expandedJobId = expandedJobId === jobId ? null : jobId;
    }
</script>

<div class="container">
    <div class="stats">
        <p>Total Jobs: {$totalJobs}</p>
        <p>Current Batch: {$currentBatch}</p>
    </div>
    
    <div class="cards-container">
        {#each paginatedJobs as job (job.id)}
            <div class="card" class:expanded={expandedJobId === job.id}>
                <!-- Card Header - Always visible -->
                <div class="card-header" on:click={() => toggleJobExpansion(job.id)}>
                    <div class="company-info">
                        {#if job.basicInfo?.companyLogo}
                            <img 
                                src={job.basicInfo.companyLogo} 
                                alt="{job.basicInfo?.company} logo"
                                class="company-logo"
                            />
                        {/if}
                        <div class="title-company">
                            <h3>{job.basicInfo?.title || 'No Title'}</h3>
                            <p class="company-name">{job.basicInfo?.company || 'Unknown Company'}</p>
                        </div>
                    </div>
                    <div class="job-meta">
                        <span class="location">{job.basicInfo?.location || 'Location not specified'}</span>
                        <span class="posted-date">Posted: {formatDate(job.searchMetadata?.processingDate)}</span>
                        <span class="match-score">Match: {job.embeddingMatch?.score ?? 'N/A'}</span>
                    </div>
                </div>

                <!-- Expandable Content -->
                {#if expandedJobId === job.id}
                    <div class="card-content" transition:slide>
                        <div class="job-details">
                            <div class="detail-section">
                                <h4>Job Details</h4>
                                <p><strong>Employment Type:</strong> {job.details?.employmentType || 'N/A'}</p>
                                <p><strong>Applicants:</strong> {job.details?.numApplicants || 'N/A'}</p>
                            </div>
                            <div class="description-section">
                                <h4>Job Description</h4>
                                {#if job.details?.description}
                                    <div class="formatted-description">
                                        {#each formatJobDescription(job.details.description).sections as section}
                                            {#if section.header}
                                                <h5 class="section-header">{section.header}</h5>
                                            {/if}
                                            {#if section.content}
                                                <p class="section-content">
                                                    {#each section.content.split('\n').filter(line => line && line.trim()) as line}
                                                        <span class="content-line">
                                                            {line}
                                                        </span>
                                                    {/each}
                                                </p>
                                            {/if}
                                        {/each}
                                    </div>
                                {:else}
                                    <p>No description available</p>
                                {/if}
                            </div>
                            {#if job.basicInfo?.applyLink}
                                <a href={job.basicInfo.applyLink} class="apply-button" target="_blank">Apply Now</a>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>

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
</div>

<style>
    .container {
        padding: 1rem;
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .stats {
        margin-bottom: 1rem;
        display: flex;
        gap: 1rem;
    }
    
    .cards-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        cursor: pointer;
    }

    .card:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .card.expanded {
        box-shadow: 0 6px 12px rgba(0,0,0,0.2);
    }

    .card-header {
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }

    .company-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex: 1;
    }

    .company-logo {
        width: 48px;
        height: 48px;
        border-radius: 4px;
        object-fit: contain;
    }

    .title-company {
        flex: 1;
    }

    .title-company h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #2c3e50;
    }

    .company-name {
        margin: 0.25rem 0 0;
        color: #666;
    }

    .job-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
        color: #666;
        font-size: 0.9rem;
    }

    .card-content {
        padding: 1rem;
        border-top: 1px solid #eee;
    }

    .job-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .detail-section h4,
    .description-section h4 {
        margin: 0 0 0.5rem;
        color: #2c3e50;
    }

    .apply-button {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #0066cc;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin-top: 1rem;
        text-align: center;
        transition: background 0.3s ease;
    }

    .apply-button:hover {
        background: #0052a3;
    }

    .pagination {
        margin-top: 1rem;
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

    .formatted-description {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .section-header {
        color: #2c3e50;
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #eee;
    }

    .section-content {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .content-line {
        display: block;
        line-height: 1.5;
    }

    .content-line:first-letter {
        margin-left: 1rem;
    }

    @media (max-width: 768px) {
        .card-header {
            flex-direction: column;
            align-items: flex-start;
        }

        .job-meta {
            align-items: flex-start;
            margin-top: 0.5rem;
        }
    }
</style> 