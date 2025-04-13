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
        questionsAvailable: false,
        status: '' // Can be '', 'pending', 'ready', or 'error'
    },
    // Add jobAgent state to track the job agent status
    jobAgent: {
        hasActiveAgent: false,
        isLoading: false,
        lastChecked: null,
        agentId: null
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

export function setQuestionsStatus(status) {
    userStateStore.update(state => ({
        ...state,
        workPreferences: {
            ...state.workPreferences,
            status: status
        }
    }));
}

export function setQuestionsAvailable(available) {
    userStateStore.update(state => ({
        ...state,
        workPreferences: {
            ...state.workPreferences,
            questionsAvailable: available,
            status: available ? 'ready' : state.workPreferences.status
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

export function resetAnswerProgress() {
    userStateStore.update(state => ({
        ...state,
        workPreferences: {
            ...state.workPreferences,
            savedStatus: initialSavedStatus,
            questionsAvailable: false,
            status: ''
        }
    }));
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

// Job Agent helper functions
export function setJobAgentStatus(hasActiveAgent, agentId = null) {
    userStateStore.update(state => ({
        ...state,
        jobAgent: {
            ...state.jobAgent,
            hasActiveAgent,
            agentId,
            lastChecked: new Date()
        }
    }));
}

export function setJobAgentLoading(isLoading) {
    userStateStore.update(state => ({
        ...state,
        jobAgent: {
            ...state.jobAgent,
            isLoading
        }
    }));
}

export function resetJobAgentStatus() {
    userStateStore.update(state => ({
        ...state,
        jobAgent: {
            hasActiveAgent: false,
            isLoading: false,
            lastChecked: new Date(),
            agentId: null
        }
    }));
}

// Compatibility export for existing components that might use workPreferencesStore
export const workPreferencesStore = {
    subscribe: callback => {
        return userStateStore.subscribe(state => {
            callback({
                loading: state.workPreferences.loading,
                savedStatus: state.workPreferences.savedStatus,
                questionsAvailable: state.workPreferences.questionsAvailable,
                status: state.workPreferences.status
            });
        });
    }
};

// Export jobAgentStore for components that need only job agent data
export const jobAgentStore = {
    subscribe: callback => {
        return userStateStore.subscribe(state => {
            callback({
                hasActiveAgent: state.jobAgent.hasActiveAgent,
                isLoading: state.jobAgent.isLoading,
                lastChecked: state.jobAgent.lastChecked,
                agentId: state.jobAgent.agentId
            });
        });
    }
};