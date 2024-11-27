<!-- src/lib/onboarding/OnboardingTooltip.svelte -->
<script>
    export let title = '';
    export let description = '';
    export let position = 'bottom';
    export let showCloseButton = false;
    export let onClose = () => {};
    export let width = '300px';
    export let offset = '0.5rem';
</script>

<div
    class="card variant-filled-primary tooltip-container {position}"
    role="tooltip"
    aria-label={title}
    style="--tooltip-width: {width}; --tooltip-offset: {offset};"
>
    <!-- Arrow element -->
    <div class="arrow {position}" />
    
    <div class="flex flex-col gap-2 p-4">
        {#if title}
            <h3 class="h3">{title}</h3>
        {/if}
        <p>{description}</p>
        {#if showCloseButton}
            <button class="btn variant-filled-surface" on:click={onClose}>Got it!</button>
        {/if}
    </div>
</div>

<style>
    .tooltip-container {
        position: absolute;
        z-index: 999;
        width: var(--tooltip-width, 300px);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .tooltip-container.bottom {
        top: calc(100% + var(--tooltip-offset, 0.5rem));
        left: 50%;
        transform: translateX(-50%);
    }

    .tooltip-container.top {
        bottom: calc(100% + var(--tooltip-offset, 0.5rem));
        left: 50%;
        transform: translateX(-50%);
    }

    /* Arrow styling */
    .arrow {
        position: absolute;
        width: 0;
        height: 0;
        border: solid 8px transparent;
    }

    .arrow.bottom {
        top: -16px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: var(--color-primary-500);
    }

    .arrow.top {
        bottom: -16px;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: var(--color-primary-500);
    }

    .arrow.left {
        right: -16px;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: var(--color-primary-500);
    }

    .arrow.right {
        left: -16px;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: var(--color-primary-500);
    }
</style>