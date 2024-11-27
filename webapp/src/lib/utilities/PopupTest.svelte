<!-- PopupTest.svelte -->
<script>
    import { popup } from '@skeletonlabs/skeleton';
    import { onMount } from 'svelte';
    
    // Click popup settings with state callback
    const popupClick = {
        event: 'click',
        target: 'popupClick',
        placement: 'top',
        // Adding state callback to track open/closed state
        state: (e) => {
            isOpen = e.isOpen;
        }
    };

    let isOpen = true; // Start with popup open
    let buttonElement;

    onMount(() => {
        // Trigger the popup to open initially
        if (buttonElement) {
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            buttonElement.dispatchEvent(event);
        }
    });
</script>

<div class="container mx-auto p-4 space-y-4">
    <h2 class="h2 mb-4">Popup/Tooltip Test</h2>
    
    <!-- Click Popup -->
    <div class="card p-4 space-y-2">
        <h3 class="h3">Click Popup (Starts Open)</h3>
        <button 
            bind:this={buttonElement}
            class="btn variant-filled-primary" 
            use:popup={popupClick}
        >
            {isOpen ? 'Close Popup' : 'Open Popup'}
        </button>
        <div class="card p-4 variant-filled-secondary" data-popup="popupClick">
            <p>This popup starts open! Click the button to toggle.</p>
            <div class="arrow variant-filled-secondary" />
        </div>
    </div>
</div>