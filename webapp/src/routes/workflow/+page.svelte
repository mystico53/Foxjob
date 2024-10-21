  <div class="flex h-full">
    <!-- Sidebar -->
    <aside class="w-auto sm:w-64 flex-none bg-surface-200-700-token">
      <nav class="p-4 space-y-2">
        <h2 class="h3 mb-2">Sidebar</h2>
        <ul class="space-y-2">
          <li><a href="/" class="btn variant-ghost-surface">Home</a></li>
          <li><a href="/about" class="btn variant-ghost-surface">About</a></li>
          <li><a href="/contact" class="btn variant-ghost-surface">Contact</a></li>
        </ul>
      </nav>
    </aside>
  
    <!-- Main Content -->
    <main class="flex-1 p-4 overflow-y-auto">
      <slot />
    </main>
  </div>