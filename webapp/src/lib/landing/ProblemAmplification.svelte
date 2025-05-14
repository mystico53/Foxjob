<script>
  import { onMount } from 'svelte';
  let percent = 0;
  let percentInterval;
  const targetPercent = 83;
  let inView = false;
  let sectionRef;

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

  // Intersection Observer for scroll-triggered animation
  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inView = true;
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef) observer.observe(sectionRef);
    return () => {
      if (sectionRef) observer.unobserve(sectionRef);
    };
  });

  $: if (inView) {
    if (percent < targetPercent) {
      clearInterval(percentInterval);
      percentInterval = setInterval(() => {
        if (percent < targetPercent) {
          percent += 1;
        } else {
          clearInterval(percentInterval);
        }
      }, 20);
    }
  }
</script>

<div bind:this={sectionRef} class="py-16">
    <h2 class="h2 mb-12 pt-8 pb-0 text-center font-bold">Job descriptions: the part nobody enjoys</h2>
  <div class="flex flex-col md:flex-row items-center justify-center w-full">
    <!-- Left: Donut Chart -->
    <div class="flex items-center p-12">
      <svg viewBox="0 0 120 120" class="w-40 h-40 drop-shadow-xl z-20" style="filter:drop-shadow(0 4px 16px rgba(241,90,34,0.12));">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#F3F4F6" stroke-width="12" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke="#F15A22" stroke-width="12"
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
      <p class="text-lg text-gray-700 dark:text-gray-300 font-heavy">83% of professionals find that searching takes too much time - and miss opportunities</p>
    </div>
  </div>
</div>

<style>
  /* Match HowItWorks.svelte heading style */
  .h2 {
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 700;
  }
  @media (min-width: 768px) {
    .h2 {
      font-size: 2.5rem;
      line-height: 1.2;
    }
  }
</style> 