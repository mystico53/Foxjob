<!-- webapp/src/lib/JobDetailsOverlay.svelte -->
<script>
    export let job;
    export let closeOverlay;
    export let nextJob;
    export let previousJob;
    export let isFirstJob;
    export let isLastJob;
    export let toggleStar;

    function formatDate(timestamp) {
        if (timestamp && timestamp.toDate) {
            const date = timestamp.toDate();
            return date.toLocaleString();
        }
        return 'N/A';
    }
</script>

<div class="overlay">
    <div class="overlay-content">
        <h2>{job.companyInfo?.name || 'N/A'} - {job.jobInfo?.jobTitle || 'N/A'}</h2>
        <div class="meta-info">
            <span class="badge">🏢 {job.companyInfo?.industry || 'N/A'}</span>
            <span class="badge">📍 {job.jobInfo?.remoteType || 'N/A'}</span>
            <span class="badge">💰 {job.compensation || 'N/A'}</span>
            <span class="badge">🗓️ {formatDate(job.generalData?.timestamp)}</span>
        </div>
        
        <p>{job.companyInfo?.companyFocus || 'N/A'}</p>
       
        <p>{job.jobInfo?.jobSummary || 'N/A'}</p>
                {#if job.matchResult}
            <h3>Match Results</h3>
            <table>
                <thead>
                    <tr>
                        <th>Key Skill</th>
                        <th>Score</th>
                        <th>Assessment</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Total Score</strong></td>
                        <td><strong>{Math.round(job.matchResult.totalScore)}</strong></td>
                        <td>{job.matchResult.summary}</td>
                    </tr>
                    {#each job.matchResult.keySkills as skill}
                        <tr>
                            <td>{skill.skill}</td>
                            <td>{Math.round(skill.score)}</td>
                            <td>{skill.assessment}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
        <div class="overlay-buttons">
            <button on:click={previousJob} disabled={isFirstJob}>Previous</button>
            <button on:click={() => toggleStar(job.id)} class="star-button">
                {job.status === 'starred' ? '⭐ Unstar' : '☆ Star'}
            </button>
            <button on:click={nextJob} disabled={isLastJob}>Next</button>
            <button on:click={closeOverlay}>Close</button>
            
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .overlay-content {
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    }
    .meta-info {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
    }
    .badge {
        background-color: #e2e8f0;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 0.8rem;
        color: #4a5568;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }
    th, td {
        border: 1px solid #e2e8f0;
        padding: 8px;
        text-align: left;
    }
    th {
        background-color: #f8fafc;
    }
    .overlay-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
    }
    button {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .star-button {
        padding: 5px 10px;
        background-color: #f1c40f;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    .star-button:hover {
        background-color: #f39c12;
    }
</style>