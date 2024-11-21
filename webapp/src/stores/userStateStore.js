// lib/stores/userStateStore.js
import { writable } from 'svelte/store';

const initialState = {
    resume: {
        isUploaded: false,
        fileName: '',
        uploadTime: null
    }
    // We can add more state here later:
    // extension: { isInstalled: false },
    // onboarding: { isComplete: false },
    // etc.
};

export const userStateStore = writable(initialState);

// Helper functions to update store
export function setResumeStatus(isUploaded, fileName = '', timestamp = null) {
    userStateStore.update(state => ({
        ...state,
        resume: {
            isUploaded,
            fileName,
            uploadTime: timestamp
        }
    }));
}