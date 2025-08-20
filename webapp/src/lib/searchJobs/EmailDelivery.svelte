<script>
	import Range from './Range.svelte';
	import dayjs from 'dayjs';
	import TimePicker from './TimePicker.svelte';
	export let jobEmailsEnabled = true;
	export let setJobEmailsEnabled = null;
	export let deliveryTime = '08:00';
	export let minimumScore = 50;
	export let setMinimumScore = null;
	export let isLoading = false;

	// Add the missing props
	export let updateEmailDelivery = null;
	export let setDeliveryTime = null;
	export let timeOptions = [];

	async function handleToggle(e) {
		const newState = e.target.checked;
		if (setJobEmailsEnabled) {
			await setJobEmailsEnabled(newState);
		}
		// Also call updateEmailDelivery if provided
		if (updateEmailDelivery) {
			await updateEmailDelivery(newState);
		}
	}

	function handleScore(val) {
		setMinimumScore?.(val);
	}

	function handleTimeChange(val) {
		if (setDeliveryTime) {
			setDeliveryTime(val);
		}
	}
</script>

<div class="email-delivery-section">
	<!-- Job Emails Toggle -->
	<div class="mb-6 flex items-center justify-between">
		<span class="text-xl font-bold">Email Delivery</span>
		<label class="relative inline-flex cursor-pointer items-center">
			<input
				type="checkbox"
				class="peer sr-only"
				checked={jobEmailsEnabled}
				on:change={handleToggle}
				disabled={isLoading}
			/>
			<div
				class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-orange-800"
			></div>
		</label>
	</div>
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- When to Receive Results (left column) -->
		<div>
			<label for="deliveryTime" class="mb-2 block font-bold">You'll get an email at:</label>
			<TimePicker
				bind:value={deliveryTime}
				on:change={(e) => handleTimeChange(e.detail.value)}
				{timeOptions}
			/>
		</div>
		<!-- Score Threshold Slider (right column) -->
		<div>
			<div class="mb-2 block text-center font-bold">You'll receive jobs scored {minimumScore}+</div>
			<Range
				min={50}
				max={90}
				step={10}
				id="score-threshold-slider"
				bind:value={minimumScore}
				disabled={!jobEmailsEnabled}
				className="clean-slider"
				on:change={(e) => handleScore(e.detail.value)}
			/>
			{#if !jobEmailsEnabled}
				<div class="mt-3 text-center text-gray-500">Job emails are turned off.</div>
			{/if}
		</div>
	</div>
</div>
