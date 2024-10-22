<!-- SortControls.svelte -->
<script>
    import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
    import { sortConfig } from '$lib/jobStore';

    // Radio group binding value
    let selectedSort = $sortConfig.column || 'Score.totalScore';

    function handleSortChange(value) {
        selectedSort = value;
        $sortConfig = {
            column: value,
            direction: 'desc'  // Always start with newest dates and highest scores
        };
    }
</script>

<div class="p-4 space-y-2">
    <RadioGroup 
        active="variant-filled-primary" 
        hover="hover:variant-soft-primary"
    >
        <RadioItem 
            bind:group={selectedSort} 
            name="sort" 
            value="Score.totalScore" 
            on:change={() => handleSortChange("Score.totalScore")}
        >
            Score
        </RadioItem>
        <RadioItem 
            bind:group={selectedSort} 
            name="sort" 
            value="generalData.timestamp"
            on:change={() => handleSortChange("generalData.timestamp")}
        >
            Date
        </RadioItem>
    </RadioGroup>
</div>