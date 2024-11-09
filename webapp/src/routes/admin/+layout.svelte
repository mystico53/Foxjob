
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    const ADMIN_PASSWORD = 'foxie';
    let isAuthenticated = false;

    onMount(() => {
        const adminAuth = sessionStorage.getItem('adminAuth');
        if (adminAuth !== ADMIN_PASSWORD) {
            goto('/admin');
        } else {
            isAuthenticated = true;
        }
    });
</script>

{#if isAuthenticated}
    <slot />
{/if}