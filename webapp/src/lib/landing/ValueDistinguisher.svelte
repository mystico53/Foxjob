<!-- ValueDistinguisher.svelte -->
<script>
    const features = [
      {
        title: 'Job Search on Autopilot',
        description: 'Skip the endless reading. FoxJob handles the tedious parts of job hunting, so you can focus on what matters - landing your next role.'
      },
      {
        title: 'Smart Matching',
        description: 'Our AI finds jobs that fit you perfectly. No more guessing if you\'re qualified - we\'ll tell you exactly where you stand.'
      },
      {
        title: 'Make Your Application Count',
        description: 'While FoxJob handles the busy work of searching, you can spend time crafting personalized messages that catch employers\' attention.'
      },
      {
        title: 'Learn & Improve',
        description: 'Your AI partner gets smarter with every search, fine-tuning your results based on what works best for you.'
      }
    ];
  </script>
  
  <div class="container mx-auto px-4 py-16">
    <h2 class="h2 text-center mb-12">Why Choose FoxJob?</h2>
  
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each features as feature}
        <div class="card card-hover p-6 space-y-4 bg-white rounded-lg shadow-lg">
          <h3 class="h3">{feature.title}</h3>
          <p class="text-base">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
  
  <style>
    /* You can add custom styles here if needed */
    :global(.card-hover) {
      transition: transform 0.2s ease-in-out;
    }
    
    :global(.card-hover:hover) {
      transform: translateY(-4px);
    }
  </style>