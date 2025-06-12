<!-- AdminUsers.svelte -->
<script>
    import { onMount } from 'svelte';
    import { collection, getDocs, getFirestore, doc, getDoc, query, where } from 'firebase/firestore';
    import { auth } from '$lib/firebase';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import localizedFormat from 'dayjs/plugin/localizedFormat';

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
    let activeTab = 'info'; // 'info', 'resume', or 'preferences'

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

            userDetails = {
                loading: false,
                workPreferences: userCollections.work_preferences || null,
                resume: resumeDoc
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
            return dayjs(date).format('MMM D, YYYY h:mm A');
        } catch (err) {
            return 'Invalid date';
        }
    }
</script>

<main class="container mx-auto">
    {#if isLoading}
        <div class="card p-4 my-4">Loading users data...</div>
    {:else if error}
        <div class="card variant-filled-error p-4 my-4">
            <h2 class="h3">Error: {error}</h2>
            <p>There was a problem loading the users data. This may be due to insufficient permissions.</p>

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
                <h2 class="h3 mb-4">Users ({users.length})</h2>
                <div class="space-y-2">
                    {#each users as user}
                        <button 
                            class="btn w-full {selectedUser?.id === user.id ? 'variant-filled-primary' : 'variant-soft'} 
                                   text-left justify-start h-auto py-2"
                            on:click={() => selectUser(user)}
                        >
                            <div class="flex flex-col">
                                <span class="font-semibold">{user.displayName || 'No Name'}</span>
                                <span class="text-sm">{user.email || user.id}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- User Details -->
            {#if selectedUser}
                <div class="col-span-2">
                    <div class="card p-4">
                        <!-- Tabs -->
                        <div class="flex space-x-2 mb-4">
                            <button 
                                class="btn {activeTab === 'info' ? 'variant-filled' : 'variant-soft'}"
                                on:click={() => activeTab = 'info'}
                            >
                                Info
                            </button>
                            <button 
                                class="btn {activeTab === 'resume' ? 'variant-filled' : 'variant-soft'}"
                                on:click={() => activeTab = 'resume'}
                            >
                                Resume
                            </button>
                            <button 
                                class="btn {activeTab === 'preferences' ? 'variant-filled' : 'variant-soft'}"
                                on:click={() => activeTab = 'preferences'}
                            >
                                Work Preferences
                            </button>
                        </div>

                        <!-- Tab Content -->
                        {#if activeTab === 'info'}
                            <div class="space-y-2">
                                <p><span class="font-medium">Name:</span> {selectedUser.displayName || 'Not set'}</p>
                                <p><span class="font-medium">Email:</span> {selectedUser.email}</p>
                                <p><span class="font-medium">Last Sign In:</span> {selectedUser.lastSignIn || 'Never'}</p>
                            </div>
                        {:else if activeTab === 'resume' && userDetails && !userDetails.loading}
                            <div class="space-y-2">
                                {#if userDetails.resume}
                                    <div class="mb-2">
                                        <p><span class="font-medium">Document ID:</span> {userDetails.resume.id}</p>
                                        <p><span class="font-medium">File Name:</span> {userDetails.resume.fileName || 'N/A'}</p>
                                        <p><span class="font-medium">Status:</span> {userDetails.resume.status || 'N/A'}</p>
                                    </div>
                                    {#if userDetails.resume.extractedText}
                                        <div class="whitespace-pre-wrap font-mono text-sm mt-4 p-4 bg-surface-100-800-token rounded">
                                            {userDetails.resume.extractedText}
                                        </div>
                                    {:else}
                                        <p class="text-surface-400">No extracted text available</p>
                                    {/if}
                                {:else}
                                    <p class="text-surface-400">No resume found</p>
                                {/if}
                            </div>
                        {:else if activeTab === 'preferences' && userDetails && !userDetails.loading}
                            <div class="space-y-4">
                                {#if userDetails.workPreferences}
                                    <div>
                                        <h4 class="font-medium mb-2">Work Preferences</h4>
                                        <p>{userDetails.workPreferences.preferences || 'None'}</p>
                                    </div>
                                    <div>
                                        <h4 class="font-medium mb-2">Avoidance</h4>
                                        <p>{userDetails.workPreferences.avoidance || 'None'}</p>
                                    </div>
                                {:else}
                                    <p class="text-surface-400">No work preferences found</p>
                                {/if}
                            </div>
                        {/if}

                        {#if userDetails?.loading}
                            <div class="p-4 text-center">Loading details...</div>
                        {:else if userDetails?.error}
                            <div class="p-4 text-error-500">Error loading details: {userDetails.error}</div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</main> 