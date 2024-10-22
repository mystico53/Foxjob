<script>
    // Props
    export let companyName = '';
    export let jobTitle = '';
    export let score = null;
    export let status = '';
    export let companyInfo = {};
    export let jobInfo = {};
    export let generalData = {};
    export let matchResult = null;
    
    // Navigation props
    export let handleNext = () => {};
    export let previousJob = () => {};
    export let isFirstJob = false;
    export let isLastJob = false;
    export let toggleStar = () => {};
    export let hideJobAndNext = () => {};
    export let openJobLink = () => {};
    
    let isHiding = false;
    
    function getScoreColor(score) {
        const colorStops = [
            { score: 40, color: { r: 255, g: 107, b: 107 } },
            { score: 60, color: { r: 244, g: 211, b: 94 } },
            { score: 100, color: { r: 111, g: 219, b: 111 } }
        ];

        let lowerStop = colorStops[0];
        let upperStop = colorStops[colorStops.length - 1];
        
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (score >= colorStops[i].score && score <= colorStops[i + 1].score) {
                lowerStop = colorStops[i];
                upperStop = colorStops[i + 1];
                break;
            }
        }

        const range = upperStop.score - lowerStop.score;
        const percent = range === 0 ? 1 : (score - lowerStop.score) / range;

        const r = Math.round(lowerStop.color.r + percent * (upperStop.color.r - lowerStop.color.r));
        const g = Math.round(lowerStop.color.g + percent * (upperStop.color.g - lowerStop.color.g));
        const b = Math.round(lowerStop.color.b + percent * (upperStop.color.b - lowerStop.color.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

    function formatDate(timestamp) {
        if (timestamp && timestamp.toDate) {
            const date = timestamp.toDate();
            return date.toLocaleString();
        }
        return 'N/A';
    }

    async function handleHide() { 
        isHiding = true;
        await hideJobAndNext();
        isHiding = false;
    }

    function handleVisitJob() {
        if (generalData?.url) {
            openJobLink(generalData.url);
        }
    }
</script>

<div class="p-6 max-w-4xl mx-auto space-y-8">
    <!-- Header Section -->
    <div class="flex justify-between items-start">
        <div class="space-y-2">
            <h1 class="h1">{companyName}</h1>
            <h2 class="h3 text-surface-600-300-token">{jobTitle}</h2>
            
            <!-- Meta Information -->
            <div class="flex flex-wrap gap-2 mt-4">
                <span class="chip variant-soft">🏢 {companyInfo?.industry || 'N/A'}</span>
                <span class="chip variant-soft">📍 {jobInfo?.remoteType || 'N/A'}</span>
                <span class="chip variant-soft">💰 {jobInfo?.salary || 'N/A'}</span>
                <span class="chip variant-soft">🗓️ {formatDate(generalData?.timestamp)}</span>
                {#if status}
                    <span class="chip variant-filled">{status}</span>
                {/if}
            </div>
        </div>
        
        {#if score !== null}
            <div class="score-container">
                <svg class="score-circle" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="22" fill="none" stroke="#e6e6e6" stroke-width="6"/>
                    <circle 
                        cx="25" cy="25" r="22" 
                        fill="none" 
                        stroke={getScoreColor(score)} 
                        stroke-width="6"
                        stroke-dasharray={2 * Math.PI * 22}
                        style="--initial-offset: {2 * Math.PI * 22}; --final-offset: {2 * Math.PI * 22 * (1 - score/100)};"
                        class="animate-fill"
                    />
                </svg>
                <span class="score-text">{Math.round(score)}</span>
            </div>
        {/if}
    </div>

    <!-- Company Focus and Job Summary -->
    {#if companyInfo?.companyFocus || jobInfo?.jobSummary}
        <div class="card variant-glass-surface p-4">
            {#if companyInfo?.companyFocus}
                <p class="mb-4">{companyInfo.companyFocus}</p>
            {/if}
            {#if jobInfo?.jobSummary}
                <p>{jobInfo.jobSummary}</p>
            {/if}
        </div>
    {/if}

    <!-- Match Results -->
    {#if matchResult}
        <div class="card variant-glass-surface p-4">
            <header class="card-header">
                <h3 class="h3">Match Results</h3>
            </header>
            <section class="p-4">
                <table class="table table-compact">
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
                            <td><strong>{Math.round(matchResult.totalScore)}</strong></td>
                            <td>{matchResult.summary}</td>
                        </tr>
                        {#each matchResult.keySkills as skill}
                            <tr>
                                <td>{skill.skill}</td>
                                <td>{Math.round(skill.score)}</td>
                                <td>{skill.assessment}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </section>
        </div>
    {/if}

    <!-- Action Buttons -->
    <div class="card variant-glass-surface p-4">
        <div class="flex flex-wrap gap-4">
            <button class="btn variant-filled-primary" on:click={previousJob} disabled={isFirstJob || isHiding}>
                Previous
            </button>
            
            <button class="btn variant-filled-warning" on:click={toggleStar} disabled={isHiding}>
                {status?.toLowerCase() === 'starred' ? '⭐ Unstar' : '☆ Star'}
            </button>
            
            <button class="btn variant-filled-error" on:click={handleHide} disabled={isHiding}>
                {isHiding ? 'Hiding...' : 'Hide'}
            </button>
            
            <button class="btn variant-filled-secondary" on:click={handleVisitJob} disabled={isHiding}>
                Visit Job
            </button>
            
            <button class="btn variant-filled-primary" on:click={handleNext} disabled={isLastJob || isHiding}>
                Next
            </button>
        </div>
    </div>
</div>

<style>
    .score-container {
        width: 60px;
        height: 60px;
        position: relative;
    }

    .score-circle {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }

    .score-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 16px;
        font-weight: bold;
    }

    @keyframes fillup {
        from {
            stroke-dashoffset: var(--initial-offset);
        }
        to {
            stroke-dashoffset: var(--final-offset);
        }
    }

    .animate-fill {
        animation: fillup 1000ms ease-out forwards;
    }

    :global(.table) {
        width: 100%;
    }

    :global(.table th), :global(.table td) {
        padding: 0.75rem;
        text-align: left;
    }

    :global(.table th) {
        background-color: rgba(var(--color-surface-500), 0.1);
    }
</style>