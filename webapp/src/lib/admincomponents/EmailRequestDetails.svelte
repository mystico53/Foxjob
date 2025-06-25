<!-- EmailRequestDetails.svelte -->
<script>
  import { fade } from 'svelte/transition';
  
  // Props
  export let emailRequest = null;
  export let isExpanded = false;
  
  // Format date for display
  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (err) {
      return 'Invalid date';
    }
  }
  
  // Format field value for display
  function formatValue(value) {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date || (value && value.toDate)) return formatDate(value);
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value.toString();
  }
  
  // Get status color class
  function getStatusClass(status) {
    switch (status) {
      case 'sent':
        return 'text-success-500';
      case 'error':
        return 'text-error-500';
      case 'pending':
        return 'text-warning-500';
      default:
        return 'text-surface-900-50-token';
    }
  }
</script>

<div class="card variant-soft-primary p-4 mb-4">
  <div 
    class="flex justify-between items-center cursor-pointer" 
    role="button"
    tabindex="0"
    on:click={() => isExpanded = !isExpanded}
    on:keydown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        isExpanded = !isExpanded;
      }
    }}
  >
    <h3 class="h4 mb-2">Email Request Details</h3>
    <button class="btn variant-ghost" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
      {isExpanded ? '▼' : '▶'}
    </button>
  </div>
  
  {#if isExpanded}
    <div transition:fade>
      {#if emailRequest}
        <div class="grid grid-cols-2 gap-4">
          <!-- Basic Information -->
          <div class="col-span-2">
            <h4 class="text-lg font-semibold mb-2">Basic Information</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Email ID:</strong></div>
              <div>{emailRequest.id}</div>
              
              <div><strong>Status:</strong></div>
              <div class={getStatusClass(emailRequest.status)}>
                {emailRequest.status || 'Unknown'}
              </div>
              
              <div><strong>Recipient:</strong></div>
              <div>{emailRequest.to || 'Unknown'}</div>
              
              <div><strong>Subject:</strong></div>
              <div>{emailRequest.subject || 'N/A'}</div>
              
              <div><strong>Created At:</strong></div>
              <div>{formatDate(emailRequest.createdAt)}</div>
              
              <div><strong>Sent At:</strong></div>
              <div>{formatDate(emailRequest.sentAt)}</div>
            </div>
          </div>
          
          <!-- Engagement Tracking -->
          <div class="col-span-2">
            <h4 class="text-lg font-semibold mb-2">Engagement Tracking</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Opened:</strong></div>
              <div class={emailRequest.opened ? 'text-success-500' : 'text-surface-900-50-token'}>
                {emailRequest.opened ? `Yes (${emailRequest.openCount || 1} times)` : 'No'}
              </div>
              
              <div><strong>Clicked:</strong></div>
              <div class={emailRequest.clicked ? 'text-success-500' : 'text-surface-900-50-token'}>
                {emailRequest.clicked ? `Yes (${emailRequest.clickCount || 1} times)` : 'No'}
              </div>
              
              <div><strong>Unsubscribed:</strong></div>
              <div class={emailRequest.unsubscribed ? 'text-error-500' : 'text-surface-900-50-token'}>
                {emailRequest.unsubscribed ? 'Yes' : 'No'}
              </div>
              
              <div><strong>Spam Reported:</strong></div>
              <div class={emailRequest.spamReported ? 'text-error-500' : 'text-surface-900-50-token'}>
                {emailRequest.spamReported ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
          
          <!-- Delivery Status -->
          <div class="col-span-2">
            <h4 class="text-lg font-semibold mb-2">Delivery Status</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Status:</strong></div>
              <div class={
                emailRequest.bounced ? 'text-error-500' :
                emailRequest.delivered ? 'text-success-500' :
                'text-surface-900-50-token'
              }>
                {emailRequest.bounced ? 'Bounced' : 
                 emailRequest.dropped ? 'Dropped' :
                 emailRequest.delivered ? 'Delivered' :
                 emailRequest.deferred ? 'Deferred' :
                 emailRequest.processed ? 'Processed' : 'Unknown'}
              </div>
              
              <div><strong>Processed:</strong></div>
              <div>{formatDate(emailRequest.processedAt)}</div>
              
              <div><strong>Delivered:</strong></div>
              <div>{formatDate(emailRequest.deliveredAt)}</div>
              
              <div><strong>Bounced:</strong></div>
              <div>{formatDate(emailRequest.bouncedAt)}</div>
            </div>
          </div>
          
          <!-- Metadata -->
          {#if emailRequest.metadata}
            <div class="col-span-2">
              <h4 class="text-lg font-semibold mb-2">Metadata</h4>
              <div class="bg-surface-100 p-4 rounded-lg">
                <pre class="text-sm whitespace-pre-wrap">{formatValue(emailRequest.metadata)}</pre>
              </div>
            </div>
          {/if}
          
          <!-- HTML Content -->
          {#if emailRequest.html}
            <div class="col-span-2">
              <h4 class="text-lg font-semibold mb-2">HTML Content</h4>
              <div class="bg-surface-100 p-4 rounded-lg">
                <pre class="text-sm whitespace-pre-wrap">{emailRequest.html}</pre>
              </div>
            </div>
          {/if}
          
          <!-- Text Content -->
          {#if emailRequest.text}
            <div class="col-span-2">
              <h4 class="text-lg font-semibold mb-2">Text Content</h4>
              <div class="bg-surface-100 p-4 rounded-lg">
                <pre class="text-sm whitespace-pre-wrap">{emailRequest.text}</pre>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-surface-900-50-token">No email request data available.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  pre {
    font-family: monospace;
    overflow-x: auto;
  }
</style> 