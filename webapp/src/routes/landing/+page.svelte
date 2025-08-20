<script>
	import Hero from '$lib/landing/Hero.svelte';
	import ProblemAmplification from '$lib/landing/ProblemAmplification.svelte';
	import Features from '$lib/landing/ValueDistinguisher.svelte';
	import Testimonials from '$lib/landing/HowItWorks.svelte';
	import TestimonialClassic from '$lib/landing/TestimonialClassic.svelte';
	import CallToAction from '$lib/landing/FinalCTA.svelte';
	import Footer from '$lib/landing/Footer.svelte';
</script>

<div class="container mx-auto max-w-6xl px-4">
	<Hero />
	<ProblemAmplification />
	<Features />
	<Testimonials />
	<TestimonialClassic
		text="Imagine someone actually cares to read your resume before suggesting jobs to you."
		name="Elowen Khouri, UX-Designer"
		avatar="/images/Elowen%20Khouri.png"
	/>
	<CallToAction />
	<Footer />
</div>
