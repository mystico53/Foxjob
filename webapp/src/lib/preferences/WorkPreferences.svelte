<!-- WorkPreferences.svelte -->
<script>
    import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
    import { getAuth, onAuthStateChanged } from 'firebase/auth';
    import { onMount } from 'svelte';
    
    const db = getFirestore();
    const auth = getAuth();
    
    let workPreferences = {
        question1: '',
        answer1: '',
        question2: '',
        answer2: '',
        question3: '',
        answer3: '',
        question4: '',
        answer4: '',
        question5: '',
        answer5: '',
        status: ''
    };
    
    // Track which answers have been saved
    let savedStatus = {
        answer1: false,
        answer2: false,
        answer3: false,
        answer4: false,
        answer5: false
    };
    
    let saving = '';
    let allSaved = false;
    let loading = true;
    let userId = null;
    
    onMount(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          userId = user.uid;
          loadWorkPreferences();
        } else {
          loading = false;
        }
      });
      
      return unsubscribe;
    });
    
    async function loadWorkPreferences() {
      try {
        const prefDocRef = doc(db, 'users', userId, 'UserCollections', 'work_preferences');
        const prefSnap = await getDoc(prefDocRef);
        
        if (prefSnap.exists()) {
          const data = prefSnap.data();
          workPreferences = {
            question1: data.question1 || '',
            answer1: data.answer1 || '',
            question2: data.question2 || '',
            answer2: data.answer2 || '',
            question3: data.question3 || '',
            answer3: data.answer3 || '',
            question4: data.question4 || '',
            answer4: data.answer4 || '',
            question5: data.question5 || '',
            answer5: data.answer5 || '',
            status: data.status || 'pending'
          };
          
          // Mark answers that already have content as saved
          Object.keys(savedStatus).forEach(key => {
            savedStatus[key] = !!workPreferences[key];
          });
        }
      } catch (err) {
        console.error('Error loading work preferences:', err);
      } finally {
        loading = false;
      }
    }
    
    // Save individual answer
    async function saveAnswer(answerKey) {
      if (!userId) return;
      
      saving = answerKey;
      try {
        const updateData = {};
        updateData[answerKey] = workPreferences[answerKey];
        updateData.updatedAt = new Date();
        
        await updateDoc(
          doc(db, 'users', userId, 'UserCollections', 'work_preferences'),
          updateData
        );
        
        savedStatus[answerKey] = true;
      } catch (err) {
        console.error(`Error saving ${answerKey}:`, err);
      } finally {
        saving = '';
      }
    }
    
    // Save all answers and mark as completed
    async function saveAllPreferences() {
      if (!userId) return;
      
      saving = 'all';
      try {
        await updateDoc(
          doc(db, 'users', userId, 'UserCollections', 'work_preferences'),
          {
            answer1: workPreferences.answer1,
            answer2: workPreferences.answer2,
            answer3: workPreferences.answer3,
            answer4: workPreferences.answer4,
            answer5: workPreferences.answer5,
            status: 'completed',
            updatedAt: new Date()
          }
        );
        
        // Mark all as saved
        Object.keys(savedStatus).forEach(key => {
          savedStatus[key] = true;
        });
        
        allSaved = true;
        setTimeout(() => allSaved = false, 5000);
      } catch (err) {
        console.error('Error saving work preferences:', err);
      } finally {
        saving = '';
      }
    }
</script>
  
<div class="preference-container bg-white p-6 rounded-lg shadow-md">
  <h2 class="text-2xl font-bold mb-4 text-gray-800">Work Preferences</h2>
  <p class="mb-6 text-gray-600">Help us understand what you're looking for in your next role so we can find the perfect match for you!</p>
  
  {#if loading}
    <div class="flex justify-center items-center py-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
    </div>
  {:else if workPreferences.status === 'error'}
    <div class="bg-red-100 p-4 rounded-md mb-4">
      <p class="text-red-700">Sorry, we encountered an error generating your personalized questions. Please try again later.</p>
    </div>
  {:else if !workPreferences.question1}
    <div class="bg-yellow-100 p-4 rounded-md mb-4">
      <p class="text-yellow-700">We're still preparing your personalized questions. Please check back in a few moments.</p>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Question 1 -->
      <div class="bg-blue-50 p-4 rounded-md relative">
        {#if savedStatus.answer1}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Saved
          </div>
        {/if}
        <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question1}</h3>
        <textarea 
          bind:value={workPreferences.answer1}
          placeholder="Type your answer here..."
          rows="3"
          class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <button 
          on:click={() => saveAnswer('answer1')} 
          disabled={saving === 'answer1'}
          class="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition"
        >
          {saving === 'answer1' ? 'Saving...' : 'Save Answer'}
        </button>
      </div>
      
      <!-- Question 2 -->
      <div class="bg-blue-50 p-4 rounded-md relative">
        {#if savedStatus.answer2}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Saved
          </div>
        {/if}
        <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question2}</h3>
        <textarea 
          bind:value={workPreferences.answer2}
          placeholder="Type your answer here..."
          rows="3"
          class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <button 
          on:click={() => saveAnswer('answer2')} 
          disabled={saving === 'answer2'}
          class="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition"
        >
          {saving === 'answer2' ? 'Saving...' : 'Save Answer'}
        </button>
      </div>
      
      <!-- Question 3 -->
      <div class="bg-blue-50 p-4 rounded-md relative">
        {#if savedStatus.answer3}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Saved
          </div>
        {/if}
        <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question3}</h3>
        <textarea 
          bind:value={workPreferences.answer3}
          placeholder="Type your answer here..."
          rows="3"
          class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <button 
          on:click={() => saveAnswer('answer3')} 
          disabled={saving === 'answer3'}
          class="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition"
        >
          {saving === 'answer3' ? 'Saving...' : 'Save Answer'}
        </button>
      </div>
      
      <!-- Question 4 -->
      <div class="bg-blue-50 p-4 rounded-md relative">
        {#if savedStatus.answer4}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Saved
          </div>
        {/if}
        <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question4}</h3>
        <textarea 
          bind:value={workPreferences.answer4}
          placeholder="Type your answer here..."
          rows="3"
          class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <button 
          on:click={() => saveAnswer('answer4')} 
          disabled={saving === 'answer4'}
          class="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition"
        >
          {saving === 'answer4' ? 'Saving...' : 'Save Answer'}
        </button>
      </div>
      
      <!-- Question 5 -->
      <div class="bg-blue-50 p-4 rounded-md relative">
        {#if savedStatus.answer5}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Saved
          </div>
        {/if}
        <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question5}</h3>
        <textarea 
          bind:value={workPreferences.answer5}
          placeholder="Type your answer here..."
          rows="3"
          class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <button 
          on:click={() => saveAnswer('answer5')} 
          disabled={saving === 'answer5'}
          class="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition"
        >
          {saving === 'answer5' ? 'Saving...' : 'Save Answer'}
        </button>
      </div>
      
      <button 
        on:click={saveAllPreferences} 
        disabled={saving === 'all'}
        class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition"
      >
        {saving === 'all' ? 'Saving All Responses...' : 'Complete & Save All Responses'}
      </button>
      
      {#if allSaved}
        <div class="bg-green-100 border-l-4 border-green-500 p-4 rounded">
          <div class="flex">
            <svg class="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <p class="text-sm font-medium text-green-800">
              All preferences successfully saved! We'll use your responses to find your perfect job matches.
            </p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>