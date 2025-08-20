<script>
	let response = null;
	let loading = false;
	let error = null;

	const jobId = '4072233330';
	const userId = 'VCvUK0pLeDVXJ0JHJsNBwxLgvdO2';
	const topicName = 'job-embedding-requests';

	async function triggerPubSub() {
		loading = true;
		error = null;
		response = null;

		try {
			const res = await fetch('http://127.0.0.1:5001/jobille-45494/us-central1/testPubSub', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					jobId: jobId,
					firebaseUid: userId,
					topicName: topicName
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			response = await res.json();
			console.log('PubSub response:', response);
		} catch (err) {
			error = err.message;
			console.error('Error triggering PubSub:', err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-xl p-4">
	<h2 class="mb-4 text-xl font-bold">PubSub Test Component</h2>

	<div class="mb-4">
		<p class="mb-2 text-sm text-gray-600">Using values:</p>
		<ul class="list-disc pl-5 text-sm text-gray-600">
			<li>Job ID: {jobId}</li>
			<li>User ID: {userId}</li>
			<li>Topic: {topicName}</li>
		</ul>
	</div>

	<button
		on:click={triggerPubSub}
		class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
		disabled={loading}
	>
		{loading ? 'Triggering...' : 'Trigger PubSub'}
	</button>

	{#if error}
		<div class="mt-4 rounded border border-red-300 bg-red-100 p-3 text-red-700">
			Error: {error}
		</div>
	{/if}

	{#if response}
		<div class="mt-4 rounded border border-green-300 bg-green-100 p-3">
			<h3 class="mb-2 font-semibold text-green-700">Success!</h3>
			<pre class="whitespace-pre-wrap text-sm">{JSON.stringify(response, null, 2)}</pre>
		</div>
	{/if}
</div>
