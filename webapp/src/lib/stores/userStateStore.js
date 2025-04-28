// $lib/stores/userStateStore.js
import { writable } from 'svelte/store';

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