<script>
	import { onMount } from 'svelte';
	import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
	import { app, auth as importedAuth } from '$lib/firebase.js';

	let auth;
	let provider;
	let debugLog = [];
	let showDebugPanel = true;
	let testExtensionId = 'jednpafjmjheknpcfgijkhklhmnifdln'; // Default test ID
	let isAuthInProgress = false;

	function addToLog(message, type = 'info') {
		const timestamp = new Date().toLocaleTimeString();
		debugLog = [...debugLog, { message, timestamp, type }];
		console.log(`[Auth Debug ${timestamp}]:`, message);
	}

	function simulateExtensionMessage() {
		if (isAuthInProgress) {
			addToLog('Auth already in progress, skipping...', 'warning');
			return;
		}

		isAuthInProgress = true;
		addToLog('🧪 Starting test auth flow', 'info');
		addToLog(`Current origin: ${window.location.origin}`, 'info'); // Add this for debugging

		try {
			signInWithPopup(auth, provider)
				.then((userCredential) => {
					addToLog('✅ Auth successful!', 'success');
					addToLog(`User data: ${JSON.stringify(userCredential.user)}`, 'data');
				})
				.catch((error) => {
					addToLog(`❌ Auth error: ${error.message}`, 'error');
					// Add more detailed error logging
					if (error.code === 'auth/unauthorized-domain') {
						addToLog(
							`Domain ${window.location.origin} is not authorized. Please add it to Firebase Console.`,
							'error'
						);
					}
				})
				.finally(() => {
					isAuthInProgress = false;
				});
		} catch (error) {
			addToLog(`❌ Error initiating auth: ${error.message}`, 'error');
			isAuthInProgress = false;
		}
	}

	onMount(() => {
		addToLog('🟢 Auth Page Loaded', 'success');

		auth = importedAuth || getAuth(app);
		provider = new GoogleAuthProvider();

		// Listen for ANY message from chrome extensions
		window.addEventListener('message', async function (event) {
			addToLog(`Received message from origin: ${event.origin}`, 'info');

			// For actual extension messages
			if (event.origin.startsWith('chrome-extension://')) {
				try {
					const { data } = event;
					addToLog(`Received data: ${JSON.stringify(data)}`, 'info');

					if (data?.initAuth && !isAuthInProgress) {
						isAuthInProgress = true;
						addToLog('🔑 Initiating auth from extension', 'success');

						try {
							const userCredential = await signInWithPopup(auth, provider);
							addToLog('✅ Auth successful!', 'success');
							window.parent.postMessage(
								JSON.stringify({ user: userCredential.user }),
								event.origin
							);
						} catch (error) {
							addToLog(`❌ Auth error: ${error.message}`, 'error');
							window.parent.postMessage(
								JSON.stringify({ error: { code: error.code, message: error.message } }),
								event.origin
							);
						} finally {
							isAuthInProgress = false;
						}
					}
				} catch (error) {
					addToLog(`❌ Error processing message: ${error.message}`, 'error');
					isAuthInProgress = false;
				}
			} else if (event.origin === window.location.origin) {
				addToLog('Internal message - ignoring', 'info');
			} else {
				addToLog(`External message from ${event.origin} - ignoring`, 'info');
			}
		});

		addToLog('👂 Event listener setup complete', 'success');
	});
</script>

<main class="container mx-auto p-4">
	<h1 class="h1 mb-4">Authentication Page</h1>

	<!-- Debug Panel -->
	{#if showDebugPanel}
		<div class="card variant-glass-surface mb-4 p-4">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="h2">Debug Log</h2>
				<button class="variant-ghost-surface btn" on:click={() => (debugLog = [])}>
					Clear Log
				</button>
			</div>

			<div class="h-96 space-y-2 overflow-auto">
				{#each debugLog as log}
					<div
						class="p-4 text-sm rounded-container-token {log.type === 'error'
							? 'bg-red-500'
							: log.type === 'success'
								? 'bg-green-500'
								: log.type === 'data'
									? 'bg-blue-500'
									: 'bg-purple-500'} text-white"
					>
						<span class="opacity-75">{log.timestamp}</span>
						<span class="ml-2">{log.message}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Manual Test Section -->
	<div class="card variant-glass-surface p-4">
		<h3 class="h3 mb-4">Manual Testing</h3>
		<div class="space-y-4">
			<button
				class="variant-filled-primary btn"
				on:click={() => {
					addToLog('🧪 Manual test: Simulating extension message', 'info');
					window.postMessage({ initAuth: true }, '*');
				}}
			>
				Test Auth Flow
			</button>

			<!-- New button for simulating exact extension message -->
			<button class="variant-filled-secondary btn" on:click={simulateExtensionMessage}>
				Simulate Extension Message
			</button>

			<!-- Extension ID input -->
			<div class="form-control">
				<div class="form-control">
					<label class="label" for="extensionId">
						<span class="label-text">Test Extension ID</span>
					</label>
					<input
						type="text"
						id="extensionId"
						bind:value={testExtensionId}
						class="input"
						placeholder="Extension ID for testing"
					/>
				</div>
				<input
					type="text"
					bind:value={testExtensionId}
					class="input"
					placeholder="Extension ID for testing"
				/>
			</div>

			<p class="text-sm opacity-75">
				You can also run <code>window.testAuth()</code> in the console
			</p>
		</div>
	</div>
</main>
