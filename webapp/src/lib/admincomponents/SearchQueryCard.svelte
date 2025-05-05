<!-- SearchQueryCard.svelte -->
<script>
  import { formatDate, formatTimeFromUTC } from '$lib/utilities/dateUtils';
  import { createEventDispatcher } from 'svelte';
  
  // Query data passed as a prop
  export let query = {};
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // State for expansion panel
  let expanded = false;
  
  // Get keyword from search params
  function getKeyword(searchParams) {
    if (!searchParams || !Array.isArray(searchParams) || searchParams.length === 0) {
      return 'N/A';
    }
    return searchParams[0].keyword || 'N/A';
  }
  
  // Extract search parameters
  $: searchParam = query.searchParams && query.searchParams.length > 0 
      ? query.searchParams[0] 
      : {};
      
  // Extract work preferences if available
  $: workPreferences = query.workPreferences || {
    preferences: null,
    avoidance: null
  };
  
  // Check if any preferences exist to show the toggle
  $: hasPreferences = !!(workPreferences.preferences || workPreferences.avoidance);
  
  // Toggle the expanded state
  function toggleExpand(e) {
    e.stopPropagation(); // Prevent click from bubbling to parent
    expanded = !expanded;
  }
  
  // Handle card click
  function handleCardClick() {
    // Only dispatch select event if not clicking on preferences section
    if (!expanded) {
      dispatch('select', query);
    }
  }
  
  // Handle keyboard events
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCardClick();
      e.preventDefault();
    }
  }
</script>

<div class="card p-4 bg-white shadow-sm mb-3 rounded-lg hover:bg-gray-50 transition-colors" 
    on:click={handleCardClick} 
    on:keydown={handleKeyDown} 
    class:cursor-pointer={!expanded}
    role="button"
    tabindex="0"
    aria-expanded={expanded}>
  <div class="flex justify-between items-start">
    <div class="flex-1">
      <!-- Header with ID and Status Badge -->
      <div class="flex items-center mb-2">
        <div class="text-sm text-gray-500 mr-2" title={query.id}>ID: {query.id?.substring(0, 8)}...</div>
        <div class="px-2 py-0.5 text-xs rounded-full {query.processingStatus === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
          {query.processingStatus || 'online'}
        </div>
      </div>
      
      <!-- Main Search Criteria -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-sm">
          <span class="font-semibold">{getKeyword(query.searchParams)}</span>
        </div>
        
        {#if searchParam.location}
          <div class="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
            <span>{searchParam.location}</span>
            {#if searchParam.country}
              <span class="ml-1">({searchParam.country})</span>
            {/if}
          </div>
        {/if}
        
        {#if searchParam.remote}
          <div class="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
            <span>{searchParam.remote}</span>
          </div>
        {/if}
      </div>
      
      <!-- Additional Search Filters -->
      <div class="flex flex-wrap gap-2 mb-3 text-xs">
        {#if searchParam.job_type}
          <div class="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
            <span>{searchParam.job_type}</span>
          </div>
        {/if}
        
        {#if searchParam.experience_level}
          <div class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
            <span>{searchParam.experience_level}</span>
          </div>
        {/if}
        
        {#if searchParam.time_range}
          <div class="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
            <span>{searchParam.time_range}</span>
          </div>
        {/if}
        
        {#if searchParam.includeSimilarRoles}
          <div class="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800">
            <span>Fuzzy Match</span>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Delivery Schedule Info -->
    <div class="text-right">
      <div class="text-sm">
        <span class="text-gray-500">Delivery:</span> {formatTimeFromUTC(query.deliveryTime)}
      </div>
      <div class="text-sm">
        <span class="text-gray-500">Frequency:</span> {query.frequency || 'N/A'}
      </div>
      <div class="text-sm">
        <span class="text-gray-500">Limit:</span> {query.limit || 'N/A'}
      </div>
    </div>
  </div>
  
  <!-- Date Information -->
  <div class="flex justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
    <div>
      <span>Next run:</span> {formatDate(query.nextRun)}
    </div>
    <div>
      <span>Last run:</span> {formatDate(query.lastRun)}
    </div>
    
    <!-- Expand button if preferences exist -->
    {#if hasPreferences}
      <button 
        class="text-blue-600 hover:text-blue-800 flex items-center font-medium focus:outline-none"
        on:click={toggleExpand}
        aria-expanded={expanded}
        title="Toggle preferences"
      >
        {expanded ? 'Hide Prompts' : 'Show Prompts'}
        <svg class="ml-1 w-4 h-4 transition-transform duration-200" class:rotate-180={expanded} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
    {/if}
  </div>
  
  <!-- Expandable Preferences Section -->
  {#if expanded && hasPreferences}
    <div class="mt-3 pt-3 border-t border-blue-100 text-sm"
         aria-label="Preferences details">
      <div class="bg-blue-50 p-3 rounded-md">
        <!-- Preferences -->
        {#if workPreferences.preferences}
          <div class="mb-2">
            <div class="font-medium text-gray-700 mb-1">Preferences:</div>
            <div class="text-gray-600 bg-white p-2 rounded border border-blue-100">
              {workPreferences.preferences}
            </div>
          </div>
        {/if}
        
        <!-- Avoidance -->
        {#if workPreferences.avoidance}
          <div>
            <div class="font-medium text-gray-700 mb-1">What to avoid:</div>
            <div class="text-gray-600 bg-white p-2 rounded border border-blue-100">
              {workPreferences.avoidance}
            </div>
          </div>
        {/if}
        
        <!-- Show message if preferences were fetched but are empty -->
        {#if !workPreferences.preferences && !workPreferences.avoidance}
          <div class="text-gray-500 italic">No preferences specified</div>
        {/if}
      </div>
    </div>
  {/if}
</div> 