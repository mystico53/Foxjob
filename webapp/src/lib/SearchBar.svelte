<script>
	import { searchText } from '$lib/stores/jobStore';
	let searchInput = '';

	// Debounce the search to avoid too many updates
	let timeout;
	function handleSearch(event) {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			$searchText = searchInput;
		}, 300);
	}
</script>

<div class="border-b p-4">
	<div class="relative">
		<input
			type="text"
			bind:value={searchInput}
			on:input={handleSearch}
			placeholder="Search jobs..."
			class="focus:ring-primary-500 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2"
		/>
		<svg
			class="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	</div>
</div>
