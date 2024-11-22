<!-- src/components/JobsProcessing.svelte -->
<script>
	import { processingJobs, loading, error } from '$lib/stores/jobStore';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { getAuth } from 'firebase/auth';
	import { db } from '$lib/firebase';
	import { doc, updateDoc } from 'firebase/firestore';

	async function updateProcessingStatus(jobId, newStatus) {
		try {
			const auth = getAuth();
			const userId = auth.currentUser?.uid;

			if (!userId) {
				throw new Error('No user logged in');
			}

			const jobRef = doc(db, 'users', userId, 'jobs', jobId);
			await updateDoc(jobRef, {
				'generalData.processingStatus': newStatus
			});
		} catch (err) {
			console.error('Failed to update processing status:', err);
		}
	}

	async function cancelProcessing(jobId) {
		await updateProcessingStatus(jobId, 'cancelled');
	}

	async function retryProcessing(jobId) {
		await updateProcessingStatus(jobId, 'processing');
	}

	function getStatusColor(status) {
		switch (status) {
			case 'processing':
				return 'variant-filled-primary';
			case 'error':
				return 'variant-filled-error';
			case 'cancelled':
				return 'variant-filled-warning';
			default:
				return 'variant-filled-surface';
		}
	}
</script>

{#if $loading}
	<div class="flex h-32 items-center justify-center">
		<ProgressRadial width="w-12" />
	</div>
{:else if $error}
	<div class="alert variant-filled-error">
		<span>{$error}</span>
	</div>
{:else}
	<div class="container mx-auto p-4">
		<h2 class="h2 mb-4">Processing Jobs ({$processingJobs.length})</h2>
		{#if $processingJobs.length > 0}
			<div class="card variant-glass">
				<table class="table-compact table-hover table">
					<thead>
						<tr>
							<th class="table-cell-fit">ID</th>
							<th class="table-cell-fit">Status</th>
							<th>Timestamp</th>
							<th class="text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each $processingJobs as job (job.id)}
							<tr>
								<!-- ID -->
								<td class="font-mono text-sm">{job.id}</td>

								<!-- Status with spinner -->
								<td>
									<div class="flex items-center gap-2">
										<span class="badge {getStatusColor(job.generalData?.processingStatus)}">
											{job.generalData?.processingStatus || 'processing'}
										</span>
										{#if job.generalData?.processingStatus === 'processing'}
											<ProgressRadial width="w-4" stroke={100} />
										{/if}
									</div>
								</td>

								<!-- Timestamp -->
								<td class="text-sm">
									{#if job.generalData.timestamp}
										{new Date(job.generalData.timestamp?.toDate()).toLocaleString()}
									{/if}
								</td>

								<!-- Actions -->
								<td class="text-right">
									<div class="flex justify-end gap-2">
										{#if job.generalData?.processingStatus === 'processing'}
											<button
												class="btn variant-filled-error btn-sm"
												on:click={() => cancelProcessing(job.id)}
											>
												Cancel
											</button>
										{:else}
											<button
												class="btn variant-filled-success btn-sm"
												on:click={() => retryProcessing(job.id)}
											>
												Retry
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="card variant-glass p-4 text-center">
				<p>No jobs currently processing</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Add some padding to table cells */
	td {
		padding: 0.75rem 1rem;
	}

	/* Keep table headers aligned with content */
	th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: bold;
	}

	/* Ensure the table takes full width */
	table {
		width: 100%;
	}

	/* Add hover effect to rows */
	tr:hover {
		background-color: rgb(var(--color-surface-500) / 0.1);
	}
</style>
