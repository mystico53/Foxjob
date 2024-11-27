<script>
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/authStore';
	import { AppBar, Avatar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import foxIcon from '../assets/Fox_Icon_128x128-nobg.png';
	import FeedbackButton from '$lib/admincomponents/FeedbackButton.svelte';
	import { tooltipStore } from '$lib/stores/tooltipStore';
    import OnboardingTooltip from '$lib/onboarding/OnboardingTooltip.svelte';
    
    function handleTooltipClose() {
        tooltipStore.hideNavbarTooltip();
    }

	$: currentPath = $page.url.pathname;

	const navItems = [
		{ href: '/list', label: 'Home' },
		{ href: '/workflow', label: 'Jobs' }
	];

	async function handleLogout() {
		try {
			await authStore.signOut();
			goto('/landing');
		} catch (err) {
			console.error('Error signing out:', err);
		}
	}
</script>

<AppBar
	background="bg-white"
	class="border-b-2 px-4 py-2"
	style="border-color: rgb(107, 114, 128);"
	gridColumns="grid-cols-3"
	slotDefault="place-self-center"
	slotTrail="place-self-end"
>
	<svelte:fragment slot="lead">
		<div class="flex items-center gap-2">
			<img src={foxIcon} alt="Fox Icon" class="h-12 w-12" />
			<strong class="foxjob-title text-xl uppercase">Foxjob - internal test</strong>
		</div>
	</svelte:fragment>

	<svelte:fragment slot="default">
		{#if $authStore}
			<div class="hidden md:block">
				<ul class="flex justify-center space-x-8">
					{#each navItems as { href, label }}
						<li class="relative px-4">
							<a
								{href}
								class="text-base font-bold {currentPath === href
									? 'text-[#B45309]'
									: 'text-black-600 hover:text-gray-900'}"
							>
								{label}
							</a>
							{#if currentPath === href}
								<div class="bg-primary-500 absolute bottom-[-20px] left-[0%] h-1 w-[100%]"></div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="trail">
		<div class="flex items-center gap-4">
			{#if $authStore}
			<div class="relative"> <!-- Add this wrapper -->
                <a 
                    href="https://chromewebstore.google.com/detail/foxjob/lbncdalbaajjafnpgplghkdaiflghihjp" 
                    class="btn btn-sm variant-ghost flex items-center gap-2" 
                    title="Admin Panel" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    <iconify-icon icon="solar:download-minimalistic-outline"></iconify-icon>
                    Extension
                </a>
                {#if $tooltipStore.showNavbarTooltip}
                    <OnboardingTooltip
                        title="Ready to Start!"
                        description="Your resume is uploaded. Click here to start matching with jobs!"
                        position="bottom"
                        showCloseButton={true}
                        onClose={handleTooltipClose}
                    />
                {/if}
            </div>
			<FeedbackButton />
				<!-- Add the feedback button here -->
				<a href="/admin" class="btn btn-sm variant-ghost" title="Admin Panel">
					<iconify-icon icon="gis:coord-system-3d-alt"></iconify-icon>
				</a>
				<button class="btn btn-sm variant-ghost" on:click={handleLogout}>Logout</button>
				<Avatar
					width="w-12"
					initials={$authStore.email?.charAt(0).toUpperCase() ?? 'U'}
					background="bg-tertiary-500"
				/>
			{:else}
				<a href="/auth/signin" class="btn btn-sm variant-filled-primary">Login</a>
			{/if}
		</div>
	</svelte:fragment>
</AppBar>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Protest+Riot&display=swap');

	.foxjob-title {
		font-family: 'Protest Riot', sans-serif;
		background: linear-gradient(to right, #fd5440 0%, #ff9c00 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		font-size: 32px;
		line-height: 1;
		letter-spacing: 0.02em;
	}
</style>
