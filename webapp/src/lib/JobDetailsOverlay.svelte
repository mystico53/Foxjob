<script>
    export let job;
    export let closeOverlay;
    export let handleNext;
    export let previousJob;
    export let isFirstJob;
    export let isLastJob;
    export let toggleStar;
    export let hideJobAndNext;
    export let openJobLink; 

    let isHiding = false; 

    function formatDate(timestamp) {
        if (timestamp && timestamp.toDate) {
            const date = timestamp.toDate();
            return date.toLocaleString();
        }
        return 'N/A';
    }

    async function handleHide() { 
        isHiding = true;
        await hideJobAndNext(job.id);
        isHiding = false;
    }

    async function handleVisitJob() {
        if (job.generalData?.url) {
            openJobLink(job.generalData.url);
        }
    }
</script>

<div class="overlay">
    <div class="overlay-content">
        <div class="scrollable-content">
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
        </div>
        <div class="overlay-buttons">
            <button on:click={previousJob} disabled={isFirstJob || isHiding}>Previous</button>
            
            <button on:click={() => toggleStar(job.id)} class="star-button" disabled={isHiding}>
                {job.generalData?.status.toLowerCase() === 'starred' ? '⭐ Unstar' : '☆ Star'}
            </button>
            
            <button on:click={handleHide} class="hide-button" disabled={isHiding}>
                {isHiding ? 'Hiding...' : 'Hide'}
            </button>
            
            <button on:click={handleVisitJob} class="visit-button" disabled={isHiding}>
                Visit Job
            </button> <!-- New Visit Job Button -->
            
            <button on:click={() => handleNext(job.id)} disabled={isLastJob || isHiding}>Next</button>
            <button on:click={closeOverlay} disabled={isHiding}>Close</button>
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
        border-radius: 5px;
        max-width: 800px;
        width: 90%;
        height: 90vh;
        display: flex;
        flex-direction: column;
    }
    .scrollable-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 20px;
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
        gap: 10px; /* Space between buttons */
        padding: 10px 20px;
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
        justify-content: flex-start; /* Align buttons to the start */
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

    .hide-button {
        padding: 5px 10px;
        background-color: #ff4d4d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    .hide-button:hover {
        background-color: #e60000;
    }

    .visit-button {
        padding: 5px 10px;
        background-color: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
        margin-left: 10px; /* Space between Hide and Visit buttons */
    }
    .visit-button:hover {
        background-color: #2980b9;
    }

    /* Optional: Style other buttons if needed */
</style>
