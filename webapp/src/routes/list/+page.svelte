<script>
	import CollectionLoader from '$lib/Dashboard/CollectionLoader.svelte';
	import JobCountGraph from '$lib/Dashboard/JobCountGraph.svelte';
	import JobBarGraph from '$lib/Dashboard/JobBarGraph.svelte';
	import SearchBox from '$lib/searchJobs/searchBox.svelte';
</script>

<!-- Parent container -->
<div class="container mx-auto w-full p-4 lg:w-3/4 xl:w-1/2">
	<div class="grid grid-cols-1 pb-4 gap-4 md:grid-cols-2">
		<!-- Left Column -->
		<div class="card p-4">
			<!-- Removed fixed aspect ratio -->
			<JobCountGraph />
		</div>

		<!-- Right Column -->
		<div class="card p-4">
			<CollectionLoader />
		</div>
	</div>

	<!-- Added JobBarGraph for debugging -->
	<div class="card p-4 mb-4">
		<JobBarGraph />
	</div>

	<SearchBox/>
</div>