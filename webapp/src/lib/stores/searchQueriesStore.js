// src/lib/stores/searchQueriesStore.js
import { writable, derived } from 'svelte/store';
import { authStore } from './authStore';
import { onSnapshot, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '$lib/firebase';

// Create the base store for search queries
const createSearchQueriesStore = () => {
  const { subscribe, set, update } = writable({
    queries: [],
    loading: false,
    error: null,
    unsubscribe: null
  });

  // Initialize listener for the current user's search queries
  const init = (userId) => {
    if (!userId) {
      set({ queries: [], loading: false, error: null, unsubscribe: null });
      return;
    }

    update(state => ({ ...state, loading: true, error: null }));

    try {
      // Delay Firestore operations to ensure authentication is fully established
      setTimeout(() => {
        try {
          // Create a reference to the search queries subcollection
          const queriesRef = collection(db, 'users', userId, 'searchQueries');
          
          // Set up the listener
          const unsubscribeFunc = onSnapshot(queriesRef, (snapshot) => {
            const queries = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                // Convert Firestore timestamps to JS dates if they exist
                createdAt: data.createdAt?.toDate() || null,
                updatedAt: data.updatedAt?.toDate() || null,
                lastRun: data.lastRun?.toDate() || null,
                nextRun: data.nextRun?.toDate() || null
              };
            });

            update(state => ({ 
              ...state, 
              queries, 
              loading: false 
            }));
          }, (err) => {
            console.warn("Error getting search queries:", err);
            update(state => ({ 
              ...state, 
              error: err.message, 
              loading: false 
            }));
          });

          // Store the unsubscribe function
          update(state => ({ ...state, unsubscribe: unsubscribeFunc }));
        } catch (err) {
          console.warn("Error initializing search queries listener:", err);
          update(state => ({ 
            ...state, 
            error: err.message, 
            loading: false 
          }));
        }
      }, 1500); // 1.5 second delay
    } catch (err) {
      console.warn("Error initializing search queries (outer):", err);
      update(state => ({ 
        ...state, 
        error: err.message, 
        loading: false 
      }));
    }
  };

  // Clean up function to unsubscribe from Firestore
  const cleanup = () => {
    update(state => {
      if (state.unsubscribe) {
        state.unsubscribe();
      }
      return { ...state, unsubscribe: null, queries: [], loading: false };
    });
  };

  // Refresh a single query by ID
  const refreshQuery = async (userId, queryId) => {
    if (!userId || !queryId) return;
    
    try {
      const docRef = doc(db, 'users', userId, 'searchQueries', queryId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedQuery = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
          lastRun: data.lastRun?.toDate() || null,
          nextRun: data.nextRun?.toDate() || null
        };
        
        update(state => {
          const newQueries = state.queries.map(q => 
            q.id === queryId ? updatedQuery : q
          );
          return { ...state, queries: newQueries };
        });
      }
    } catch (err) {
      console.error(`Error refreshing query ${queryId}:`, err);
    }
  };

  return {
    subscribe,
    init,
    cleanup,
    refreshQuery
  };
};

// Create the store instance
export const searchQueriesStore = createSearchQueriesStore();

// Create a derived store for active queries only
export const activeQueriesStore = derived(
  searchQueriesStore,
  $searchQueriesStore => $searchQueriesStore.queries.filter(query => query.isActive)
);

// Auto-initialize the store when auth changes
let unsubAuthStore = null;

// Setup the auto-initialization with proper cleanup
function setupAuthListener() {
  if (unsubAuthStore) unsubAuthStore();
  
  unsubAuthStore = authStore.subscribe(user => {
    if (user?.uid) {
      searchQueriesStore.init(user.uid);
    } else {
      searchQueriesStore.cleanup();
    }
  });
}

// Initialize the auth listener
setupAuthListener();