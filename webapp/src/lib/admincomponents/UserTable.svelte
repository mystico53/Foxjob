<!-- UserTable.svelte -->
<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { collection, getDocs, doc } from 'firebase/firestore';
    import { onAuthStateChanged } from 'firebase/auth';

    let users = [];
    let loading = true;
    let error = null;

    function formatDate(timestamp) {
        if (!timestamp || !timestamp.toDate) return 'Unknown';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    }

    async function getJobsByDay(userId) {
        try {
            const jobsRef = collection(db, 'users', userId, 'jobs');
            const jobsSnap = await getDocs(jobsRef);
            
            // Group jobs by day
            const jobsByDay = {};
            jobsSnap.forEach(doc => {
                const data = doc.data();
                const timestamp = data.generalData?.timestamp;
                if (timestamp) {
                    const dateKey = formatDate(timestamp);
                    jobsByDay[dateKey] = (jobsByDay[dateKey] || 0) + 1;
                }
            });

            // Convert to array and sort by date (most recent first)
            const sortedDays = Object.entries(jobsByDay)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .map(([date, count]) => ({ date, count }));

            return {
                totalJobs: jobsSnap.size,
                dailyCounts: sortedDays
            };
        } catch (e) {
            console.error(`Error getting jobs for ${userId}:`, e);
            return { totalJobs: 0, dailyCounts: [] };
        }
    }

    async function loadUsers() {
        try {
            loading = true;
            error = null;
            users = [];

            const knownIds = [
                '6s2CLcw8fpRkS79tjwxy1w7Mxbw1',
                'U0KC8SusvzcGV6Nstvc6b82HVHh2',
                'VCvUK0pLeDVXJ0JHJsNBwxLgvdO2'
            ];

            const userPromises = knownIds.map(async (userId) => {
                const jobsData = await getJobsByDay(userId);
                return {
                    id: userId,
                    isCurrentUser: userId === auth?.currentUser?.uid,
                    totalJobs: jobsData.totalJobs,
                    dailyJobs: jobsData.dailyCounts
                };
            });

            const results = await Promise.all(userPromises);
            users = results
                .filter(user => user.totalJobs > 0)
                .sort((a, b) => b.totalJobs - a.totalJobs);

        } catch (err) {
            console.error('Error loading users:', err);
            error = 'Failed to load user data';
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                loadUsers();
            }
        });

        return () => unsubscribe();
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
                <h3 class="h3">Users ({users.length})</h3>
            </div>

            {#each users as user}
                <div class="mb-6 border-b pb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="font-mono text-sm">{user.id}</span>
                        {#if user.isCurrentUser}
                            <span class="badge">You</span>
                        {/if}
                        <span class="badge bg-success ml-auto">
                            Total: {user.totalJobs} jobs
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {#each user.dailyJobs as { date, count }}
                            <div class="flex justify-between items-center p-2 bg-surface-500/10 rounded">
                                <span class="text-sm">{date}</span>
                                <span class="badge bg-success">{count}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .loading {
        @apply animate-pulse text-center py-4;
    }
    
    .badge {
        @apply px-2 py-1 rounded text-sm;
    }

    .bg-success {
        @apply bg-green-500 text-white;
    }
</style>