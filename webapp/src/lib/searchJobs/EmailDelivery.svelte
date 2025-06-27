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
  <div class="flex items-center justify-between mb-6">
    <span class="text-xl font-bold">Email Delivery</span>
    <label class="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        class="sr-only peer"
        checked={jobEmailsEnabled}
        on:change={handleToggle}
        disabled={isLoading}
      >
      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
    </label>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <!-- When to Receive Results (left column) -->
    <div>
      <label for="deliveryTime" class="block font-bold mb-2">You'll get an email at:</label>
      <TimePicker 
        bind:value={deliveryTime} 
        on:change={e => handleTimeChange(e.detail.value)}
        {timeOptions}
      />
    </div>
    <!-- Score Threshold Slider (right column) -->
    <div>
      <div class="block font-bold mb-2 text-center">You'll receive jobs scored {minimumScore}+</div>
      <Range
        min={50}
        max={90}
        step={10}
        id="score-threshold-slider"
        bind:value={minimumScore}
        disabled={!jobEmailsEnabled}
        className="clean-slider"
        on:change={e => handleScore(e.detail.value)}
      />
      {#if !jobEmailsEnabled}
        <div class="text-center mt-3 text-gray-500">Job emails are turned off.</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .toggle-checkbox {
    width: 2rem;
    height: 1rem;
    border-radius: 1rem;
    background: #e5e7eb;
    appearance: none;
    outline: none;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
  }
  .toggle-checkbox:checked {
    background: #f97316;
  }
  .toggle-checkbox:before {
    content: '';
    position: absolute;
    left: 0.15rem;
    top: 0.15rem;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
  }
  .toggle-checkbox:checked:before {
    transform: translateX(1rem);
  }
</style> 