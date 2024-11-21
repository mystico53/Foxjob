<script>
	import Datatable from '$lib/Dashboard/Datatable.svelte';
	import CollectionLoader from '$lib/Dashboard/CollectionLoader.svelte';
	import JobCountGraph from '$lib/Dashboard/JobCountGraph.svelte';
	import OnboardingProgress from '$lib/onboarding/OnboardingProgress.svelte';
</script>

<!-- Parent container -->
<div class="container mx-auto w-full p-4 lg:w-3/4 xl:w-1/2">
	<!-- Made container smaller -->
	<OnboardingProgress />
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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

	<!-- Datatable below the columns -->
	<div class="card mt-4 pt-6">
		<Datatable />
	</div>
</div>
