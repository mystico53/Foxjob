<script>
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	// Props
	export let min = 0;
	export let max = 100;
	export let step = 1;
	export let value = min;
	export let id = null;
	export let className = '';
	export let disabled = false;

	// Node Bindings
	let container;
	let track;
	let element;

	// Internal State
	let percentage = ((value - min) / (max - min)) * 100;

	// Dispatch 'change' events
	const dispatch = createEventDispatcher();

	function handleChange(e) {
		if (disabled) return;
		value = +e.target.value;
		percentage = ((value - min) / (max - min)) * 100;
		dispatch('change', { value });
	}

	// Calculate percentage for dynamic gradient
	$: percentage = ((value - min) / (max - min)) * 100;
</script>

<div class={'range-container ' + className} bind:this={container}>
	<div class="slider-track" bind:this={track}>
		<input
			type="range"
			{id}
			{disabled}
			{min}
			{max}
			{step}
			bind:value
			style="background: linear-gradient(to right, #d1d5db 0%, #d1d5db {percentage}%, #f97316 {percentage}%, #f97316 100%);"
			on:input={handleChange}
			on:change={handleChange}
			bind:this={element}
		/>
	</div>

	<div class="pips">
		{#each Array(Math.floor((max - min) / step) + 1) as _, i}
			{@const pipValue = min + i * step}
			{@const pipPosition = ((i * step) / (max - min)) * 100}
			<div class="pip-container" style="left: {pipPosition}%">
				<div class="pip"></div>
				<div class="pip-text">{pipValue}</div>
			</div>
		{/each}
	</div>
	<slot />
</div>

<style>
	.range-container {
		width: 100%;
		margin: 20px 0;
		position: relative;
	}

	.slider-track {
		position: relative;
		height: 8px;
		width: 100%;
	}

	input[type='range'] {
		-webkit-appearance: none;
		width: 100%;
		height: 8px;
		border-radius: 4px;
		outline: none;
		background: #d1d5db;
		position: absolute;
		top: 0;
		left: 0;
		margin: 0;
		padding: 0;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #f97316;
		cursor: pointer;
		border: 2px solid #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		position: relative;
		z-index: 2;
	}

	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #f97316;
		cursor: pointer;
		border: 2px solid #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		position: relative;
		z-index: 2;
	}

	input[type='range']:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	input[type='range']:disabled::-webkit-slider-thumb {
		cursor: not-allowed;
	}

	input[type='range']:disabled::-moz-range-thumb {
		cursor: not-allowed;
	}

	.pips {
		position: relative;
		width: 100%;
		height: 30px;
		margin-top: 10px;
	}

	.pip-container {
		position: absolute;
		transform: translateX(-50%);
	}

	.pip {
		width: 2px;
		height: 10px;
		background: #aaa;
		margin: 0 auto;
	}

	.pip-text {
		margin-top: 2px;
		font-size: 12px;
		color: #666;
		text-align: center;
	}
</style>
