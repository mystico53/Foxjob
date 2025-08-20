<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

	let currentUser = null;
	let idToken = '';
	let idTokenClaims = null;
	let userDetails = null;
	let isLoading = true;
	let testResults = [];

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (user) => {
			isLoading = true;
			currentUser = user;
			testResults = [];

			if (user) {
				// Get ID token
				try {
					idToken = await user.getIdToken();
					const idTokenResult = await user.getIdTokenResult();
					idTokenClaims = idTokenResult.claims;

					userDetails = {
						uid: user.uid,
						email: user.email,
						displayName: user.displayName,
						photoURL: user.photoURL,
						providerData: user.providerData
					};

					// Run test queries
					await runDiagnosticTests();
				} catch (error) {
					console.error('Error getting ID token', error);
				}
			} else {
				idToken = '';
				idTokenClaims = null;
				userDetails = null;
			}

			isLoading = false;
		});

		return unsubscribe;
	});

	// Refresh token to get latest claims
	async function refreshToken() {
		isLoading = true;
		try {
			await auth.currentUser.getIdToken(true);
			idToken = await auth.currentUser.getIdToken();
			const idTokenResult = await auth.currentUser.getIdTokenResult();
			idTokenClaims = idTokenResult.claims;

			// Run tests again after refresh
			await runDiagnosticTests();
		} catch (error) {
			console.error('Error refreshing token', error);
		}
		isLoading = false;
	}

	// Run diagnostic tests on various collections
	async function runDiagnosticTests() {
		if (!currentUser) return;

		testResults = [];

		const collections = [
			{ name: 'users', path: 'users' },
			{ name: 'jobBatches', path: 'jobBatches' },
			{
				name: 'searchQueries (collectionGroup)',
				path: 'users/123/searchQueries',
				isCollectionGroup: true
			}
		];

		for (const collection of collections) {
			try {
				if (collection.isCollectionGroup) {
					// Test collection group query
					await getDocs(collection(db, 'users'));
					// If we can access users, try to read a random user doc to check subcollections
					const usersSnapshot = await getDocs(collection(db, 'users'));
					if (!usersSnapshot.empty) {
						const randomUserDoc = usersSnapshot.docs[0];
						const queriesSnapshot = await getDocs(
							collection(db, `users/${randomUserDoc.id}/searchQueries`)
						);
						testResults.push({
							collection: collection.name,
							status: 'success',
							message: `Successfully read collection. Found ${queriesSnapshot.size} documents.`
						});
					} else {
						testResults.push({
							collection: collection.name,
							status: 'warning',
							message: 'Cannot test searchQueries - no user documents found'
						});
					}
				} else {
					// Regular collection
					const querySnapshot = await getDocs(collection(db, collection.path));
					testResults.push({
						collection: collection.name,
						status: 'success',
						message: `Successfully read collection. Found ${querySnapshot.size} documents.`
					});
				}
			} catch (error) {
				testResults.push({
					collection: collection.name,
					status: 'error',
					message: error.message
				});
			}
		}
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="h1 mb-4">Development Tools</h1>
	<p class="mb-4 text-amber-500">⚠️ This page is for development purposes only.</p>

	{#if isLoading}
		<p>Loading user details...</p>
	{:else if !currentUser}
		<div class="card mb-4 p-4">
			<p>Not signed in. Please sign in to view your authentication details.</p>
		</div>
	{:else}
		<div class="grid gap-4">
			<div class="card p-4">
				<h2 class="h3 mb-2">Current User</h2>
				<pre class="bg-surface-200-700-token rounded p-2 text-sm">{JSON.stringify(
						userDetails,
						null,
						2
					)}</pre>
			</div>

			<div class="card p-4">
				<div class="mb-2 flex items-center justify-between">
					<h2 class="h3">ID Token Claims</h2>
					<button class="variant-filled btn btn-sm" on:click={refreshToken}> Refresh Token </button>
				</div>
				<pre class="bg-surface-200-700-token rounded p-2 text-sm">{JSON.stringify(
						idTokenClaims,
						null,
						2
					)}</pre>

				<div class="mt-4">
					<h3 class="h4 mb-2">Admin Status</h3>
					{#if idTokenClaims?.admin === true}
						<p class="text-success-500">✅ You have admin privileges</p>
					{:else}
						<p class="text-error-500">❌ You do not have admin privileges</p>
						<p class="mt-2 text-sm">
							To set admin privileges, you need to run the script in keys/setAdminClaim.cjs with
							your user ID as the UID.
						</p>
					{/if}
				</div>
			</div>

			<div class="card p-4">
				<h2 class="h3 mb-2">Firestore Access Tests</h2>
				{#if testResults.length === 0}
					<p>No test results yet. Sign in and refresh your token.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-compact w-full">
							<thead>
								<tr>
									<th>Collection</th>
									<th>Status</th>
									<th>Message</th>
								</tr>
							</thead>
							<tbody>
								{#each testResults as result}
									<tr>
										<td>{result.collection}</td>
										<td>
											{#if result.status === 'success'}
												<span class="text-success-500">✅ Success</span>
											{:else if result.status === 'warning'}
												<span class="text-warning-500">⚠️ Warning</span>
											{:else}
												<span class="text-error-500">❌ Error</span>
											{/if}
										</td>
										<td>{result.message}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
