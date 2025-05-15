<script>
  import { onMount } from 'svelte';
  let percent = 0;
  const targetPercent = 83;
  let hasAnimated = false;
  let donutRef;
  let donutVisible = false;

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

  function animatePercent() {
    let start = null;
    const duration = 2000;
    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      percent = Math.floor(progress * targetPercent);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        percent = targetPercent;
      }
    }
    requestAnimationFrame(step);
  }

  onMount(() => {
    function onScroll() {
      if (!hasAnimated) {
        hasAnimated = true;
        donutVisible = true;
        setTimeout(() => {
          animatePercent();
        }, 100);
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<div class="py-16">
    
  <div class="flex flex-col md:flex-row items-center justify-center w-full">
    <!-- Left: Donut Chart -->
    <div class="flex items-center p-12">
      <svg bind:this={donutRef} viewBox="0 0 120 120" class="w-40 h-40 drop-shadow-xl z-20" style="filter:drop-shadow(0 4px 16px rgba(241,90,34,0.12)); opacity: {donutVisible ? 1 : 0}; transition: opacity 0.4s;">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#F3F4F6" stroke-width="6" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke="#F15A22" stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="339.292"
          stroke-dashoffset="{339.292 * (1 - percent / 100)}"
          style="transition: stroke-dashoffset 2.4s cubic-bezier(.4,2,.6,1);"
          transform="rotate(-90 60 60)"
        />
        <text x="50%" y="54%" text-anchor="middle" class="fill-[#F15A22] font-normal text-4xl" dominant-baseline="middle">
          {hasAnimated ? percent + '%' : ''}
        </text>
      </svg>
    </div>
    <!-- Right: Text -->
    <div class="flex flex-col items-center md:items-start text-center md:text-left justify-center ml-2">
        <p class="text-2xl py-4 text-gray-700 dark:text-gray-300 font-bold">
          <span
            class="uncover"
            class:uncover-active={donutVisible}
            style="display: inline-block;"
          >Missed</span> opportunities
        </p>
        <p class="text-lg text-gray-700 dark:text-gray-300 font-heavy">83% of professionals find that reading job descriptions takes too much time</p>
    </div>
  </div>
</div>

<style>
  @media (min-width: 768px) {
  }

  .uncover {
    /* Start fully clipped (hidden from right) */
    clip-path: inset(0 0 0 100%);
    opacity: 0;
    transition:
      clip-path 2s cubic-bezier(.4,2,.6,1),
      opacity 0.4s;
  }
  .uncover.uncover-active {
    /* End fully visible */
    clip-path: inset(0 0 0 0);
    opacity: 1;
    transition:
      clip-path 2s cubic-bezier(.4,2,.6,1),
      opacity 0.4s;
  }
</style> 