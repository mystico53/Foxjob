<script>
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/authStore';
	import { AppBar, Avatar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import foxIcon from '../assets/icon128.png';
	import FeedbackButton from '$lib/admincomponents/FeedbackButton.svelte';
	import { tooltipStore } from '$lib/stores/tooltipStore';

	let mobileMenuOpen = false;
	let profileDropdownOpen = false;

	function toggleProfileDropdown() {
		profileDropdownOpen = !profileDropdownOpen;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function handleTooltipClose() {
		tooltipStore.hideNavbarTooltip();
	}

	$: currentPath = $page.url.pathname;

	const navItems = [
		{ href: '/list', label: 'Home' },
		{ href: '/workflow', label: 'Jobs' }
		//{ href: '/search', label: 'Search' },
		//{ href: '/preferences', label: 'Your Preferences' },
		// { href: '/assessments', label: 'Assesments' },
		// { href: '/resume', label: 'My resume' },
	];

	function clickOutside(node) {
		const handleClick = (event) => {
			if (!node.contains(event.target)) {
				profileDropdownOpen = false;
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

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
	gridColumns="grid-cols-[1fr_2fr_1fr]"
	slotDefault="place-self-center"
	slotTrail="place-self-end"
>
	<svelte:fragment slot="lead">
		<div class="flex items-center gap-2 md:gap-4">
			<img src={foxIcon} alt="Fox Icon" class="!important h-6 w-6 md:h-8 md:w-8" />
			<strong class="foxjob-title text-lg uppercase md:text-xl">Foxjob</strong>
		</div>
	</svelte:fragment>

	<svelte:fragment slot="default">
		{#if $authStore}
			<div class="hidden md:block">
				<ul class="flex list-none justify-center space-x-8">
					<!-- First menu item with relative positioning -->
					<li class="relative px-4">
						<a
							href={navItems[0].href}
							class="text-base font-bold {currentPath === navItems[0].href
								? 'text-[#B45309]'
								: 'text-black-600 hover:text-gray-900'}"
						>
							{navItems[0].label}
						</a>
						{#if currentPath === navItems[0].href}
							<div class="absolute bottom-[-20px] left-[0%] h-1 w-[100%] bg-primary-500"></div>
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
								<div class="absolute bottom-[-20px] left-[0%] h-1 w-[100%] bg-primary-500"></div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="trail">
		<div class="flex items-center gap-4">
			<button class="btn btn-sm md:hidden" on:click={toggleMobileMenu}>
				<iconify-icon icon="solar:hamburger-menu-outline"></iconify-icon>
			</button>
			{#if $authStore}
				<div class="relative" use:clickOutside>
					<button on:click={toggleProfileDropdown} class="flex items-center focus:outline-none">
						<Avatar
							width="w-12"
							initials={$authStore.displayName?.charAt(0).toUpperCase() ??
								$authStore.email?.charAt(0).toUpperCase() ??
								'U'}
							background="bg-tertiary-500"
						/>
					</button>

					{#if profileDropdownOpen}
						<div
							class="absolute right-0 top-full z-10 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5"
						>
							<div class="py-1">
								<!-- Keep your FeedbackButton component but adjust the wrapper -->
								<div class="w-full">
									<FeedbackButton />
								</div>

								<!-- Logout button with matching styling -->
								<button
									class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
									on:click={handleLogout}
								>
									<div class="flex items-center gap-2">
										<iconify-icon icon="solar:logout-2-outline"></iconify-icon>
										Logout
									</div>
								</button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/auth/signin" class="variant-filled-primary btn btn-sm">Login</a>
			{/if}
		</div>
	</svelte:fragment>
</AppBar>

{#if mobileMenuOpen}
	<div class="w-full border-b-2 bg-white shadow-lg md:hidden">
		<ul class="flex list-none flex-col space-y-4 p-4">
			{#each navItems as { href, label }}
				<li>
					<a
						{href}
						class="text-base font-bold {currentPath === href ? 'text-[#B45309]' : 'text-black-600'}"
						on:click={() => (mobileMenuOpen = false)}
					>
						{label}
					</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}

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
