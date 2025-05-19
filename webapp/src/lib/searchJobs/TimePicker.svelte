<script>
  import { createEventDispatcher, onMount } from 'svelte';
  export let value = "08:00";
  const dispatch = createEventDispatcher();
  let hour = 0;
  let minute = 0;
  let period = "AM";
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const periods = ["AM", "PM"];
  let lastEmitted = "";

  function parseValue(val) {
    const [hrs, mins] = val.split(':').map(num => parseInt(num, 10));
    if (!isNaN(hrs) && !isNaN(mins)) {
      hour = hrs % 12 || 12;
      minute = mins;
      period = hrs >= 12 ? "PM" : "AM";
    }
  }
  onMount(() => parseValue(value));
  $: if (value !== lastEmitted) parseValue(value);

  function updateValue() {
    let hours24 = hour;
    if (period === "PM" && hour < 12) {
      hours24 = hour + 12;
    } else if (period === "AM" && hour === 12) {
      hours24 = 0;
    }
    const hoursStr = hours24.toString().padStart(2, '0');
    const minutesStr = minute.toString().padStart(2, '0');
    const newValue = `${hoursStr}:${minutesStr}`;
    if (newValue !== value) {
      lastEmitted = newValue;
      value = newValue;
      dispatch('change', value);
    }
  }
</script>

<style>
  .time-picker {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .select-container {
    min-width: 80px;
  }
  select {
    padding: 8px 12px;
    border: 1px solid #d7dada;
    border-radius: 4px;
    background-color: white;
    font-size: 14px;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2...%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%234a40d4%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 28px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  select:hover {
    border-color: #b8bac0;
  }
  select:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
  }
  label {
    font-size: 14px;
    color: #555;
    margin-right: 5px;
  }
</style>

<div class="time-picker">
  <div class="select-container">
    
    <select id="hour" bind:value={hour} on:change={updateValue}>
      {#each hours as h}
        <option value={h}>{h}</option>
      {/each}
    </select>
  </div>
  <div class="select-container">
    
    <select id="minute" bind:value={minute} on:change={updateValue}>
      {#each minutes as m}
        <option value={m}>{m.toString().padStart(2, '0')}</option>
      {/each}
    </select>
  </div>
  <div class="select-container">
    
    <select id="period" bind:value={period} on:change={updateValue}>
      {#each periods as p}
        <option value={p}>{p}</option>
      {/each}
    </select>
  </div>
</div> 