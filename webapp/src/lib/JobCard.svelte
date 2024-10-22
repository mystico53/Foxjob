<script>
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    
    // Props for the card with proper types matching store data
    export let companyName;
    export let jobTitle;
    export let score;
    export let status;
    export let timestamp;
    export let isSelected;
    
    // Optional handlers
    export let handleClick = () => {};

    $: formattedDate = timestamp ? new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(timestamp).replace(',', ' -') : 'No date';

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
    class="card variant-ghost-tertiary w-full text-left p-4 hover:bg-surface-600/10 cursor-pointer {isSelected ? 'card-hover !bg-surface-600/20' : ''}"
    on:click={handleClick}
    aria-label="View details for {jobTitle} position at {companyName}"
>
    <div class="space-y-4">
        <div class="flex justify-between items-start">
            <h3 class="h3 font-bold">{companyName}</h3>
            {#if score !== null}
            <div> 
                <ProgressRadial 
                    class="w-8"    
                    value={Math.round(score)}
                    stroke={60}
                    font={180}
                    strokeLinecap="round"
                >
                    {Math.round(score)}
                </ProgressRadial>
            </div>
            {/if}
        </div>
        
        <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center">
                <span class="text-sm text-surface-600-300-token">{jobTitle}</span>
                {#if status}
                    <span class="text-sm">{getStatusDisplay(status)}</span>
                {/if}
            </div>
            <div class="text-xs text-surface-600-300-token">{formattedDate}</div>
        </div>
    </div>
</button>