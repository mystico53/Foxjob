<script>
    const features = [
      {
        icon: 'ph:scan-smiley-bold',
        title: 'Bye bye endless reading',
        description: 'FoxJob uses LLM Agents to read job descriptions for you, we will tell you which ones matter.'
      },
      {
        icon: 'icon-park-outline:scoreboard',
        title: 'No more guessing',
        description: 'Our Algorithms compare your skills with the job requirements - and tell you if you\'re qualified.'
      },
      {
        icon: 'bxs:star-half',
        title: 'Quality, not quantity',
        description: 'Don\'t apply to 100 jobs, you now have time to focus on the best matches.'
      }
    ];
</script>

<div class="container mx-auto px-4 py-16 pb-22">
    <h2 class="h2 text-center py-8 font-bold mb-12">Why Choose FoxJob?</h2>
  
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each features as feature}
        <div class="card card-hover p-12 bg-white rounded-lg shadow-lg flex flex-col items-center">
          <iconify-icon icon={feature.icon} class="text-6xl"></iconify-icon>
          <h3 class="min-h-[3rem] py-8 font-bold font-base mb-4 text-center">{feature.title}</h3>
          <p class="text-base">{feature.description}</p>
        </div>
      {/each}
    </div>
</div>
  
<style>
    :global(.card-hover) {
      transition: transform 0.2s ease-in-out;
    }
    
    :global(.card-hover:hover) {
      transform: translateY(-4px);
    }
</style>