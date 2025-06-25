<!-- AdminUsers.svelte -->
<script>
    import { onMount } from 'svelte';
    import { collection, getDocs, getFirestore, doc, getDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
    import { auth } from '$lib/firebase';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import localizedFormat from 'dayjs/plugin/localizedFormat';
    import { createEventDispatcher } from 'svelte';

    // Initialize dayjs plugins
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(localizedFormat);

    // Firebase instance
    const db = getFirestore();

    // State variables
    let users = [];
    let isLoading = true;
    let error = null;
    let selectedUser = null;
    let adminClaims = null;
    let userDetails = null;
    let activeTab = 'info'; // 'info', 'resume', 'preferences', or 'queries'
    let emailRequests = {};
    let isDeleting = false;

    const dispatch = createEventDispatcher();

    // Fetch all data on mount
    onMount(async () => {
        try {
            isLoading = true;
            error = null;

            if (!auth.currentUser) {
                throw new Error('Not authenticated');
            }

            const idTokenResult = await auth.currentUser.getIdTokenResult();
            adminClaims = idTokenResult.claims;

            if (!adminClaims.admin) {
                throw new Error('User does not have admin claim');
            }

            await fetchUsers();
            isLoading = false;
        } catch (err) {
            console.error('Error in users initialization:', err);
            error = err.message;
            isLoading = false;
        }
    });

    // Fetch users collection
    async function fetchUsers() {
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            // Filter out duplicate users by email
            const uniqueUsers = new Map();
            usersSnapshot.docs.forEach(doc => {
                const userData = doc.data();
                if (!uniqueUsers.has(userData.email)) {
                    uniqueUsers.set(userData.email, { id: doc.id, ...userData });
                }
            });
            users = Array.from(uniqueUsers.values());
            console.log('Successfully fetched users:', users.length);
        } catch (err) {
            console.error('Error fetching users:', err);
            error = err.message;
        }
    }

    // Delete user and all their data
    async function deleteUser(user) {
        if (!confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
            return;
        }

        isDeleting = true;
        try {
            // Delete user document
            await deleteDoc(doc(db, 'users', user.id));

            // Delete user's collections
            const collectionsToDelete = [
                'UserCollections',
                'jobs',
                'processed',
                'searchQueries',
                'scrapedJobs'
            ];

            for (const collectionName of collectionsToDelete) {
                const collectionRef = collection(db, `users/${user.id}/${collectionName}`);
                const snapshot = await getDocs(collectionRef);
                
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
            }

            // Remove user from local state
            users = users.filter(u => u.id !== user.id);
            
            // If the deleted user was selected, clear the selection
            if (selectedUser?.id === user.id) {
                selectedUser = null;
                userDetails = null;
            }

            console.log(`Successfully deleted user ${user.email} and all their data`);
        } catch (err) {
            console.error('Error deleting user:', err);
            error = `Error deleting user: ${err.message}`;
        } finally {
            isDeleting = false;
        }
    }

    // User selection handler
    async function selectUser(user) {
        if (selectedUser?.id === user.id) {
            selectedUser = null;
            userDetails = null;
            return;
        }

        selectedUser = user;
        activeTab = 'info';
        await loadUserDetails(user);
    }

    // Load additional user details
    async function loadUserDetails(user) {
        try {
            userDetails = { loading: true };

            // Get all documents in UserCollections
            const userCollectionsSnapshot = await getDocs(collection(db, `users/${user.id}/UserCollections`));
            const userCollections = {};

            // Process each document in UserCollections
            userCollectionsSnapshot.docs.forEach(doc => {
                console.log('Found document:', doc.id, doc.data());
                userCollections[doc.id] = doc.data();
            });

            // Find the resume document that has type "Resume"
            let resumeDoc = null;
            for (const doc of userCollectionsSnapshot.docs) {
                const data = doc.data();
                if (data.type === 'Resume') {
                    resumeDoc = { id: doc.id, ...data };
                    break;
                }
            }

            // Fetch search queries
            const queriesSnapshot = await getDocs(collection(db, `users/${user.id}/searchQueries`));
            const searchQueries = await Promise.all(queriesSnapshot.docs.map(async doc => {
                const queryData = { id: doc.id, ...doc.data() };
                
                // Fetch job batches for this query
                const batchesQuery = query(
                    collection(db, 'jobBatches'),
                    where('userId', '==', user.id),
                    where('searchId', '==', doc.id),
                    orderBy('startedAt', 'desc')
                );
                const batchesSnapshot = await getDocs(batchesQuery);
                const batches = batchesSnapshot.docs.map(batchDoc => ({
                    id: batchDoc.id,
                    ...batchDoc.data()
                }));

                // Fetch email requests for these batches
                const emailRequestsForBatches = {};
                for (const batch of batches) {
                    if (batch.emailRequestId) {
                        try {
                            const emailRequestDoc = await getDoc(doc(db, 'emailRequests', batch.emailRequestId));
                            if (emailRequestDoc.exists()) {
                                emailRequestsForBatches[batch.id] = {
                                    id: emailRequestDoc.id,
                                    ...emailRequestDoc.data()
                                };
                            }
                        } catch (err) {
                            console.error(`Error fetching email request for batch ${batch.id}:`, err);
                        }
                    }
                }

                return {
                    ...queryData,
                    batches,
                    emailRequests: emailRequestsForBatches
                };
            }));

            userDetails = {
                loading: false,
                workPreferences: userCollections.work_preferences || null,
                resume: resumeDoc,
                searchQueries
            };

            console.log('User details loaded:', userDetails);
        } catch (err) {
            console.error('Error loading user details:', err);
            userDetails = { loading: false, error: err.message };
        }
    }

    // Format date for display
    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString();
        } catch (err) {
            return 'Invalid date';
        }
    }

    function formatDeliveryTime(timeString) {
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (err) {
            return timeString;
        }
    }

    function getEmailStatus(batch, emailRequests) {
        const emailData = emailRequests[batch.id];
        if (!emailData) {
            return batch.emailSent ? 
                { text: 'Email sent (ID unknown)', class: 'text-warning-500' } :
                { text: 'No email', class: 'text-surface-400' };
        }

        const emailIdPrefix = `ID: ${emailData.id ? emailData.id.substring(0, 8) : 'unknown'} - `;

        if (emailData.status === 'error') {
            return { text: emailIdPrefix + 'Error: ' + (emailData.error || 'Unknown'), class: 'text-error-500' };
        }
        if (emailData.status === 'pending') {
            return { text: emailIdPrefix + 'Pending', class: 'text-primary-300' };
        }
        if (emailData.bounced) {
            return { text: emailIdPrefix + 'Bounced', class: 'text-error-500' };
        }
        if (emailData.dropped) {
            return { text: emailIdPrefix + 'Dropped', class: 'text-error-500' };
        }
        if (emailData.delivered) {
            if (emailData.opened) {
                if (emailData.clicked) {
                    return { 
                        text: emailIdPrefix + `Opened (${emailData.openCount || 1}), Clicked (${emailData.clickCount || 1})`, 
                        class: 'text-success-500 font-semibold'
                    };
                }
                return { 
                    text: emailIdPrefix + `Opened (${emailData.openCount || 1})`, 
                    class: 'text-success-500'
                };
            }
            return { text: emailIdPrefix + 'Delivered', class: 'text-success-300' };
        }
        if (emailData.deferred) {
            return { text: emailIdPrefix + 'Deferred', class: 'text-warning-500' };
        }
        if (emailData.processed) {
            return { text: emailIdPrefix + 'Processed', class: 'text-primary-500' };
        }
        return { text: emailIdPrefix + (emailData.status || 'Unknown'), class: 'text-surface-400' };
    }

    function navigateToBatch(batchId) {
        dispatch('selectBatch', { batchId });
    }
</script>

<style>
    .section-title {
        @apply text-xl font-bold mb-4 text-black;
    }
    
    .subsection-title {
        @apply text-lg font-semibold mb-3 text-black;
    }
    
    .info-grid {
        @apply grid grid-cols-2 gap-x-8 gap-y-2;
    }
    
    .info-label {
        @apply font-medium text-black;
    }
    
    .info-value {
        @apply text-black;
    }
    
    .divider {
        @apply border-t border-surface-300 my-4;
    }
    .delete-button {
        @apply btn variant-filled-error;
    }
    .delete-button:disabled {
        @apply opacity-50 cursor-not-allowed;
    }
</style>

<main class="container mx-auto text-black">
    {#if isLoading}
        <div class="card p-4 my-4 text-black">Loading users data...</div>
    {:else if error}
        <div class="card variant-filled-error p-4 my-4">
            <h2 class="h3 text-black">Error: {error}</h2>
            <p class="text-black">There was a problem loading the users data. This may be due to insufficient permissions.</p>

            {#if adminClaims}
                <div class="mt-4">
                    <h3 class="h4">Admin Claims</h3>
                    <pre class="text-sm bg-surface-200-700-token p-2 rounded">{JSON.stringify(adminClaims, null, 2)}</pre>
                </div>
            {/if}
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Users List -->
            <div class="card p-4">
                <h2 class="h3 mb-4 text-black">Users ({users.length})</h2>
                <div class="space-y-2">
                    {#each users as user}
                        <div class="flex items-center justify-between gap-2">
                            <button 
                                class="btn flex-grow {selectedUser?.id === user.id ? 'variant-filled-primary' : 'variant-ghost'} 
                                       text-left justify-start h-auto py-2 text-black"
                                on:click={() => selectUser(user)}
                            >
                                <div class="flex flex-col">
                                    <span class="font-semibold text-black">{user.displayName || 'No Name'}</span>
                                    <span class="text-sm text-black">{user.email || user.id}</span>
                                </div>
                            </button>
                            <button 
                                class="delete-button"
                                disabled={isDeleting}
                                on:click={() => deleteUser(user)}
                            >
                                {#if isDeleting && selectedUser?.id === user.id}
                                    Deleting...
                                {:else}
                                    Delete
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- User Details -->
            {#if selectedUser}
                <div class="col-span-2">
                    <div class="card p-6">
                        <!-- Tabs -->
                        <div class="flex space-x-2 mb-4">
                            <button 
                                class="btn {activeTab === 'info' ? 'variant-filled' : 'variant-ghost'} text-black"
                                on:click={() => activeTab = 'info'}
                            >
                                Info
                            </button>
                            <button 
                                class="btn {activeTab === 'collections' ? 'variant-filled' : 'variant-ghost'} text-black"
                                on:click={() => activeTab = 'collections'}
                            >
                                Collections
                            </button>
                        </div>

                        <!-- Tab Content -->
                        {#if activeTab === 'info'}
                            <div class="space-y-8">
                                <!-- Basic Info -->
                                <div>
                                    <h3 class="section-title">Basic Information</h3>
                                    <div class="card variant-ghost p-6">
                                        <div class="info-grid">
                                            <div>
                                                <span class="info-label">Name</span>
                                                <p class="info-value">{selectedUser.displayName || 'Not set'}</p>
                                            </div>
                                            <div>
                                                <span class="info-label">Email</span>
                                                <p class="info-value">{selectedUser.email}</p>
                                            </div>
                                            <div>
                                                <span class="info-label">Last Sign In</span>
                                                <p class="info-value">{selectedUser.lastSignIn || 'Never'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Search Queries -->
                                {#if userDetails && !userDetails.loading}
                                    <div>
                                        <h3 class="section-title">Search Queries ({userDetails.searchQueries?.length || 0})</h3>
                                        <div class="space-y-6">
                                            {#if userDetails.searchQueries && userDetails.searchQueries.length > 0}
                                                {#each userDetails.searchQueries as query}
                                                    <div class="card variant-ghost p-6">
                                                        <!-- Search Parameters -->
                                                        <div class="mb-6">
                                                            <h4 class="subsection-title">Search Parameters</h4>
                                                            {#if query.searchParams && query.searchParams.length > 0}
                                                                <div class="info-grid">
                                                                    <div>
                                                                        <span class="info-label">Keywords</span>
                                                                        <p class="info-value">{query.searchParams[0].keyword || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span class="info-label">Location</span>
                                                                        <p class="info-value">{query.searchParams[0].location || 'N/A'}</p>
                                                                    </div>
                                                                    {#if query.searchParams[0].remote}
                                                                        <div>
                                                                            <span class="info-label">Remote</span>
                                                                            <p class="info-value">{query.searchParams[0].remote}</p>
                                                                        </div>
                                                                    {/if}
                                                                    {#if query.searchParams[0].experience_level}
                                                                        <div>
                                                                            <span class="info-label">Experience</span>
                                                                            <p class="info-value">{query.searchParams[0].experience_level}</p>
                                                                        </div>
                                                                    {/if}
                                                                </div>
                                                            {:else}
                                                                <p class="text-black">No search parameters defined</p>
                                                            {/if}
                                                        </div>

                                                        <div class="divider"></div>

                                                        <!-- Delivery Settings -->
                                                        <div class="mb-6">
                                                            <h4 class="subsection-title">Delivery Settings</h4>
                                                            <div class="info-grid">
                                                                <div>
                                                                    <span class="info-label">Delivery Time</span>
                                                                    <p class="info-value">{formatDeliveryTime(query.deliveryTime)}</p>
                                                                </div>
                                                                <div>
                                                                    <span class="info-label">Frequency</span>
                                                                    <p class="info-value">{query.frequency || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <span class="info-label">Job Limit</span>
                                                                    <p class="info-value">{query.limit || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <span class="info-label">Status</span>
                                                                    <p class="info-value font-semibold">{query.isActive ? 'Active' : 'Inactive'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div class="divider"></div>

                                                        <!-- Associated Job Batches -->
                                                        <div>
                                                            <h4 class="subsection-title">Job Batches ({query.batches?.length || 0})</h4>
                                                            <div class="space-y-3">
                                                                {#if query.batches && query.batches.length > 0}
                                                                    {#each query.batches as batch}
                                                                        {@const emailStatus = getEmailStatus(batch, query.emailRequests)}
                                                                        <div 
                                                                            class="card variant-ghost-secondary p-4 hover:variant-soft cursor-pointer transition-colors text-black"
                                                                            on:click={() => navigateToBatch(batch.id)}
                                                                            role="button"
                                                                            tabindex="0"
                                                                            on:keypress={(e) => e.key === 'Enter' && navigateToBatch(batch.id)}
                                                                        >
                                                                            <div class="info-grid">
                                                                                <div class="col-span-2 mb-2">
                                                                                    <span class="info-label">Batch ID</span>
                                                                                    <p class="info-value">
                                                                                        <span class="font-mono">{batch.id}</span>
                                                                                        <span class="text-sm ml-2 opacity-75">(click to view in Batches tab)</span>
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <span class="info-label">Started</span>
                                                                                    <p class="info-value">{formatDate(batch.startedAt)}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span class="info-label">Status</span>
                                                                                    <p class="info-value font-semibold">{batch.status || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span class="info-label">Progress</span>
                                                                                    <p class="info-value">
                                                                                        {batch.completedJobs || 0} / {batch.totalJobs || 0}
                                                                                        <span class="font-semibold">({batch.totalJobs ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}%)</span>
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <span class="info-label">Email</span>
                                                                                    <p class="info-value">{emailStatus.text}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    {/each}
                                                                {:else}
                                                                    <p class="text-black">No job batches found</p>
                                                                {/if}
                                                            </div>
                                                        </div>
                                                    </div>
                                                {/each}
                                            {:else}
                                                <p class="text-black">No search queries found</p>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {:else if activeTab === 'collections' && userDetails && !userDetails.loading}
                            <div class="space-y-8">
                                <!-- Work Preferences -->
                                <div>
                                    <h3 class="h3 mb-4 text-black">Work Preferences</h3>
                                    <div class="card variant-ghost p-4">
                                        {#if userDetails.workPreferences}
                                            <div class="space-y-4">
                                                <div>
                                                    <h4 class="font-medium mb-2 text-black">Preferences</h4>
                                                    <p class="text-black">{userDetails.workPreferences.preferences || 'None'}</p>
                                                </div>
                                                <div>
                                                    <h4 class="font-medium mb-2 text-black">Avoidance</h4>
                                                    <p class="text-black">{userDetails.workPreferences.avoidance || 'None'}</p>
                                                </div>
                                            </div>
                                        {:else}
                                            <p class="text-black">No work preferences found</p>
                                        {/if}
                                    </div>
                                </div>

                                <!-- Resume -->
                                <div>
                                    <h3 class="h3 mb-4 text-black">Resume</h3>
                                    {#if userDetails.resume}
                                        <div class="card variant-ghost p-4">
                                            <div class="mb-4">
                                                <p class="text-black"><span class="font-medium text-black">Document ID:</span> {userDetails.resume.id}</p>
                                                <p class="text-black"><span class="font-medium text-black">File Name:</span> {userDetails.resume.fileName || 'N/A'}</p>
                                                <p class="text-black"><span class="font-medium text-black">Status:</span> {userDetails.resume.status || 'N/A'}</p>
                                            </div>
                                            {#if userDetails.resume.extractedText}
                                                <div class="whitespace-pre-wrap font-mono text-sm mt-4 p-4 bg-surface-100-800-token rounded text-black">
                                                    {userDetails.resume.extractedText}
                                                </div>
                                            {:else}
                                                <p class="text-black">No extracted text available</p>
                                            {/if}
                                        </div>
                                    {:else}
                                        <p class="text-black">No resume found</p>
                                    {/if}
                                </div>
                            </div>
                        {/if}

                        {#if userDetails?.loading}
                            <div class="p-4 text-center text-black">Loading details...</div>
                        {:else if userDetails?.error}
                            <div class="p-4 text-error-500">Error loading details: {userDetails.error}</div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</main> 