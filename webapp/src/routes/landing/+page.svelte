<script>
    
    import Hero from '$lib/landing/Hero.svelte';
    import ProblemAmplification from '$lib/landing/ProblemAmplification.svelte';
    import Features from '$lib/landing/ValueDistinguisher.svelte';
    import Testimonials from '$lib/landing/HowItWorks.svelte';
    import CallToAction from '$lib/landing/FinalCTA.svelte';
    import Footer from '$lib/landing/Footer.svelte';
  </script>
  
  <div class="container mx-auto px-4 max-w-6xl">
    
    <Hero />
    <ProblemAmplification />
    <Features />
    <Testimonials />
    <div class="my-16 flex flex-col items-center justify-center">
      <blockquote class="text-2xl italic text-center text-gray-800 dark:text-gray-200 max-w-2xl font-medium">
        "It's like having someone who actually read your resume doing the searching."
      </blockquote>
    </div>
    <CallToAction />
    <Footer />
  </div>
