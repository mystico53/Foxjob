// $lib/stores/userStateStore.js
import { writable } from 'svelte/store';

// ✅ DECLARE jobAgentStore FIRST before using it in functions
export const jobAgentStore = writable({
	hasActiveAgent: null,
	isLoading: false
});

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
	userStateStore.update((state) => ({
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
	userStateStore.update((state) => ({
		...state,
		extension: {
			isProductionInstalled,
			isDevInstalled,
			checkComplete
		}
	}));
}

// Job Agent helper functions
export function setJobAgentStatus(hasAgent, agentId, isActive = true) {
	// Update both stores to maintain consistency
	userStateStore.update((state) => ({
		...state,
		jobAgent: {
			...state.jobAgent,
			hasActiveAgent: hasAgent ? { agentId, isActive } : null,
			isLoading: false,
			lastChecked: new Date()
		}
	}));

	jobAgentStore.update((state) => ({
		...state,
		hasActiveAgent: hasAgent ? { agentId, isActive } : null,
		isLoading: false
	}));
}

export function setJobAgentLoading(isLoading) {
	// Update both stores to maintain consistency
	userStateStore.update((state) => ({
		...state,
		jobAgent: {
			...state.jobAgent,
			isLoading
		}
	}));

	jobAgentStore.update((state) => ({
		...state,
		isLoading
	}));
}

export function resetJobAgentStatus() {
	// Update both stores to maintain consistency
	const resetState = {
		hasActiveAgent: null,
		isLoading: false
	};

	userStateStore.update((state) => ({
		...state,
		jobAgent: {
			...resetState,
			lastChecked: new Date()
		}
	}));

	jobAgentStore.set(resetState);
}
