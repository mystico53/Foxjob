
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import FeedbackTable from '$lib/admincomponents/FeedbackTable.svelte';
    import UserTable from '$lib/admincomponents/UserTable.svelte';
    import OpenFeedbackTable from '$lib/admincomponents/OpenFeedbackTable.svelte';
    
    const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
    let isAuthenticated = false;
    let password = '';
    let error = '';

    onMount(() => {
        const adminAuth = sessionStorage.getItem('adminAuth');
        if (adminAuth === ADMIN_PASSWORD) {
            isAuthenticated = true;
        }
    });

    function handleLogin(e) {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            isAuthenticated = true;
            sessionStorage.setItem('adminAuth', ADMIN_PASSWORD);
            error = '';
            password = '';
        } else {
            error = 'Invalid password';
        }
    }

    function handleLogout() {
        isAuthenticated = false;
        sessionStorage.removeItem('adminAuth');
    }

    function goToFeedbackDetails() {
        goto('/admin/feedback');
    }
</script>

{#if !isAuthenticated}
    <div class="flex justify-center items-center min-h-screen">
        <div class="card p-4 w-full max-w-sm">
            <h1 class="h1 mb-4">Admin Login</h1>
            
            <form on:submit={handleLogin} class="space-y-4">
                <label class="label">
                    <span>Password</span>
                    <input 
                        type="password" 
                        bind:value={password}
                        class="input"
                        placeholder="Enter admin password"
                    />
                </label>
                
                {#if error}
                    <p class="text-red-500">{error}</p>
                {/if}
                
                <button type="submit" class="btn variant-filled w-full">
                    Login
                </button>
            </form>
        </div>
    </div>
{:else}
    <div class="container mx-auto p-4">
        <div class="flex justify-between items-center mb-4">
            <h1 class="h1">Admin Dashboard</h1>
            <button class="btn variant-filled-warning" on:click={handleLogout}>
                Logout admin
            </button>
        </div>
        
        <div class="grid gap-4">
            <div class="card p-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="flex justify-between items-center mb-4">
                      <h2 class="h2">Thumbs Feedback</h2>
                      <button 
                        class="btn variant-filled-primary"
                        on:click={goToFeedbackDetails}
                      >
                        <iconify-icon icon="solar:card-layout-bold" class="mr-2" />
                        View Detailed Feedback
                      </button>
                    </div>
                    <FeedbackTable />
                  </div>
                  <div>
                    <h2 class="h2">Open Feedback</h2>
                    <OpenFeedbackTable />
                  </div>
                </div>
               </div>
            
            <div class="card p-4">
                <h2 class="h2">User Management</h2>
                <UserTable />
            </div>
        </div>
    </div>
{/if}