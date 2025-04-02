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
    
    // Track progress percentage
    let progressPercentage = 0;
    
    let saving = '';
    let loading = true;
    let userId = null;
    let focusedField = null;
    
    // Track which answers have been edited since last save
    let editedStatus = {
        answer1: false,
        answer2: false,
        answer3: false,
        answer4: false,
        answer5: false
    };
    
    // Progress messages
    const progressMessages = {
        20: "Great start! You're on your way to better job matches.",
        40: "You're improving job recommendation accuracy!",
        60: "Halfway there! Your profile is taking shape.",
        80: "Almost done! Your preferences are becoming clearer.",
        100: "All complete! We now have everything we need to find your perfect match."
    };
    
    // Get current progress message
    $: currentProgressMessage = progressMessages[progressPercentage] || "";
    
    // Calculate progress based on saved answers
    $: {
        const totalQuestions = 5;
        let answeredQuestions = 0;
        
        if (savedStatus.answer1) answeredQuestions++;
        if (savedStatus.answer2) answeredQuestions++;
        if (savedStatus.answer3) answeredQuestions++;
        if (savedStatus.answer4) answeredQuestions++;
        if (savedStatus.answer5) answeredQuestions++;
        
        progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100);
    }
    
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
    
    // Track text changes
    function handleTextChange(answerKey) {
      if (savedStatus[answerKey]) {
        editedStatus[answerKey] = true;
      }
    }
    
    // Clear answer
    function clearAnswer(answerKey) {
      workPreferences[answerKey] = '';
      savedStatus[answerKey] = false;
      editedStatus[answerKey] = false;
      
      // Update in database if user is logged in
      if (userId) {
        const updateData = {};
        updateData[answerKey] = '';
        updateData.updatedAt = new Date();
        
        updateDoc(
          doc(db, 'users', userId, 'UserCollections', 'work_preferences'),
          updateData
        ).catch(err => {
          console.error(`Error clearing ${answerKey}:`, err);
        });
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
        
        // Also update status to completed if all questions are answered
        if (workPreferences.answer1 && 
            workPreferences.answer2 && 
            workPreferences.answer3 && 
            workPreferences.answer4 && 
            workPreferences.answer5) {
          updateData.status = 'completed';
        }
        
        await updateDoc(
          doc(db, 'users', userId, 'UserCollections', 'work_preferences'),
          updateData
        );
        
        savedStatus[answerKey] = true;
        editedStatus[answerKey] = false; // Reset edited status after saving
      } catch (err) {
        console.error(`Error saving ${answerKey}:`, err);
      } finally {
        saving = '';
      }
    }
</script>

<div class="preference-container bg-white rounded-lg shadow-md">
  <!-- Sticky progress bar and description -->
  <div class="sticky top-0 bg-white p-6 rounded-t-lg z-10 border-b">
    <h2 class="text-2xl font-bold mb-2 text-gray-800">Work Preferences</h2>
    <p class="mb-4 text-gray-600">Help us understand what you're looking for in your next role so we can find the perfect match for you!</p>
    
    <!-- Progress bar -->
    <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
      <div class="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out" style="width: {progressPercentage}%"></div>
    </div>
    <div class="flex justify-between items-center">
      <p class="text-sm text-blue-700 font-medium">{currentProgressMessage}</p>
      <p class="text-sm text-gray-600">{progressPercentage}% Complete</p>
    </div>
  </div>
  
  <div class="p-6">
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
          <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question1}</h3>
          <textarea 
            bind:value={workPreferences.answer1}
            placeholder="Type your answer here..."
            rows="1"
            class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:focus={() => focusedField = 'answer1'}
            on:input={() => handleTextChange('answer1')}
          ></textarea>
          <div class="flex justify-between mt-2">
            <button 
              on:click={() => clearAnswer('answer1')} 
              class="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-md transition"
            >
              Clear
            </button>
            <button 
              on:click={() => saveAnswer('answer1')} 
              disabled={saving === 'answer1'}
              class="px-3 py-1 {savedStatus.answer1 && !editedStatus.answer1 ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm rounded-md transition"
            >
              {saving === 'answer1' ? 'Saving...' : savedStatus.answer1 && !editedStatus.answer1 ? 'Saved' : 'Save Answer'}
            </button>
          </div>
        </div>
        
        <!-- Question 2 -->
        <div class="bg-blue-50 p-4 rounded-md relative">
          <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question2}</h3>
          <textarea 
            bind:value={workPreferences.answer2}
            placeholder="Type your answer here..."
            rows="1"
            class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:focus={() => focusedField = 'answer2'}
            on:input={() => handleTextChange('answer2')}
          ></textarea>
          <div class="flex justify-between mt-2">
            <button 
              on:click={() => clearAnswer('answer2')} 
              class="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-md transition"
            >
              Clear
            </button>
            <button 
              on:click={() => saveAnswer('answer2')} 
              disabled={saving === 'answer2'}
              class="px-3 py-1 {savedStatus.answer2 && !editedStatus.answer2 ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm rounded-md transition"
            >
              {saving === 'answer2' ? 'Saving...' : savedStatus.answer2 && !editedStatus.answer2 ? 'Saved' : 'Save Answer'}
            </button>
          </div>
        </div>
        
        <!-- Question 3 -->
        <div class="bg-blue-50 p-4 rounded-md relative">
          <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question3}</h3>
          <textarea 
            bind:value={workPreferences.answer3}
            placeholder="Type your answer here..."
            rows="1"
            class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:focus={() => focusedField = 'answer3'}
            on:input={() => handleTextChange('answer3')}
          ></textarea>
          <div class="flex justify-between mt-2">
            <button 
              on:click={() => clearAnswer('answer3')} 
              class="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-md transition"
            >
              Clear
            </button>
            <button 
              on:click={() => saveAnswer('answer3')} 
              disabled={saving === 'answer3'}
              class="px-3 py-1 {savedStatus.answer3 && !editedStatus.answer3 ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm rounded-md transition"
            >
              {saving === 'answer3' ? 'Saving...' : savedStatus.answer3 && !editedStatus.answer3 ? 'Saved' : 'Save Answer'}
            </button>
          </div>
        </div>
        
        <!-- Question 4 -->
        <div class="bg-blue-50 p-4 rounded-md relative">
          <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question4}</h3>
          <textarea 
            bind:value={workPreferences.answer4}
            placeholder="Type your answer here..."
            rows="1"
            class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:focus={() => focusedField = 'answer4'}
            on:input={() => handleTextChange('answer4')}
          ></textarea>
          <div class="flex justify-between mt-2">
            <button 
              on:click={() => clearAnswer('answer4')} 
              class="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-md transition"
            >
              Clear
            </button>
            <button 
              on:click={() => saveAnswer('answer4')} 
              disabled={saving === 'answer4'}
              class="px-3 py-1 {savedStatus.answer4 && !editedStatus.answer4 ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm rounded-md transition"
            >
              {saving === 'answer4' ? 'Saving...' : savedStatus.answer4 && !editedStatus.answer4 ? 'Saved' : 'Save Answer'}
            </button>
          </div>
        </div>
        
        <!-- Question 5 -->
        <div class="bg-blue-50 p-4 rounded-md relative">
          <h3 class="font-medium text-blue-800 mb-2">{workPreferences.question5}</h3>
          <textarea 
            bind:value={workPreferences.answer5}
            placeholder="Type your answer here..."
            rows="1"
            class="w-full p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:focus={() => focusedField = 'answer5'}
            on:input={() => handleTextChange('answer5')}
          ></textarea>
          <div class="flex justify-between mt-2">
            <button 
              on:click={() => clearAnswer('answer5')} 
              class="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-md transition"
            >
              Clear
            </button>
            <button 
              on:click={() => saveAnswer('answer5')} 
              disabled={saving === 'answer5'}
              class="px-3 py-1 {savedStatus.answer5 && !editedStatus.answer5 ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm rounded-md transition"
            >
              {saving === 'answer5' ? 'Saving...' : savedStatus.answer5 && !editedStatus.answer5 ? 'Saved' : 'Save Answer'}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Summary box at the bottom -->
      <div class="mt-6 p-4 bg-blue-100 border-l-4 border-blue-500 rounded-md">
        <div class="flex items-center">
          <svg class="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm font-medium text-blue-700">
            {#if progressPercentage === 0}
              You haven't saved any answers yet. Please answer and save each question.
            {:else if progressPercentage === 100}
              All 5 of 5 questions saved! Thank you for completing your work preferences.
            {:else}
              {Math.round(progressPercentage / 20)} of 5 questions saved. Don't forget to save your answers!
            {/if}
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>