<!-- src/lib/components/InfoCard.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    
    // Props
    export let message = "Your agent is being created! You can expect an email with first results within the next few minutes.";
    export let icon = "ℹ️"; // Default info emoji
    export let buttonText = "Understood";
    export let show = true;
    export let loading = false;
    
    const dispatch = createEventDispatcher();
    
    function handleButtonClick() {
      dispatch('dismiss');
      show = false;
    }
  </script>
  
  {#if show}
    <div class="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-4 flex items-start">
      {#if loading}
        <!-- Skeleton Loading State -->
        <div class="flex-shrink-0 mr-3 h-6 w-6 rounded-full bg-blue-200 animate-pulse"></div>
        <div class="flex-grow">
          <div class="h-4 bg-blue-200 rounded animate-pulse w-3/4 mb-3"></div>
          <div class="h-4 bg-blue-200 rounded animate-pulse w-1/2"></div>
          <div class="mt-3 flex justify-end">
            <div class="h-8 w-24 bg-blue-300 rounded-md animate-pulse"></div>
          </div>
        </div>
      {:else}
        <!-- Normal State -->
        <div class="flex-shrink-0 mr-3 text-xl">
          {icon}
        </div>
        <div class="flex-grow">
          <p class="text-blue-700">{message}</p>
          <div class="mt-3 flex justify-end">
            <button 
              on:click={handleButtonClick}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              {buttonText}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}