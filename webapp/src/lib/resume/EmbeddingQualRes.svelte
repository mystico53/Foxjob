<!-- src/routes/EmbeddingQualRes.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import { auth, db } from '$lib/firebase'; // Ensure this path is correct
    import { ProgressRadial } from '@skeletonlabs/skeleton';
  
    // Replace with your actual Cloud Function URL
    const EMBEDDING_MATCH_URL = 'http://127.0.0.1:5001/jobille-45494/us-central1/embeddingQualRes';
  
    // Reactive stores
    const jobId = writable('');
    const loading = writable(false);
    const topMatches = writable([]);
    const error = writable(null);
    const user = writable(null);
  
    // Listen to authentication state
    const unsubscribeAuth = auth.onAuthStateChanged(currentUser => {
      user.set(currentUser);
    });
  
    // Cleanup on component destroy
    onDestroy(() => {
      unsubscribeAuth();
    });
  
    // Function to trigger the embedding match process
    async function triggerEmbeddingMatch() {
      // Reset previous state
      topMatches.set([]);
      error.set(null);
  
      const currentJobId = $jobId.trim();
  
      if (!currentJobId) {
        error.set('Please enter a valid Job ID.');
        return;
      }
  
      if (!$user) {
        error.set('User not authenticated.');
        return;
      }
  
      loading.set(true);
  
      try {
        const payload = {
          googleId: $user.uid,
          docId: currentJobId
          // If your Cloud Function requires additional fields like jobRequirement,
          // ensure the Cloud Function retrieves them internally using googleId and docId.
        };
  
        const response = await fetch(EMBEDDING_MATCH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to process embedding match.');
        }
  
        const data = await response.json();
  
        if (data.topMatches && data.topMatches.length > 0) {
          topMatches.set(data.topMatches);
        } else {
          error.set('No matches found.');
        }
  
      } catch (err) {
        error.set(err.message);
        console.error('Error:', err);
      } finally {
        loading.set(false);
      }
    }
  </script>
  
  <style>
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .matches ul {
      list-style-type: none;
      padding: 0;
    }
    .matches li {
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
    .matches li strong {
      display: block;
      margin-bottom: 0.5rem;
    }
    .error {
      color: #ef4444;
      margin-top: 1rem;
    }
  </style>
  
  <div class="container">
    <div class="card p-6 shadow-md">
      <h2 class="text-2xl font-bold mb-4">Find Relevant Resume Experiences</h2>
  
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-1" for="jobId">Job ID</label>
        <input
          id="jobId"
          type="text"
          bind:value={$jobId}
          placeholder="Enter Job ID"
          class="input input-bordered w-full"
        />
      </div>
  
      <button
        on:click={triggerEmbeddingMatch}
        class="btn btn-primary w-full"
        disabled={$loading}
      >
        {#if $loading}
          <ProgressRadial indeterminate class="inline-block h-4 w-4 mr-2" />
          Processing...
        {:else}
          Find Matches
        {/if}
      </button>
  
      {#if error}
        <div class="error">
          <p>{error}</p>
        </div>
      {/if}
  
      {#if $topMatches.length > 0}
        <div class="matches mt-6">
          <h3 class="text-xl font-semibold mb-4">Top Matching Experiences:</h3>
          <ul>
            {#each $topMatches as match, index}
              <li>
                <strong>Quality ID: {match.qualityId} - Score: {match.embeddingScore}</strong>
                <p>{match.bullet || 'No bullet point available.'}</p>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
  