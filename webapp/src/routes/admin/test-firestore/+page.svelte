<script>
    import { onMount } from 'svelte';
    import { 
        getFirestore, collection, doc, getDoc, getDocs, 
        query, where, limit, collectionGroup, 
        connectFirestoreEmulator 
    } from 'firebase/firestore';
    import { auth } from '$lib/firebase';

    const db = getFirestore();
    let testResults = [];
    let isLoading = false;
    let adminClaims = null;
    let environment = 'unknown';

    onMount(async () => {
        try {
            // Check admin claims
            const idTokenResult = await auth.currentUser.getIdTokenResult();
            adminClaims = idTokenResult.claims;
            
            // Determine environment
            const host = db._settings?.host || '';
            if (host.includes('localhost') || host.includes('127.0.0.1')) {
                environment = 'local-emulator';
            } else {
                // Check if staging or production
                const projectId = db.app.options.projectId;
                if (window.location.hostname.includes('staging') || 
                    window.location.hostname.includes('test')) {
                    environment = 'staging';
                } else {
                    environment = 'production';
                }
            }
        } catch (err) {
            console.error('Error checking admin claims:', err);
        }
    });

    async function runTests() {
        isLoading = true;
        testResults = [];
        
        // Array of test functions to run
        const tests = [
            { name: 'Environment Info', fn: testEnvironment },
            { name: 'Get single user by ID', fn: testGetUserById },
            { name: 'List all users', fn: testListUsers },
            { name: 'List users with limit', fn: testListUsersWithLimit },
            { name: 'Test hardcoded known user ID', fn: testKnownUser },
            { name: 'Test collection group query', fn: testCollectionGroup },
            { name: 'Test access to other collections', fn: testOtherCollections },
            { name: 'Test environment config', fn: testFirestoreConfig },
            { name: 'Test directly via REST - List', fn: testDirectRestList },
            { name: 'Test directly via REST - Get Document', fn: testDirectRestGetDocument },
            { name: 'Test token verification', fn: testTokenVerification }
        ];
        
        // Run all tests sequentially
        for (const test of tests) {
            try {
                await test.fn();
            } catch (err) {
                console.error(`Error running test ${test.name}:`, err);
                testResults.push({
                    name: test.name,
                    status: 'error',
                    message: err.message,
                    time: new Date().toLocaleTimeString()
                });
            }
        }
        
        isLoading = false;
    }
    
    // Test environment details
    async function testEnvironment() {
        const envInfo = {
            environment: environment,
            locationHost: window.location.hostname,
            locationOrigin: window.location.origin,
            userAgent: window.navigator.userAgent,
            firebase: {
                projectId: db.app.options.projectId,
                authDomain: db.app.options.authDomain
            },
            currentUser: {
                uid: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                isAnonymous: auth.currentUser?.isAnonymous
            }
        };
        
        testResults.push({
            name: 'Environment Info',
            status: 'info',
            message: `Detected environment: ${environment}`,
            data: JSON.stringify(envInfo, null, 2),
            time: new Date().toLocaleTimeString()
        });
    }

    // Test: Get current user's document
    async function testGetUserById() {
        try {
            const uid = auth.currentUser.uid;
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                testResults.push({
                    name: 'Get single user by ID',
                    status: 'success',
                    message: `Successfully retrieved user document for ${uid}`,
                    data: JSON.stringify(docSnap.data(), null, 2),
                    time: new Date().toLocaleTimeString()
                });
            } else {
                testResults.push({
                    name: 'Get single user by ID',
                    status: 'warning',
                    message: `No user document found for ${uid}`,
                    time: new Date().toLocaleTimeString()
                });
            }
        } catch (err) {
            throw err;
        }
    }

    // Test: List all users
    async function testListUsers() {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            testResults.push({
                name: 'List all users',
                status: 'success',
                message: `Successfully retrieved ${users.length} users`,
                data: users.length > 0 ? JSON.stringify(users[0], null, 2) : 'No users found',
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            throw err;
        }
    }

    // Test: List users with limit
    async function testListUsersWithLimit() {
        try {
            const q = query(collection(db, 'users'), limit(1));
            const querySnapshot = await getDocs(q);
            const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            testResults.push({
                name: 'List users with limit',
                status: 'success',
                message: `Successfully retrieved ${users.length} users with limit`,
                data: users.length > 0 ? JSON.stringify(users[0], null, 2) : 'No users found',
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            throw err;
        }
    }

    // Test: Get a user we know exists
    async function testKnownUser() {
        try {
            // Try with a known user ID
            const knownUserIds = [
                'VCvUK0pLeDVXJ0JHJsNBwxLgvdO2', // Your ID from dev tools
                '6s2CLcw8fpRkS79tjwxy1w7Mxbw1', 
                'U0KC8SusvzcGV6Nstvc6b82HVHh2'
            ];
            
            for (const uid of knownUserIds) {
                try {
                    const docRef = doc(db, 'users', uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        testResults.push({
                            name: `Get known user (${uid})`,
                            status: 'success',
                            message: `Successfully retrieved known user document`,
                            data: JSON.stringify({
                                id: docSnap.id,
                                email: docSnap.data().email,
                                displayName: docSnap.data().displayName
                            }, null, 2),
                            time: new Date().toLocaleTimeString()
                        });
                        break; // Stop after first success
                    }
                } catch (err) {
                    console.error(`Error with user ${uid}:`, err);
                    // Continue to next user
                }
            }
        } catch (err) {
            throw err;
        }
    }
    
    // Test collection group query
    async function testCollectionGroup() {
        try {
            const querySnapshot = await getDocs(collectionGroup(db, 'searchQueries'));
            const queries = querySnapshot.docs.map(doc => ({
                id: doc.id,
                path: doc.ref.path,
                data: doc.data()
            }));
            
            testResults.push({
                name: 'Collection Group Query',
                status: 'success',
                message: `Successfully retrieved ${queries.length} search queries`,
                data: queries.length > 0 ? 
                    JSON.stringify({
                        count: queries.length,
                        paths: queries.map(q => q.path)
                    }, null, 2) : 
                    'No search queries found',
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            throw err;
        }
    }
    
    // Test access to other collections
    async function testOtherCollections() {
        const collectionsToTest = [
            'jobBatches',
            'scrapedJobs',
            'UserCollections',
            'pending_users',
            'test'
        ];
        
        const results = {};
        
        for (const collectionName of collectionsToTest) {
            try {
                const querySnapshot = await getDocs(collection(db, collectionName));
                results[collectionName] = {
                    status: 'success',
                    count: querySnapshot.size,
                    message: `Successfully read ${querySnapshot.size} documents`
                };
            } catch (err) {
                results[collectionName] = {
                    status: 'error',
                    message: err.message
                };
            }
        }
        
        testResults.push({
            name: 'Other Collections Access',
            status: Object.values(results).some(r => r.status === 'error') ? 'warning' : 'success',
            message: `Tested access to ${collectionsToTest.length} collections`,
            data: JSON.stringify(results, null, 2),
            time: new Date().toLocaleTimeString()
        });
    }

    // Test Firestore configuration
    async function testFirestoreConfig() {
        const config = {
            host: db._settings?.host || 'default',
            ssl: db._settings?.ssl,
            projectId: db.app.options.projectId,
            databaseId: db._databaseId?.projectId,
            emulator: db._settings?.host?.includes('localhost') || db._settings?.host?.includes('127.0.0.1'),
            authDomain: db.app.options.authDomain
        };
        
        testResults.push({
            name: 'Firestore Configuration',
            status: 'info',
            message: 'Current Firestore configuration',
            data: JSON.stringify(config, null, 2),
            time: new Date().toLocaleTimeString()
        });
    }

    // Test direct REST API for listing documents
    async function testDirectRestList() {
        try {
            // Get an ID token
            const idToken = await auth.currentUser.getIdToken();
            const projectId = db.app.options.projectId;
            
            // Get the base host - use emulator if detected
            let baseUrl = 'https://firestore.googleapis.com/v1';
            if (db._settings?.host) {
                if (db._settings.host.includes('localhost') || db._settings.host.includes('127.0.0.1')) {
                    // Using emulator - need to use local URL
                    const [host, port] = db._settings.host.split(':');
                    baseUrl = `http://${host}:${port}/v1`;
                }
            }
            
            // Full URL for listing users collection
            const url = `${baseUrl}/projects/${projectId}/databases/(default)/documents/users?pageSize=1`;
            
            // Log the URL being used (for debugging)
            console.log("REST API URL:", url);
            
            // Get users collection via REST API
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            testResults.push({
                name: 'Direct REST API - List',
                status: 'success',
                message: 'Successfully accessed Firestore via REST API',
                data: JSON.stringify({
                    url: url,
                    result: data
                }, null, 2),
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            throw err;
        }
    }
    
    // Test direct REST API for getting a specific document
    async function testDirectRestGetDocument() {
        try {
            // Get an ID token
            const idToken = await auth.currentUser.getIdToken();
            const projectId = db.app.options.projectId;
            const uid = auth.currentUser.uid;
            
            // Get the base host - use emulator if detected
            let baseUrl = 'https://firestore.googleapis.com/v1';
            if (db._settings?.host) {
                if (db._settings.host.includes('localhost') || db._settings.host.includes('127.0.0.1')) {
                    // Using emulator - need to use local URL
                    const [host, port] = db._settings.host.split(':');
                    baseUrl = `http://${host}:${port}/v1`;
                }
            }
            
            // Full URL for getting a specific user document
            const url = `${baseUrl}/projects/${projectId}/databases/(default)/documents/users/${uid}`;
            
            // Log the URL being used (for debugging)
            console.log("REST API URL for document:", url);
            
            // Get specific user document via REST API
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            testResults.push({
                name: 'Direct REST API - Get Document',
                status: 'success',
                message: 'Successfully retrieved specific document via REST API',
                data: JSON.stringify({
                    url: url,
                    result: data
                }, null, 2),
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            throw err;
        }
    }
    
    // Test token verification details
    async function testTokenVerification() {
        try {
            // Get an ID token with detailed verification
            const idToken = await auth.currentUser.getIdToken();
            const idTokenResult = await auth.currentUser.getIdTokenResult();
            
            const tokenDetails = {
                token: `${idToken.substring(0, 20)}...`, // Show just the beginning of the token
                claims: idTokenResult.claims,
                expirationTime: idTokenResult.expirationTime,
                issuedAtTime: idTokenResult.issuedAtTime,
                signInProvider: idTokenResult.signInProvider,
                authTime: idTokenResult.authTime
            };
            
            testResults.push({
                name: 'Token Verification',
                status: 'info',
                message: 'Token verification details',
                data: JSON.stringify(tokenDetails, null, 2),
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            throw err;
        }
    }
    
    // Force token refresh
    async function refreshToken() {
        try {
            await auth.currentUser.getIdToken(true);
            const idTokenResult = await auth.currentUser.getIdTokenResult();
            adminClaims = idTokenResult.claims;
            
            testResults.push({
                name: 'Token Refresh',
                status: 'success',
                message: 'Successfully refreshed token',
                data: JSON.stringify(adminClaims, null, 2),
                time: new Date().toLocaleTimeString()
            });
        } catch (err) {
            testResults.push({
                name: 'Token Refresh',
                status: 'error',
                message: err.message,
                time: new Date().toLocaleTimeString()
            });
        }
    }
</script>

<div class="container mx-auto p-4">
    <h1 class="h1 mb-4">Firestore Access Tests</h1>
    <p class="text-amber-500 mb-4">⚠️ This page is for debugging Firestore access issues.</p>
    
    <div class="card p-4 mb-4">
        <div class="flex justify-between items-center mb-2">
            <h2 class="h3">Admin Claims</h2>
            <span class="badge {environment === 'local-emulator' ? 'bg-primary' : 
                      environment === 'staging' ? 'bg-warning' : 
                      environment === 'production' ? 'bg-success' : 'bg-surface'}">{environment}</span>
        </div>
        <pre class="text-sm bg-surface-200-700-token p-2 rounded mb-4">{JSON.stringify(adminClaims, null, 2)}</pre>
        
        <div class="flex gap-2">
            <button class="btn variant-filled-primary" on:click={runTests} disabled={isLoading}>
                {isLoading ? 'Running Tests...' : 'Run All Tests'}
            </button>
            <button class="btn variant-filled-secondary" on:click={refreshToken} disabled={isLoading}>
                Refresh Token
            </button>
        </div>
    </div>
    
    {#if isLoading}
        <div class="card p-4 mb-4">
            <p>Running tests...</p>
        </div>
    {:else if testResults.length > 0}
        <div class="grid gap-4">
            {#each testResults as result}
                <div class="card p-4 {result.status === 'error' ? 'variant-soft-error' : 
                         result.status === 'warning' ? 'variant-soft-warning' : 
                         result.status === 'info' ? 'variant-soft-primary' : 'variant-soft-success'}">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="h4">{result.name}</h3>
                        <span class="text-xs">{result.time}</span>
                    </div>
                    <p class="mb-2">{result.message}</p>
                    {#if result.data}
                        <details class="mt-2">
                            <summary class="cursor-pointer">View Data</summary>
                            <pre class="text-xs bg-surface-200-700-token p-2 rounded mt-2 max-h-40 overflow-auto">{result.data}</pre>
                        </details>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .badge {
        @apply px-2 py-1 rounded text-sm text-white;
    }
    
    .bg-primary {
        @apply bg-blue-500;
    }
    
    .bg-warning {
        @apply bg-yellow-500;
    }
    
    .bg-success {
        @apply bg-green-500;
    }
    
    .bg-surface {
        @apply bg-gray-500;
    }
</style> 