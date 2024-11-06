<script>
	import { page } from '$app/stores';
	import { authStore } from '../stores/authStore';
	import { AppBar, Avatar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';

	$: currentPath = $page.url.pathname;

	const navItems = [
		{ href: '/list', label: 'Dashboard' },
		{ href: '/workflow', label: 'Scanned Jobs' }
	];

	async function handleLogout() {
		try {
			await authStore.signOut();
			goto('/');
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
		<strong class="text-xl uppercase">Foxbjob</strong>
	</svelte:fragment>

	<svelte:fragment slot="default">
		{#if $authStore}
			<div class="hidden md:block">
				<ul class="flex justify-center space-x-8">
					{#each navItems as { href, label }}
						<li class="relative pb-2">
							<a
								{href}
								class="text-base font-medium {currentPath === href
									? 'text-[#B45309]'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								{label}
							</a>
							{#if currentPath === href}
								<div class="absolute bottom-[-24px] left-0 h-0.5 w-full bg-[#B45309]"></div>
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
				<button class="btn btn-sm variant-ghost" on:click={handleLogout}>Logout</button>
				<Avatar
					initials={$authStore.email?.charAt(0).toUpperCase() ?? 'U'}
					background="bg-primary-500"
				/>
			{:else}
				<a href="/auth/signin" class="btn btn-sm variant-filled-primary">Login</a>
			{/if}
		</div>
	</svelte:fragment>
</AppBar>
