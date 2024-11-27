// src/routes/patchnotes/+page.svelte
<script>
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  
  // You can store your patch notes in a separate file or fetch them from an API
  const patchNotes = [
    {
      version: "1.2.0",
      date: "2024-11-27",
      content: `
# Version 1.2.0

## New Features
- Added dark mode support
- Implemented user profiles
- New dashboard widgets

## Bug Fixes
- Fixed login issues on Safari
- Improved loading performance
- Resolved notification bugs

## Changes
- Updated dependencies
- Refactored authentication system
      `
    },
    {
      version: "1.1.0",
      date: "2024-11-20",
      content: `
# Version 1.1.0

## Features
- New analytics dashboard
- Enhanced search functionality

## Fixes
- Mobile responsiveness improvements
- Bug fixes in user settings
      `
    }
  ];

  // Function to safely render markdown
  function renderMarkdown(content) {
    const html = marked(content);
    return DOMPurify.sanitize(html);
  }
</script>

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