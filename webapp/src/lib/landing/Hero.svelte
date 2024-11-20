<!-- Hero.svelte -->
<script>
	import LandingNav from '$lib/landing/LandingNav.svelte';
  </script>
  
  <div class="gradient-background">
	
	<div class="container px-4 pb-16">
		<LandingNav />
		<div class="grid pl-14 pt-12 grid-cols-1 md:grid-cols-2 gap-8">
		<!-- Left Column: Content -->
		<div class="space-y-6">
			<h1 class="h1 font-bold" style="line-height: 1.3;">Better job search results with <strong class="foxjob-title uppercase text-5xl">Foxjob</strong></h1>
		  <h2 class="h4 font-normal pb-20">Reading job description sucks. Foxjob does that for you, and tells you which jobs are the right fit for you.</h2>
		  <button
			type="button"
			class="btn px-4 font-bold text-white shadow-lg shadow-[#DC3701]/20 hover:brightness-110 hover:-translate-y-0.5 transition-all"
			style="background-color: #DC3701; border-radius: 0.250rem;"
		  >
			Request early access
		  </button>
		</div>
		
		<!-- Right Column: Image -->
		<div class="flex justify-center">
		  <img
			src="/images/fox-hero.png"
			alt="Fox hero illustration"
			class="w-72 h-72 rounded-lg"
		  />
		</div>
	  </div>
	</div>
  </div>
  
  <style>
	@import url('https://fonts.googleapis.com/css2?family=Protest+Riot&display=swap');
	
	.gradient-background {
	  background: linear-gradient(to top, 
		rgba(220, 55, 1, 0.15) 0%,    /* DC3701 with 25% opacity */
		rgba(255, 156, 0, 0.15) 54%,  /* FF9C00 with 25% opacity */
		rgba(66, 153, 225, 0.15) 100% /* 4299E1 with 25% opacity */
	  );
	  width: 100%;
	}
  
	/* If you want to ensure the gradient covers the full viewport width */
	:global(body) {
	  margin: 0;
	  padding: 0;
	}

	

	.foxjob-title {
		font-family: 'Protest Riot', sans-serif;
		background: linear-gradient(to right, #fd5440 0%, #ff9c00 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		font-size: 40px;
		line-height: 1;
		letter-spacing: 0.02em;
	}
  </style>