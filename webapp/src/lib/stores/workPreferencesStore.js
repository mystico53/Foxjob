// src/lib/stores/workPreferencesStore.js
import { writable } from 'svelte/store';

// Initial state matches the default in WorkPreferences.svelte
const initialSavedStatus = {
    answer1: false,
    answer2: false,
    answer3: false,
    answer4: false,
    answer5: false
};

// We'll store the savedStatus and loading state
const initialState = {
    loading: true,      // Reflects the loading state of the main component
    savedStatus: initialSavedStatus,
    questionsAvailable: false // Track if questions are ready/loaded
};

// Create the writable store
export const workPreferencesStore = writable(initialState);

// Optional helper function to calculate count (can be used by subscribers)
export function getSavedCount(storeValue) {
    if (!storeValue || !storeValue.savedStatus) return 0;
    return Object.values(storeValue.savedStatus).filter(Boolean).length;
}

// Optional helper for progress percentage
export function getProgressPercentage(storeValue) {
    const count = getSavedCount(storeValue);
    const totalQuestions = 5; // Assuming 5 questions
    return Math.round((count / totalQuestions) * 100);
}