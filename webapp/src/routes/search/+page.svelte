<script>
	import SearchBox from '$lib/searchJobs/searchBox.svelte';
	import SearchResults from '$lib/searchJobs/searchResults.svelte';
	import GetSnapshots from '$lib/searchJobs/getSnapshots.svelte';
	import DownloadSnapshot from '$lib/searchJobs/downloadSnapshot.svelte';
  </script>
  
  <SearchBox/>
  <SearchResults/>
  <GetSnapshots datasetId="gd_lpfll7v5hcqtkxl6l"/>
  <DownloadSnapshot/>

