<script>
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    
    export let data;
    $: patchNotes = data?.patchNotes || [];
  
    function renderMarkdown(content) {
      const html = marked(content);
      return DOMPurify.sanitize(html);
    }
  </script>
  
  {#if patchNotes.length > 0}
    <div class="container mx-auto p-8 space-y-12">
      <h1 class="h1">Patch Notes</h1>
      
      {#each patchNotes as note}
        <div class="card variant-soft p-6">
          <header class="flex justify-between items-center mb-4">
            <h2 class="h2">Version {note.version}</h2>
            <span class="badge variant-filled">{note.date}</span>
          </header>
          
          <div class="prose prose-slate dark:prose-invert">
            {@html renderMarkdown(note.content)}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="container mx-auto p-8">
      <div class="card variant-soft p-6">
        <p>Loading patch notes...</p>
      </div>
    </div>
  {/if}
  
  <style lang="postcss">
    :global(.prose) {
      @apply max-w-none;
    }
    
    :global(.prose h1) {
      @apply mt-0;
    }
    
    :global(.prose h2) {
      @apply mt-6 mb-4;
    }
    
    :global(.prose ul) {
      @apply list-disc ml-6 mb-4;
    }
  </style>