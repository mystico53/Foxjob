<!-- HowItWorks.svelte -->
<script>
  
    const steps = [
      {
        number: 1,
        title: 'Get started:',
        description: 'Upload your resume and Install our Chrome extension'
      },
      {
        number: 2,
        title: 'Import your resume',
        description: 'Import your resume and view assessments for saved jobs on the web app.'
      },
      {
        number: 3,
        title: 'See job assessments',
        description: 'See job assessments including match score, and matches for hard skills, soft skills, and domain expertise.'
      }
    ];
  </script>
  
  <div class="container mx-auto px-4 py-16">
    <h2 class="h2 text-center mb-12">How it Works?</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {#each steps as step}
          <div class="flex flex-col items-start">
            <div class="flex items-center gap-4 mb-4">
                <iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
              <h3 class="h4">
                <span class="font-semibold">Step {step.number}: </span>
                <span class="font-medium">{step.title}</span>
              </h3>
            </div>
            <p class="text-base">{step.description}</p>
          </div>
        {/each}
      </div>
  
    <!-- Demo/Screenshot Area -->
    <div class="card p-4 bg-surface-200 rounded-lg" style="height: 400px;">
      <!-- Placeholder for demo/screenshot -->
      <div class="w-full h-full flex items-center justify-center text-surface-600">
        <p>Demo Area / Screenshot</p>
      </div>
    </div>
  </div>