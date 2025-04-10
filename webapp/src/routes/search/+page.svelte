<script>
	import SearchBox from '$lib/searchJobs/searchBox.svelte';
	import SearchResults from '$lib/searchJobs/searchResults.svelte';
	import GetSnapshots from '$lib/searchJobs/getSnapshots.svelte';
	import DownloadSnapshot from '$lib/searchJobs/downloadSnapshot.svelte';
  import ScrapeJobsTable from '$lib/searchJobs/ScrapeJobsTable.svelte';
  import TestEmailButton from '$lib/searchJobs/TestEmailButton.svelte';


  </script>
  <TestEmailButton/>
  <SearchBox/>

  <SearchResults/>
  <ScrapeJobsTable/>
  <DownloadSnapshot/>
  <GetSnapshots datasetId="gd_lpfll7v5hcqtkxl6l"/>

  
