<script>
  import Range from './Range.svelte';
  import dayjs from 'dayjs';
  import TimePicker from './TimePicker.svelte';
  export let jobEmailsEnabled = true;
  export let setJobEmailsEnabled = null;
  export let deliveryTime = '08:00';
  export let setDeliveryTime = null;
  export let minimumScore = 70;
  export let setMinimumScore = null;

  function handleToggle(e) {
    setJobEmailsEnabled?.(e.target.checked);
  }
  function handleScore(val) {
    setMinimumScore?.(val);
  }
</script>

<div class="email-delivery-section">
  <!-- Job Emails Toggle -->
  <div class="flex items-center justify-between mb-6">
    <span class="text-xl font-bold">Email Delivery</span>
    <div class="flex items-center">
      <input id="job-emails-toggle" type="checkbox" checked={jobEmailsEnabled} on:change={handleToggle} class="toggle-checkbox" />
      <span class="ml-2 font-semibold">{jobEmailsEnabled ? 'On' : 'Off'}</span>
    </div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <!-- When to Receive Results (left column) -->
    <div>
      <label for="deliveryTime" class="block font-bold mb-2">You'll get an email at:</label>
      <TimePicker bind:value={deliveryTime} />
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
  .clean-slider input[type="range"] {
    background: linear-gradient(to right, #f97316 0%, #f97316 var(--percentage), #e5e7eb var(--percentage), #e5e7eb 100%);
    box-shadow: none;
    height: 6px;
  }
  .clean-slider input[type="range"]::-webkit-slider-thumb {
    background: #f97316;
    box-shadow: none;
    border: 2px solid #fff;
  }
  .clean-slider input[type="range"]::-moz-range-thumb {
    background: #f97316;
    box-shadow: none;
    border: 2px solid #fff;
  }
  .clean-slider input[type="range"]::-ms-thumb {
    background: #f97316;
    box-shadow: none;
    border: 2px solid #fff;
  }
  .clean-slider .pips, .clean-slider .pip, .clean-slider .pip-text {
    display: none;
  }
</style> 