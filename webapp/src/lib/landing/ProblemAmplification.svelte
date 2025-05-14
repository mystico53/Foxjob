<script>
  import { onMount } from 'svelte';
  let percent = 83;

  // CSS variables for color, spacing, shadow
  const cssVars = {
    '--brand-orange': '#F15A22',
    '--brand-orange-muted': '#F15A22',
    '--card-bg': '#FFF9F6',
    '--card-shadow': '0px 8px 24px rgba(0,0,0,0.06)',
    '--card-border': '#F3F4F6',
    '--headline-spacing': '-0.5px',
    '--card-radius': '8px',
    '--card-padding': '2rem',
    '--card-gap': '40px',
  };
</script>

<div class="py-16">
    
  <div class="flex flex-col md:flex-row items-center justify-center w-full">
    <!-- Left: Donut Chart -->
    <div class="flex items-center p-12">
      <svg viewBox="0 0 120 120" class="w-40 h-40 drop-shadow-xl z-20" style="filter:drop-shadow(0 4px 16px rgba(241,90,34,0.12));">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#F3F4F6" stroke-width="6" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke="#F15A22" stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="339.292"
          stroke-dashoffset="{339.292 * (1 - percent / 100)}"
          style="transition: stroke-dashoffset 1.2s cubic-bezier(.4,2,.6,1);"
        />
        <text x="50%" y="54%" text-anchor="middle" class="fill-[#F15A22] font-extrabold text-4xl" dominant-baseline="middle">{percent}%</text>
      </svg>
    </div>
    <!-- Right: Text -->
    <div class="flex flex-col items-center md:items-start text-center md:text-left justify-center ml-2">
        <p class="text-2xl py-4 text-gray-700 dark:text-gray-300 font-bold">Missed opportunities</p>
        <p class="text-lg text-gray-700 dark:text-gray-300 font-heavy">83% of professionals find that reading job descriptions takes too much time</p>
    </div>
  </div>
</div>

<style>
  @media (min-width: 768px) {
  }
</style> 