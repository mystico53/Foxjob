<!-- $lib\admincomponents\FeedbackModal.svelte -->
<script>
	import { fade } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let show = false;
	export let title = '';

	function close() {
		dispatch('close');
	}
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && close()} />

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		aria-labelledby={title ? 'modal-title' : undefined}
	>
		<!-- Backdrop -->
		<button
			class="fixed inset-0 cursor-default bg-black/50"
			on:click={close}
			aria-label="Close modal"
		/>

		<!-- Modal content -->
		<article class="relative z-10 mx-auto max-w-xl rounded-lg bg-white p-12" transition:fade>
			{#if title}
				<h2 id="modal-title" class="mb-4 text-xl font-bold">{title}</h2>
			{/if}
			<slot />
		</article>
	</div>
{/if}
