<!-- UserTable.svelte -->
<script>
    import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import { app } from '$lib/firebase';

    const db = getFirestore(app);
    let users = [];
    let loading = true;
    let error = null;

    // List of known user IDs from your screenshot
    const knownUserIds = [
        '6s2CLcw8fpRkS79tjwxy1w7Mxbw1',
        'U0KC8SusvzcGV6Nstvc6b82HVHh2',
        'VCvUK0pLeDVXJ0JHJsNBwxLgvd02',
        'anonymous'
    ];

    async function loadUsers() {
        try {
            loading = true;
            error = null;
            users = [];

            console.log('Starting to load users...');

            // First try collection approach
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            console.log('Collection query found:', snapshot.size, 'documents');

            // Then try individual document approach
            for (const userId of knownUserIds) {
                try {
                    console.log('Trying to fetch user:', userId);
                    const userRef = doc(db, 'users', userId);
                    const userDoc = await getDoc(userRef);
                    
                    console.log(`User ${userId} exists:`, userDoc.exists());
                    console.log(`User ${userId} data:`, userDoc.data());

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        users.push({
                            id: userId,
                            email: userData?.email || 'N/A',
                            displayName: userData?.displayName || userId.slice(0, 6) + '...',
                            lastLogin: userData?.lastLoginTime || 'Never',
                            isAdmin: userData?.isAdmin || false,
                            provider: userData?.provider || 'N/A',
                            ...userData
                        });
                    } else {
                        console.log(`Document ${userId} exists in collection but has no data`);
                        users.push({
                            id: userId,
                            email: 'N/A',
                            displayName: userId.slice(0, 6) + '...',
                            lastLogin: 'Never',
                            isAdmin: false,
                            provider: 'N/A'
                        });
                    }
                } catch (e) {
                    console.error(`Error fetching user ${userId}:`, e);
                }
            }

            console.log('Final processed users:', users);
            
        } catch (err) {
            console.error('Error loading users:', err);
            error = 'Failed to load user data';
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadUsers();
    });
</script>

<div class="container mx-auto space-y-4">
    {#if error}
        <div class="alert variant-filled-error">
            <span>{error}</span>
        </div>
    {/if}

    {#if loading}
        <div class="flex justify-center">
            <div class="loading">Loading...</div>
        </div>
    {:else}
        <div class="card p-4">
            <div class="mb-4">
                <h3 class="h3">Users ({users.length} total)</h3>
                <p class="text-sm opacity-75">Check console for detailed debugging information</p>
            </div>

            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Display Name</th>
                        <th>Email</th>
                        <th>Last Login</th>
                        <th>Provider</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
                    {#each users as user}
                        <tr>
                            <td class="font-mono text-sm break-all">{user.id}</td>
                            <td>{user.displayName}</td>
                            <td>{user.email}</td>
                            <td>{user.lastLogin}</td>
                            <td>{user.provider}</td>
                            <td>
                                {#if user.isAdmin}
                                    <span class="badge bg-warning">Admin</span>
                                {:else}
                                    <span class="badge bg-info">User</span>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .loading {
        @apply animate-pulse text-center py-4;
    }
    
    .table {
        @apply w-full;
    }
    
    .table th,
    .table td {
        @apply p-2 text-left border-b;
    }
    
    .table th {
        @apply bg-surface-100-800-token;
    }
    
    .badge {
        @apply px-2 py-1 rounded text-sm;
    }
    
    .bg-warning {
        @apply bg-yellow-500 text-white;
    }
    
    .bg-info {
        @apply bg-blue-500 text-white;
    }
</style>