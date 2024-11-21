// $lib/stores/userStateStore.js
import { writable } from 'svelte/store';

const initialState = {
    resume: {
        isUploaded: false,
        fileName: '',
        uploadTime: null
    },
    extension: {
        isProductionInstalled: false,
        isDevInstalled: false,
        checkComplete: false
    }
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