<script>
    import { db, functions, auth } from '$lib/firebase';
    import { collection, addDoc, getDocs } from 'firebase/firestore';
    import { httpsCallable } from 'firebase/functions';
    import { authStore } from '$lib/stores/authStore';
    import { signInWithGoogle } from '$lib/firebase';

    let testResults = [];

    async function testFirestore() {
        try {
            // First check if user is authenticated
            if (!auth.currentUser) {
                throw new Error('Must be authenticated to test Firestore');
            }

            const docRef = await addDoc(collection(db, 'test'), {
                message: 'Test from emulator',
                timestamp: new Date(),
                userId: auth.currentUser.uid
            });
            
            testResults = [...testResults, { 
                service: 'Firestore', 
                status: 'success', 
                message: `Document written with ID: ${docRef.id}` 
            }];
        } catch (e) {
            console.error('Firestore test error:', e);
            testResults = [...testResults, { 
                service: 'Firestore', 
                status: 'error', 
                message: e.message 
            }];
        }
    }

    async function testAuth() {
        try {
            await signInWithGoogle();
            testResults = [...testResults, { 
                service: 'Auth', 
                status: 'success', 
                message: 'Sign in successful' 
            }];
        } catch (e) {
            console.error('Auth test error:', e);
            testResults = [...testResults, { 
                service: 'Auth', 
                status: 'error', 
                message: e.message 
            }];
        }
    }

    // Use authStore's signOut method instead
    async function testSignOut() {
        try {
            await authStore.signOut();
            testResults = [...testResults, { 
                service: 'Auth', 
                status: 'success', 
                message: 'Sign out successful' 
            }];
        } catch (e) {
            console.error('Sign out error:', e);
            testResults = [...testResults, { 
                service: 'Auth', 
                status: 'error', 
                message: e.message 
            }];
        }
    }

    async function testCloudFunction() {
        try {
            // Test processGaps instead of retryProcessing
            const response = await fetch('http://127.0.0.1:5001/jobille-45494/us-central1/processGaps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobId: 'test-job-id',
                    userId: auth.currentUser?.uid,
                    gaps: {
                        "Test Gap": "This is a test gap description"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            testResults = [...testResults, { 
                service: 'Cloud Functions', 
                status: 'success', 
                message: `Function called successfully: ${JSON.stringify(result)}`
            }];
        } catch (e) {
            console.error('Function test error:', e);
            testResults = [...testResults, { 
                service: 'Cloud Functions', 
                status: 'error', 
                message: e.message 
            }];
        }
    }

    function clearResults() {
        testResults = [];
    }
</script>

<div class="container mx-auto p-4">
    <h1 class="h1 mb-4">Firebase Emulator Test</h1>
    
    <div class="mb-4">
        <h2 class="h2 mb-2">Current Auth State:</h2>
        {#if $authStore}
            <p class="text-success-500">Logged in as: {$authStore.email}</p>
        {:else}
            <p class="text-error-500">Not logged in</p>
        {/if}
    </div>

    <div class="flex flex-wrap gap-4 mb-8">
        <button class="btn variant-filled-primary" on:click={testFirestore}>
            Test Firestore
        </button>
        
        {#if !$authStore}
            <button class="btn variant-filled-secondary" on:click={testAuth}>
                Test Sign In
            </button>
        {:else}
            <button class="btn variant-filled-warning" on:click={testSignOut}>
                Test Sign Out
            </button>
        {/if}
        
        <button class="btn variant-filled-tertiary" on:click={testCloudFunction}>
            Test Cloud Function
        </button>

        <button class="btn variant-ghost-surface" on:click={clearResults}>
            Clear Results
        </button>
    </div>

    <div class="space-y-4">
        {#each testResults as result}
            <div class="card p-4 {result.status === 'success' ? 'variant-soft-success' : 'variant-soft-error'}">
                <h3 class="font-bold">{result.service}</h3>
                <p class="whitespace-pre-wrap font-mono text-sm">{result.message}</p>
            </div>
        {/each}
    </div>
</div>