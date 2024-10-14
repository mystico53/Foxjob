<script>
    import { createEventDispatcher, onMount } from 'svelte';

    export let message = '';
    export let visible = false;
    export let duration = 3000; // Duration in milliseconds

    const dispatch = createEventDispatcher();
    let timeoutId;

    $: if (visible) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            dispatch('dismiss');
        }, duration);
    }

    onMount(() => {
        return () => clearTimeout(timeoutId);
    });
</script>

{#if visible}
    <div class="toast" on:click={() => dispatch('dismiss')}>
        {message}
    </div>
{/if}

<style>
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #323232;
        color: #fff;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        animation: fadein 0.5s;
        z-index: 1001;
        cursor: pointer;
    }

    @keyframes fadein {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>