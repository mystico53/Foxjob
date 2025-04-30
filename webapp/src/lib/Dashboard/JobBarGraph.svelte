<script>
    import { onMount, onDestroy } from 'svelte';
    import { jobStatsStore } from '$lib/stores/jobStatsStore';
    import { authStore } from '$lib/stores/authStore';
    
    let userId;
    let unsubscribe;
    
    // Subscribe to auth store to get the userId
    onMount(() => {
      unsubscribe = authStore.subscribe(user => {
        userId = user?.uid;
        if (userId) {
          console.log('JobBarGraph: Initializing jobStatsStore with userId', userId);
          jobStatsStore.init(userId);
        }
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
        jobStatsStore.cleanup();
      };
    });
  </script>
  
  <div>
    <h3>Job Stats Debug</h3>
    <pre>
      Check console for debug output
    </pre>
  </div>