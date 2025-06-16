<script>
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';
    import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
    import { formatDate } from '$lib/utilities/dateUtils';
    import { auth, db } from '$lib/firebase';
    import Chart from 'chart.js/auto';

    let loading = true;
    let error = null;
    let batchesByDay = new Map();
    let chartData = [];
    let selectedStatus = 'all';
    let chartInstance;
    let chartCanvas;
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

    function updateChart() {
        if (!chartCanvas || chartData.length === 0) return;
        
        const ctx = chartCanvas.getContext('2d');
        const labels = chartData.map(day => day.date);
        
        // Create gradients for each status
        const completedGradient = ctx.createLinearGradient(0, 0, 0, 300);
        completedGradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
        completedGradient.addColorStop(1, 'rgba(34, 197, 94, 0.7)');
        
        const emptyGradient = ctx.createLinearGradient(0, 0, 0, 300);
        emptyGradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
        emptyGradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)');
        
        const inProgressGradient = ctx.createLinearGradient(0, 0, 0, 300);
        inProgressGradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        inProgressGradient.addColorStop(1, 'rgba(59, 130, 246, 0.6)');
        
        const timeoutGradient = ctx.createLinearGradient(0, 0, 0, 300);
        timeoutGradient.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
        timeoutGradient.addColorStop(1, 'rgba(245, 158, 11, 0.6)');
        
        const errorGradient = ctx.createLinearGradient(0, 0, 0, 300);
        errorGradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        errorGradient.addColorStop(1, 'rgba(239, 68, 68, 0.6)');
        
        const datasets = [
            {
                label: 'Completed',
                data: chartData.map(day => day.completed || 0),
                backgroundColor: completedGradient,
                borderWidth: 0
            },
            {
                label: 'Empty',
                data: chartData.map(day => day.empty || 0),
                backgroundColor: emptyGradient,
                borderWidth: 0
            },
            {
                label: 'In Progress',
                data: chartData.map(day => day.inProgress || 0),
                backgroundColor: inProgressGradient,
                borderWidth: 0
            },
            {
                label: 'Timeout',
                data: chartData.map(day => day.timeout || 0),
                backgroundColor: timeoutGradient,
                borderWidth: 0
            },
            {
                label: 'Error',
                data: chartData.map(day => day.error || 0),
                backgroundColor: errorGradient,
                borderWidth: 0
            }
        ];
        
        if (!chartInstance) {
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            stacked: true,
                            grid: {
                                display: false
                            },
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                afterBody: function(context) {
                                    const dayIndex = context[0].dataIndex;
                                    const dayData = chartData[dayIndex];
                                    return `Progress: ${dayData.progress}%`;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets.forEach((dataset, i) => {
                dataset.data = datasets[i].data;
                dataset.backgroundColor = datasets[i].backgroundColor;
            });
            chartInstance.update();
        }
    }

    async function fetchBatchData() {
        try {
            console.log('Fetching batch data...');
            
            if (!auth.currentUser) {
                console.log('No authenticated user found');
                throw new Error('User not authenticated');
            }
            console.log('User authenticated:', auth.currentUser.uid);
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            console.log('Fetching batches since:', sevenDaysAgo.toISOString());
            
            const batchesRef = collection(db, 'jobBatches');
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
            batchesByDay = new Map();
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
                
                if (batch.status !== 'empty' && batch.status !== 'completed') {
                    dayStats.totalJobs += batch.totalJobs || 0;
                    dayStats.completedJobs += batch.completedJobs || 0;
                }
                
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
            });

            // Convert to chart data format
            chartData = Array.from(batchesByDay.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, stats]) => {
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
            
            // Update chart after data is ready
            updateChart();
            loading = false;
        } catch (err) {
            console.error('Error fetching batch data:', err);
            error = err.message;
            loading = false;
        }
    }

    onMount(() => {
        console.log('Component mounted, checking auth state...');
        const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? `User ${user.uid} logged in` : 'No user');
            if (user) {
                fetchBatchData();
            } else {
                error = 'Please sign in to view the dashboard';
                loading = false;
            }
        });

        return () => {
            unsubscribe();
            if (chartInstance) {
                chartInstance.destroy();
            }
        };
    });

    onDestroy(() => {
        if (chartInstance) {
            chartInstance.destroy();
        }
    });

    // Update chart when canvas is available and data is ready
    $: if (chartCanvas && chartData.length > 0) {
        updateChart();
    }
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

        <!-- Batch History Graph with Chart.js -->
        <div class="card p-6">
            <h3 class="h3 mb-6">Batch History (Last 7 Days)</h3>
            <div class="h-[400px] w-full">
                <canvas bind:this={chartCanvas}></canvas>
            </div>

            <!-- Legend -->
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