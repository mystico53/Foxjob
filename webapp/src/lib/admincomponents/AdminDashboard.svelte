<script>
    import { onMount } from 'svelte';
    import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
    import { formatDate } from '$lib/utilities/dateUtils';
    import { auth, db } from '$lib/firebase';

    let loading = true;
    let error = null;
    let batchesByDay = new Map();
    let chartData = [];

    async function fetchBatchData() {
        try {
            console.log('Fetching batch data...');
            
            // Ensure user is authenticated
            if (!auth.currentUser) {
                console.log('No authenticated user found');
                throw new Error('User not authenticated');
            }
            console.log('User authenticated:', auth.currentUser.uid);
            
            // Get batches from the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            console.log('Fetching batches since:', sevenDaysAgo.toISOString());
            
            const batchesRef = collection(db, 'jobBatches'); // Changed from job_batches to jobBatches
            const q = query(
                batchesRef,
                where('startedAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
                orderBy('startedAt', 'desc')
            );

            console.log('Executing Firestore query on jobBatches collection...');
            const querySnapshot = await getDocs(q);
            console.log('Retrieved batches:', querySnapshot.size);

            if (querySnapshot.empty) {
                console.log('No batches found in the specified time range');
            }
            
            // Initialize the last 7 days with 0 batches
            batchesByDay = new Map(); // Reset the map
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateKey = date.toISOString().split('T')[0];
                batchesByDay.set(dateKey, {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    totalJobs: 0,
                    completedJobs: 0,
                    batches: []
                });
            }

            // Process batch data
            querySnapshot.forEach((doc) => {
                const batch = doc.data();
                console.log('Processing batch:', {
                    id: doc.id,
                    startedAt: batch.startedAt?.toDate?.(),
                    status: batch.status,
                    totalJobs: batch.totalJobs,
                    completedJobs: batch.completedJobs
                });
                
                if (!batch.startedAt) {
                    console.log('Skipping batch without startedAt:', doc.id);
                    return;
                }

                const date = batch.startedAt.toDate();
                const dateKey = date.toISOString().split('T')[0];

                if (!batchesByDay.has(dateKey)) {
                    console.log('Creating new entry for date:', dateKey);
                    batchesByDay.set(dateKey, {
                        total: 0,
                        completed: 0,
                        inProgress: 0,
                        totalJobs: 0,
                        completedJobs: 0,
                        batches: []
                    });
                }

                const dayStats = batchesByDay.get(dateKey);
                dayStats.total++;
                dayStats.totalJobs += batch.totalJobs || 0;
                dayStats.completedJobs += batch.completedJobs || 0;
                
                if (batch.status === 'complete') {
                    dayStats.completed++;
                } else if (batch.status === 'processing') {
                    dayStats.inProgress++;
                }

                dayStats.batches.push({
                    id: doc.id,
                    ...batch
                });

                console.log(`Updated stats for ${dateKey}:`, {
                    total: dayStats.total,
                    completed: dayStats.completed,
                    inProgress: dayStats.inProgress,
                    totalJobs: dayStats.totalJobs,
                    completedJobs: dayStats.completedJobs
                });
            });

            // Convert to chart data format
            chartData = Array.from(batchesByDay.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, stats]) => ({
                    date: formatDate(new Date(date)),
                    total: stats.total,
                    completed: stats.completed,
                    inProgress: stats.inProgress,
                    progress: stats.totalJobs ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0
                }));

            console.log('Final chart data:', chartData);
            loading = false;
        } catch (err) {
            console.error('Error fetching batch data:', err);
            error = err.message;
            loading = false;
        }
    }

    onMount(() => {
        console.log('Component mounted, checking auth state...');
        // Wait for auth to initialize
        const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? `User ${user.uid} logged in` : 'No user');
            if (user) {
                fetchBatchData();
            } else {
                error = 'Please sign in to view the dashboard';
                loading = false;
            }
        });

        return () => unsubscribe();
    });
</script>

<div class="container mx-auto p-4">
    <h2 class="h2 mb-4">Admin Dashboard</h2>

    {#if loading}
        <div class="card p-4">
            <p>Loading batch statistics...</p>
        </div>
    {:else if error}
        <div class="card variant-filled-error p-4">
            <p>Error loading batch statistics: {error}</p>
        </div>
    {:else if chartData.length === 0}
        <div class="card p-4">
            <p>No batch data available for the last 7 days.</p>
        </div>
    {:else}
        <!-- Today's Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {#if chartData.length > 0}
                {@const today = chartData[chartData.length - 1]}
                <div class="card variant-filled-primary p-6">
                    <h3 class="h3 mb-2">Today's Batches</h3>
                    <p class="text-4xl font-bold">{today.total}</p>
                    <p class="opacity-75">Total batches sent today</p>
                </div>
                <div class="card variant-filled-success p-6">
                    <h3 class="h3 mb-2">Completed</h3>
                    <p class="text-4xl font-bold">{today.completed}</p>
                    <p class="opacity-75">Batches completed today</p>
                </div>
                <div class="card variant-filled-tertiary p-6">
                    <h3 class="h3 mb-2">Average Progress</h3>
                    <p class="text-4xl font-bold">{today.progress}%</p>
                    <p class="opacity-75">Average completion rate</p>
                </div>
            {/if}
        </div>

        <!-- Batch History Graph -->
        <div class="card p-6">
            <h3 class="h3 mb-6">Batch History (Last 7 Days)</h3>
            <div class="h-[400px]">
                <!-- Bar Chart -->
                <div class="w-full h-full relative">
                    <!-- Y-axis labels -->
                    <div class="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-sm">
                        {#each Array(6) as _, i}
                            <span class="text-right w-full">{(5 - i) * 20}</span>
                        {/each}
                    </div>

                    <!-- Chart area -->
                    <div class="ml-12 h-full flex items-end justify-between">
                        {#each chartData as day}
                            <div class="flex-1 flex flex-col items-center">
                                <!-- Bar -->
                                <div class="w-full px-1">
                                    <div class="relative w-full" style="height: {Math.max(day.total * 40, 4)}px">
                                        <div 
                                            class="absolute bottom-0 w-full bg-primary-500"
                                            style="height: {Math.max(day.completed * 40, 0)}px"
                                        ></div>
                                        <div 
                                            class="absolute bottom-0 w-full bg-tertiary-500 opacity-50"
                                            style="height: {Math.max(day.inProgress * 40, 0)}px; transform: translateY(-{Math.max(day.completed * 40, 0)}px)"
                                        ></div>
                                    </div>
                                </div>
                                <!-- Date label -->
                                <span class="text-sm mt-2">{day.date}</span>
                                <!-- Progress label -->
                                <span class="text-xs opacity-75">{day.progress}%</span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Legend -->
            <div class="flex justify-center items-center gap-4 mt-6">
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-primary-500"></div>
                    <span>Completed</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-tertiary-500 opacity-50"></div>
                    <span>In Progress</span>
                </div>
            </div>
        </div>

        <!-- Detailed Today's Batches -->
        {#if chartData.length > 0}
            {@const today = chartData[chartData.length - 1]}
            {@const todayData = Array.from(batchesByDay.values())[batchesByDay.size - 1]}
            {#if todayData.batches.length > 0}
                <div class="card p-6 mt-8">
                    <h3 class="h3 mb-4">Today's Batch Details</h3>
                    <div class="space-y-4">
                        {#each todayData.batches as batch}
                            <div class="card variant-ghost p-4">
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <span class="font-medium">Batch ID</span>
                                        <p class="font-mono text-sm">{batch.id}</p>
                                    </div>
                                    <div>
                                        <span class="font-medium">Status</span>
                                        <p class="capitalize">{batch.status}</p>
                                    </div>
                                    <div>
                                        <span class="font-medium">Progress</span>
                                        <p>
                                            {batch.completedJobs || 0} / {batch.totalJobs || 0}
                                            <span class="font-semibold">
                                                ({batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%)
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <span class="font-medium">Started</span>
                                        <p>{formatDate(batch.startedAt.toDate(), true)}</p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        {/if}
    {/if}
</div> 