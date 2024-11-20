<script>
    
    import Hero from '$lib/landing/Hero.svelte';
    import Features from '$lib/landing/ValueDistinguisher.svelte';
    import Testimonials from '$lib/landing/HowItWorks.svelte';
    import CallToAction from '$lib/landing/FinalCTA.svelte';
  </script>
  
  <div class="container mx-auto px-4 max-w-6xl">
    
    <Hero />
    <Features />
    <Testimonials />
    <CallToAction />
  </div>

  <footer>
	<div class="container">
		<a class="privacy" href="/privacy" data-sveltekit-preload-data="off">
			Privacy Policy
		</a>
	</div>
</footer>