<script>
    // Props for the card with proper types matching store data
    export let companyName = '';
    export let jobTitle = '';
    export let score = null;
    export let status = '';
    export let isSelected = false;
    
    // Optional handlers
    export let handleClick = () => {};

    function getScoreColor(score) {
        // Define color stops
        const colorStops = [
            { score: 40, color: { r: 255, g: 107, b: 107 } }, // #ff6b6b
            { score: 60, color: { r: 244, g: 211, b: 94 } },  // #f4d35e
            { score: 100, color: { r: 111, g: 219, b: 111 } } // #6fdb6f
        ];

        // Find the two color stops that the score falls between
        let lowerStop = colorStops[0];
        let upperStop = colorStops[colorStops.length - 1];
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (score >= colorStops[i].score && score <= colorStops[i + 1].score) {
                lowerStop = colorStops[i];
                upperStop = colorStops[i + 1];
                break;
            }
        }

        // Calculate the percentage between the two color stops
        const range = upperStop.score - lowerStop.score;
        const percent = range === 0 ? 1 : (score - lowerStop.score) / range;

        // Interpolate between the two colors
        const r = Math.round(lowerStop.color.r + percent * (upperStop.color.r - lowerStop.color.r));
        const g = Math.round(lowerStop.color.g + percent * (upperStop.color.g - lowerStop.color.g));
        const b = Math.round(lowerStop.color.b + percent * (upperStop.color.b - lowerStop.color.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

    function getStatusDisplay(status) {
        if (!status) return '';

        switch (status.toLowerCase()) {
            case 'starred':
                return '⭐ Starred';
            case 'new':
                return '🆕 New';
            case 'read':
                return '📖 Read';
            default:
                return status;
        }
    }
</script>

<button 
    class="card w-full text-left p-4 hover:bg-surface-600/10 cursor-pointer {isSelected ? 'card-hover !bg-surface-600/20' : ''}"
    on:click={handleClick}
    aria-label="View details for {jobTitle} position at {companyName}"
>
    <div class="space-y-4">
        <div class="flex justify-between items-start">
            <h3 class="h3 font-bold">{companyName}</h3>
            {#if score !== null}
                <div class="score-cell">
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
        
        <div class="flex justify-between items-center">
            <span class="text-sm text-surface-600-300-token">{jobTitle}</span>
            {#if status}
                <span class="text-sm">{getStatusDisplay(status)}</span>
            {/if}
        </div>
    </div>
</button>

<style>
    .card {
        transition: all 0.2s ease-in-out;
        @apply bg-surface-100-800-token;
    }

    .score-cell {
        position: relative;
        width: 40px;
        height: 40px;
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
        font-size: 12px;
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
</style>