<!-- HowItWorks.svelte -->
<script>
  
    const steps = [
      {
        number: 1,
        title: 'Set up',
        description: 'Upload your resume and install our Chrome extension (takes 32 secs).'
      },
      {
        number: 2,
        title: 'Scan it!',
        description: 'Analyse any job description with a buttonpress, no more reading.'
      },
      {
        number: 3,
        title: 'Your personal assesment',
        description: 'Out of five scanned jobs, apply to only one, ignore the rest.'
      }
    ];
  </script>
  
  <div class="container bg-tertiary-300 mx-auto px-4 py-16">
    <h2 class="h2 text-center mb-12">I have a job description, now what?</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 mb-12">
        {#each steps as step}
          <div class="flex flex-col items-start px-8">
            <div class="flex items-center gap-4 mb-4">
                <iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
              <h3 class="font-base">
                <span class="font-semibold">Step {step.number}: </span>
                <span class="font-medium">{step.title}</span>
              </h3>
            </div>
            <p class="text-base">{step.description}</p>
          </div>
        {/each}
      </div>
  
    <!-- Demo/Screenshot Area -->
    <div class="card p-4 bg-tertiary-700 rounded-lg" style="height: 400px;">
      <!-- Placeholder for demo/screenshot -->
      <div class="w-full h-full flex items-center justify-center text-surface-600">
        <p>Demo Area / Screenshot</p>
      </div>
    </div>
  </div>