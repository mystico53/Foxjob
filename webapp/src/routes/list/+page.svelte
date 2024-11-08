<script>
    import Datatable from '$lib/Datatable.svelte';
    import CollectionLoader from '$lib/CollectionLoader.svelte';
    import JobCountGraph from '$lib/JobCountGraph.svelte';
</script>

<div class="container mx-auto p-4 w-full lg:w-3/4 xl:w-2/3">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Left Column -->
        <div class="card variant-glass-secondary p-4">
            <h2 class="h3 mb-4">Your activity</h2>
            <JobCountGraph />
        </div>

        <!-- Right Column -->
        <div class="card variant-glass-secondary p-4">
            <h2 class="h3 mb-4">Upload your resume</h2>
            <CollectionLoader />
        </div>
    </div>

    <!-- Datatable below the columns -->
    <div class="card variant-glass-secondary mt-4 p-4">
        <Datatable />
    </div>
</div>

<style>
    /* Remove the max-width from here since we're handling it with Tailwind classes */
</style>