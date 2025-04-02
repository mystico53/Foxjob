<!-- WorkPreferences.svelte -->
<!-- WorkPreferences.svelte -->
<script>
    import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
    import { getAuth, onAuthStateChanged } from 'firebase/auth';
    import { onMount } from 'svelte';
    
    const db = getFirestore();
    const auth = getAuth();
    
    let preferences = '';
    let saving = false;
    let saved = false;
    let loading = true;
    let userId = null;
    
    onMount(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          userId = user.uid;
          loadPreferences();
        } else {
          loading = false;
        }
      });
      
      return unsubscribe; // Clean up the listener when component is destroyed
    });
    
    async function loadPreferences() {
      try {
        const prefDocRef = doc(db, 'users', userId, 'UserCollections', 'work_preferences');
        const prefSnap = await getDoc(prefDocRef);
        
        if (prefSnap.exists()) {
          preferences = prefSnap.data().preferences || '';
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        loading = false;
      }
    }
    
    async function savePreferences() {
      if (!userId) return;
      
      saving = true;
      try {
        await setDoc(
          doc(db, 'users', userId, 'UserCollections', 'work_preferences'),
          {
            preferences,
            timestamp: new Date()
          }
        );
        saved = true;
        setTimeout(() => saved = false, 3000);
      } catch (err) {
        console.error('Error saving preferences:', err);
      } finally {
        saving = false;
      }
    }
</script>
  
  <div class="preference-container">
    <h2>Work Preferences</h2>
    <p>Tell us about your ideal next role (industry, company size, culture, etc.)</p>
    
    {#if loading}
      <p>Loading...</p>
    {:else}
      <textarea 
        bind:value={preferences}
        placeholder="Example: I prefer startups in education with remote options..."
        rows="5"
        class="w-full p-2 border rounded"
      ></textarea>
      
      <button 
        on:click={savePreferences} 
        disabled={saving}
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
      
      {#if saved}
        <p class="text-green-500 mt-2">Preferences saved!</p>
      {/if}
    {/if}
  </div>