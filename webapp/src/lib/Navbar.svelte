<script>
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/authStore';
	import { AppBar, Avatar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import foxIcon from '../assets/icon128.png';
	import FeedbackButton from '$lib/admincomponents/FeedbackButton.svelte';
	import { tooltipStore } from '$lib/stores/tooltipStore';
	import OnboardingTooltip from '$lib/onboarding/OnboardingTooltip.svelte';

	function handleTooltipClose() {
		tooltipStore.hideNavbarTooltip();
	}

	$: currentPath = $page.url.pathname;

	const navItems = [
		{ href: '/list', label: 'Home' },
		{ href: '/workflow', label: 'Jobs' },
		{ href: '/search', label: 'Search' },
		// { href: '/assessments', label: 'Assesments' },
		// { href: '/resume', label: 'My resume' },
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
		<div class="flex items-center gap-4">
			<img src={foxIcon} alt="Fox Icon" class="h-8 w-8" />
			<strong class="foxjob-title text-xl uppercase">Foxjob</strong>
		</div>
	</svelte:fragment>

	<svelte:fragment slot="default">
		{#if $authStore}
			<div class="hidden md:block">
				<ul class="flex list-none justify-center space-x-8">
					<!-- First menu item with relative positioning -->
					<li class="relative px-4">
						{#if $tooltipStore.showThirdTooltip}
							<OnboardingTooltip
								title="Step 3"
								description="Time to scan your first job!"
								position="bottom"
								width="17rem"
								showCloseButton={true}
								onClose={() => tooltipStore.hideThirdTooltip()}
								primaryButtonText="See example job"
								primaryButtonLink="/list/example"
								secondaryButtonText="Close"
							/>
						{/if}
						<a
							href={navItems[0].href}
							class="text-base font-bold {currentPath === navItems[0].href
								? 'text-[#B45309]'
								: 'text-black-600 hover:text-gray-900'}"
						>
							{navItems[0].label}
						</a>
						{#if currentPath === navItems[0].href}
							<div class="bg-primary-500 absolute bottom-[-20px] left-[0%] h-1 w-[100%]"></div>
						{/if}
					</li>

					<!-- Rest of the menu items -->
					{#each navItems.slice(1) as { href, label }}
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
				<div class="relative">
					<!-- Add this wrapper -->
					<a
						href="https://chromewebstore.google.com/detail/foxjob/lbncdalbaajjafnpgplghkdaiflfihjp"
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
							title="Step 2"
							description="Add the extension to your browser"
							position="bottom"
							width="24rem"
							showCloseButton={true}
							onClose={handleTooltipClose}
						/>
					{/if}
				</div>
				<FeedbackButton />
				<button class="btn btn-sm variant-ghost" on:click={handleLogout}>Logout</button>
				<Avatar
					width="w-12"
					initials={$authStore.displayName?.charAt(0).toUpperCase() ??
						$authStore.email?.charAt(0).toUpperCase() ??
						'U'}
					background="bg-tertiary-500"
				/>
			{:else}
				<a href="/auth/signin" class="btn btn-sm variant-filled-primary">Login</a>
			{/if}
		</div>
	</svelte:fragment>
</AppBar>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Lalezar&display=swap');

	.foxjob-title {
		font-family: 'Lalezar', cursive;
		background: linear-gradient(to right, #fd5440 0%, #ff9c00 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		font-size: 32px;
		line-height: 1;
		letter-spacing: 0.02em;
	}

	/* Add these styles to ensure no bullets appear */
	:global(nav ul) {
		list-style-type: none !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(nav li) {
		list-style-type: none !important;
	}
</style>
