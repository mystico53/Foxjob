<script>
    import Datatable from '$lib/Datatable.svelte';
    import CollectionLoader from '$lib/CollectionLoader.svelte';
</script>

<div class="container">
    <div class="grid grid-cols-2 gap-4">
        <!-- Left Column -->
        <div class="col-span-1">
            <h2 class="h3">Your activity</h2>
            <!-- Content for left column -->
        </div>

        <!-- Right Column -->
        <div class="col-span-1">
            <h2 class="h3">Resume Upload</h2>
            <CollectionLoader />
        </div>
    </div>

    <!-- Datatable below the columns -->
    <div class="mt-4">
        <Datatable />
    </div>
</div>

<style>
    .container {
        padding: 1rem;
        max-width: 100%;
    }
</style>