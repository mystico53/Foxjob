<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import FeedbackTable from '$lib/FeedbackTable.svelte';
    
    // You can move this to an environment variable or config file
    const ADMIN_PASSWORD = 'foxie';
    
    let isAuthenticated = false;
    let password = '';
    let error = '';

    // Check if we have an admin session
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
                Logout
            </button>
        </div>
        
        <!-- Your admin content here -->
        <div class="grid gap-4">
            <div class="card p-4">
                <h2 class="h2">User Feedback</h2>
                <FeedbackTable />
            </div>
            
            <div class="card p-4">
                <h2 class="h2">User Management</h2>
                <!-- Add user management content -->
            </div>
        </div>
    </div>
{/if}