<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
    import { formatDate } from '$lib/utilities/dateUtils';
    import { auth, db } from '$lib/firebase';

    let loading = true;
    let error = null;
    let batchesByDay = new Map();
    let chartData = [];
    let selectedStatus = 'all';
    const dispatch = createEventDispatcher();

    // Make the filtered batches reactive
    $: filteredBatches = (() => {
        if (!chartData.length) return [];
        const todayKey = new Date().toISOString().split('T')[0];
        const todayData = batchesByDay.get(todayKey);
        if (!todayData || !todayData.batches) return [];

        if (selectedStatus === 'all') return todayData.batches;
        return todayData.batches.filter(batch => {
            if (selectedStatus === 'empty') {
                return batch.status === 'empty' || batch.status === 'completed';
            }
            return batch.status === selectedStatus;
        });
    })();

    function filterBatches(batches) {
        if (selectedStatus === 'all') return batches;
        return batches.filter(batch => {
            if (selectedStatus === 'empty') {
                return batch.status === 'empty' || batch.status === 'completed';
            }
            return batch.status === selectedStatus;
        });
    }

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
                    empty: 0,
                    inProgress: 0,
                    timeout: 0,
                    error: 0,
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
                        empty: 0,
                        inProgress: 0,
                        timeout: 0,
                        error: 0,
                        totalJobs: 0,
                        completedJobs: 0,
                        batches: []
                    });
                }

                const dayStats = batchesByDay.get(dateKey);
                dayStats.total++;
                
                // Only add to job counts if not an empty batch
                if (batch.status !== 'empty' && batch.status !== 'completed') {
                    dayStats.totalJobs += batch.totalJobs || 0;
                    dayStats.completedJobs += batch.completedJobs || 0;
                }
                
                // Enhanced status tracking
                if (batch.status === 'complete') {
                    dayStats.completed++;
                } else if (batch.status === 'empty' || batch.status === 'completed') {
                    dayStats.empty++;
                } else if (batch.status === 'processing') {
                    dayStats.inProgress++;
                } else if (batch.status === 'timeout') {
                    dayStats.timeout++;
                } else if (batch.status === 'error') {
                    dayStats.error++;
                }

                dayStats.batches.push({
                    id: doc.id,
                    ...batch
                });

                console.log(`Updated stats for ${dateKey}:`, {
                    total: dayStats.total,
                    completed: dayStats.completed,
                    empty: dayStats.empty,
                    inProgress: dayStats.inProgress,
                    totalJobs: dayStats.totalJobs,
                    completedJobs: dayStats.completedJobs
                });
            });

            // Convert to chart data format with enhanced statuses
            chartData = Array.from(batchesByDay.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, stats]) => {
                    // Calculate progress based on completed vs total snapshots
                    const progress = stats.total > 0
                        ? Math.round((stats.completed / stats.total) * 100)
                        : 0;

                    return {
                        date: formatDate(new Date(date)),
                        total: stats.total,
                        completed: stats.completed,
                        empty: stats.empty,
                        inProgress: stats.inProgress,
                        timeout: stats.timeout,
                        error: stats.error,
                        progress: progress
                    };
                });

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
                    <h3 class="h3 mb-2">Completion Rate</h3>
                    <p class="text-4xl font-bold">{today.progress}%</p>
                    <p class="opacity-75">Percentage of completed batches</p>
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

                    <!-- Chart area with improved alignment -->
                    <div class="ml-12 h-full flex items-end">
                        {#each chartData as day, index}
                            <div class="flex-1 flex flex-col items-center min-w-0">
                                <!-- Bar container with consistent spacing -->
                                <div class="w-4/5 max-w-[60px] mx-auto mb-2">
                                    <div class="relative w-full bg-surface-200 rounded-t" style="height: {Math.max(day.total * 40, 4)}px">
                                        <!-- Completed -->
                                        <div 
                                            class="absolute bottom-0 w-full bg-success-500 rounded-t"
                                            style="height: {Math.max(day.completed * 40, 0)}px"
                                        ></div>
                                        <!-- Empty -->
                                        <div 
                                            class="absolute bottom-0 w-full bg-success-500 opacity-50"
                                            style="height: {Math.max(day.empty * 40, 0)}px; transform: translateY(-{Math.max(day.completed * 40, 0)}px)"
                                        ></div>
                                        <!-- In Progress -->
                                        <div 
                                            class="absolute bottom-0 w-full bg-primary-500 opacity-75"
                                            style="height: {Math.max(day.inProgress * 40, 0)}px; transform: translateY(-{Math.max((day.completed + day.empty) * 40, 0)}px)"
                                        ></div>
                                        <!-- Timeout -->
                                        <div 
                                            class="absolute bottom-0 w-full bg-warning-500 opacity-75"
                                            style="height: {Math.max(day.timeout * 40, 0)}px; transform: translateY(-{Math.max((day.completed + day.empty + day.inProgress) * 40, 0)}px)"
                                        ></div>
                                        <!-- Error -->
                                        <div 
                                            class="absolute bottom-0 w-full bg-error-500 opacity-75"
                                            style="height: {Math.max(day.error * 40, 0)}px; transform: translateY(-{Math.max((day.completed + day.empty + day.inProgress + day.timeout) * 40, 0)}px)"
                                        ></div>
                                    </div>
                                </div>
                                
                                <!-- Labels with consistent alignment -->
                                <div class="text-center w-full">
                                    <!-- Date label -->
                                    <div class="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis px-1">
                                        {day.date}
                                    </div>
                                    <!-- Progress label -->
                                    <div class="text-xs opacity-75 mt-1">
                                        {day.progress}%
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Legend remains the same -->
            <div class="flex justify-center items-center gap-4 mt-6">
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-success-500"></div>
                    <span>Completed</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-success-500 opacity-50"></div>
                    <span>Empty</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-primary-500 opacity-75"></div>
                    <span>In Progress</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-warning-500 opacity-75"></div>
                    <span>Timeout</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-error-500 opacity-75"></div>
                    <span>Error</span>
                </div>
            </div>
        </div>

        <!-- Detailed Today's Batches -->
        {#if chartData.length > 0}
            {@const today = chartData[chartData.length - 1]}
            {@const todayKey = new Date().toISOString().split('T')[0]}
            {@const todayData = batchesByDay.get(todayKey)}
            <div class="card p-6 mt-8">
                <h3 class="h3 mb-4">Today's Batch Details</h3>
                {#if todayData && todayData.batches && todayData.batches.length > 0}
                    <!-- Status Filter Pills -->
                    <div class="flex flex-wrap gap-2 mb-6">
                        <button
                            class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                                {selectedStatus === 'all' 
                                    ? 'bg-primary-500 text-white' 
                                    : 'bg-surface-200 hover:bg-surface-300'}"
                            on:click={() => selectedStatus = 'all'}
                        >
                            All ({todayData.batches.length})
                        </button>
                        <button
                            class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                                {selectedStatus === 'complete' 
                                    ? 'bg-success-500 text-white' 
                                    : 'bg-surface-200 hover:bg-surface-300'}"
                            on:click={() => selectedStatus = 'complete'}
                        >
                            Complete ({todayData.batches.filter(b => b.status === 'complete').length})
                        </button>
                        <button
                            class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                                {selectedStatus === 'empty' 
                                    ? 'bg-success-500 text-white' 
                                    : 'bg-surface-200 hover:bg-surface-300'}"
                            on:click={() => selectedStatus = 'empty'}
                        >
                            Empty Search ({todayData.batches.filter(b => b.status === 'empty' || b.status === 'completed').length})
                        </button>
                        <button
                            class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                                {selectedStatus === 'processing' 
                                    ? 'bg-primary-500 text-white' 
                                    : 'bg-surface-200 hover:bg-surface-300'}"
                            on:click={() => selectedStatus = 'processing'}
                        >
                            In Progress ({todayData.batches.filter(b => b.status === 'processing').length})
                        </button>
                        <button
                            class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                                {selectedStatus === 'timeout' 
                                    ? 'bg-warning-500 text-white' 
                                    : 'bg-surface-200 hover:bg-surface-300'}"
                            on:click={() => selectedStatus = 'timeout'}
                        >
                            Timeout ({todayData.batches.filter(b => b.status === 'timeout').length})
                        </button>
                        <button
                            class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                                {selectedStatus === 'error' 
                                    ? 'bg-error-500 text-white' 
                                    : 'bg-surface-200 hover:bg-surface-300'}"
                            on:click={() => selectedStatus = 'error'}
                        >
                            Error ({todayData.batches.filter(b => b.status === 'error').length})
                        </button>
                    </div>

                    <div class="space-y-4">
                        {#each filteredBatches as batch}
                            <div class="card variant-ghost p-4">
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <span class="font-medium">Batch ID</span>
                                        <button
                                          class="font-mono text-sm text-primary-500 hover:underline cursor-pointer"
                                          on:click={() => dispatch('jumpToBatch', { batchId: batch.id })}
                                        >
                                          {batch.id}
                                        </button>
                                    </div>
                                    <div>
                                        <span class="font-medium">Status</span>
                                        <div class="flex items-center gap-2">
                                            <div class="w-3 h-3 rounded-full {batch.status === 'complete' ? 'bg-success-500' : 
                                                batch.status === 'empty' || batch.status === 'completed' ? 'bg-success-500' :
                                                batch.status === 'processing' ? 'bg-primary-500' : 
                                                batch.status === 'timeout' ? 'bg-warning-500' : 
                                                batch.status === 'error' ? 'bg-error-500' : 'bg-surface-500'}"></div>
                                            <p class="capitalize">{batch.status === 'completed' ? 'empty' : batch.status}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <span class="font-medium">Progress</span>
                                        <div class="flex items-center gap-2">
                                            <div class="w-full bg-surface-200 rounded-full h-2">
                                                <div class="h-2 rounded-full {batch.status === 'complete' ? 'bg-success-500' : 
                                                    batch.status === 'empty' || batch.status === 'completed' ? 'bg-success-500' :
                                                    batch.status === 'processing' ? 'bg-primary-500' : 
                                                    batch.status === 'timeout' ? 'bg-warning-500' : 
                                                    batch.status === 'error' ? 'bg-error-500' : 'bg-surface-500'}"
                                                    style="width: {batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%">
                                                </div>
                                            </div>
                                            <span class="text-sm whitespace-nowrap">
                                                {batch.completedJobs || 0} / {batch.totalJobs || 0}
                                                <span class="font-semibold">
                                                    ({batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%)
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span class="font-medium">Started</span>
                                        <p>{formatDate(batch.startedAt.toDate(), true)}</p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-center opacity-75">No batches found for today</p>
                {/if}
            </div>
        {/if}
    {/if}
</div> 