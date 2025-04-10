// $lib/stores/userStateStore.js
import { writable } from 'svelte/store';

// Work preferences initial state
const initialSavedStatus = {
    answer1: false,
    answer2: false,
    answer3: false,
    answer4: false,
    answer5: false
};

// Combined initial state
const initialState = {
    resume: {
        isUploaded: false,
        fileName: '',
        uploadTime: null,
        status: '' // Can be '', 'processing', 'processed', or 'error'
    },
    extension: {
        isProductionInstalled: false,
        isDevInstalled: false,
        checkComplete: false
    },
    workPreferences: {
        loading: true,
        savedStatus: initialSavedStatus,
        questionsAvailable: false
    }
};

// Create the writable store
export const userStateStore = writable(initialState);

// Resume helper functions
export function setResumeStatus(isUploaded, fileName = '', timestamp = null, status = '') {
    userStateStore.update(state => ({
        ...state,
        resume: {
            isUploaded,
            fileName,
            uploadTime: timestamp,
            status
        }
    }));
}

// Extension helper functions
export function setExtensionStatus(isProductionInstalled, isDevInstalled, checkComplete = true) {
    userStateStore.update(state => ({
        ...state,
        extension: {
            isProductionInstalled,
            isDevInstalled,
            checkComplete
        }
    }));
}

// Work preferences helper functions
export function setWorkPreferencesLoading(isLoading) {
    userStateStore.update(state => ({
        ...state,
        workPreferences: {
            ...state.workPreferences,
            loading: isLoading
        }
    }));
}

export function setQuestionsAvailable(available) {
    userStateStore.update(state => ({
        ...state,
        workPreferences: {
            ...state.workPreferences,
            questionsAvailable: available
        }
    }));
}

export function setSavedAnswer(questionNumber, saved) {
    userStateStore.update(state => {
        const updatedSavedStatus = {
            ...state.workPreferences.savedStatus,
            [`answer${questionNumber}`]: saved
        };
        
        return {
            ...state,
            workPreferences: {
                ...state.workPreferences,
                savedStatus: updatedSavedStatus
            }
        };
    });
}

// Helper functions to calculate saved count and progress
export function getSavedCount(storeValue) {
    if (!storeValue || !storeValue.workPreferences || !storeValue.workPreferences.savedStatus) return 0;
    return Object.values(storeValue.workPreferences.savedStatus).filter(Boolean).length;
}

export function getProgressPercentage(storeValue) {
    const count = getSavedCount(storeValue);
    const totalQuestions = 5; // Assuming 5 questions
    return Math.round((count / totalQuestions) * 100);
}

// Compatibility export for existing components that might use workPreferencesStore
export const workPreferencesStore = {
    subscribe: callback => {
        return userStateStore.subscribe(state => {
            callback({
                loading: state.workPreferences.loading,
                savedStatus: state.workPreferences.savedStatus,
                questionsAvailable: state.workPreferences.questionsAvailable
            });
        });
    }
};