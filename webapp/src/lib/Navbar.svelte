<script>
	import { page } from '$app/stores';
	import { authStore } from '../stores/authStore';
	import { AppBar, Avatar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';

	$: currentPath = $page.url.pathname;

	const navItems = [
		{ href: '/list', label: 'List' },
		{ href: '/cards', label: 'Cards' },
		{ href: '/match', label: 'Match' },
		{ href: '/workflow', label: 'Workflow' }
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
	background="bg-surface-100-800-token"
	class="px-4 py-2"
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
				<ul class="flex justify-center space-x-4">
					{#each navItems as { href, label }}
						<li>
							<a
								{href}
								class="btn btn-sm {currentPath === href ? 'variant-filled' : 'variant-ghost'}"
							>
								{label}
							</a>
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
