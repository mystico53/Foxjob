<!-- src/lib/onboarding/OnboardingTooltip.svelte -->
<script>
	export let title = '';
	export let description = '';
	export let position = 'left';
	export let showCloseButton = false;
	export let onClose = () => {};
	export let width = '300px';
	export let offset = '0.5rem';
	export let primaryButtonText = 'Add to chrome';
	export let primaryButtonLink =
		'https://chromewebstore.google.com/detail/foxjob/lbncdalbaajjafnpgplghkdaiflfihjp';
	export let secondaryButtonText = 'I added the extension';
</script>

<div
	class="tooltip-container card bg-tertiary-700 {position}"
	role="tooltip"
	aria-label={title}
	style="--tooltip-width: {width}; --tooltip-offset: {offset};"
>
	<!-- Arrow element -->
	<div class="arrow {position}" />

	<div class="flex flex-col gap-2 p-4">
		{#if title}
			<h3 class="h3">{title}</h3>
		{/if}
		<p>{description}</p>
		{#if showCloseButton}
			<div class="flex gap-2">
				<button class="variant-filled-surface btn" on:click={onClose} data-popup-close>
					{secondaryButtonText}
				</button>
				<a
					href={primaryButtonLink}
					target="_blank"
					rel="noopener noreferrer"
					class="variant-filled-primary btn"
				>
					{primaryButtonText}
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.tooltip-container {
		position: absolute;
		z-index: 999;
		width: var(--tooltip-width, 200px);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.tooltip-container.bottom {
		top: calc(100% + var(--tooltip-offset, 0.5rem));
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-container.top {
		bottom: calc(100% + var(--tooltip-offset, 0.5rem));
		left: 50%;
		transform: translateX(-50%);
	}

	/* Arrow styling */
	.arrow {
		position: absolute;
		width: 0;
		height: 0;
		border: solid 8px transparent;
	}

	.arrow.bottom {
		top: -16px;
		left: 50%;
		transform: translateX(-50%);
		border-bottom-color: rgb(var(--color-tertiary-700));
	}

	.arrow.top {
		bottom: -16px;
		left: 50%;
		transform: translateX(-50%);
		border-top-color: rgb(var(--color-tertiary-700));
	}

	.arrow.left {
		right: -16px;
		top: 50%;
		transform: translateY(-50%);
		border-left-color: rgb(var(--color-tertiary-700));
	}

	.arrow.right {
		left: -16px;
		top: 50%;
		transform: translateY(-50%);
		border-right-color: rgb(var(--color-tertiary-700));
	}
</style>
