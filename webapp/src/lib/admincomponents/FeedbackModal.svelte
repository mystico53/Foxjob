<!-- src/lib/Modal.svelte -->
<script>
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let show = false;
    export let title = '';
    
    function close() {
        dispatch('close');
    }
</script>

<svelte:window 
    on:keydown={(e) => e.key === 'Escape' && close()}
/>

{#if show}
    <dialog 
        class="fixed inset-0 flex items-center justify-center z-50"
        open
        aria-labelledby={title ? 'modal-title' : undefined}
    >
        <!-- Backdrop -->
        <button
            class="fixed inset-0 bg-black/50 cursor-default"
            on:click={close}
            aria-label="Close modal"
        />
        
        <!-- Modal content -->
        <article 
            class="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-10"
            transition:fade
        >
            {#if title}
                <h2 id="modal-title" class="text-xl font-bold mb-4">{title}</h2>
            {/if}
            <slot />
        </article>
    </dialog>
{/if}