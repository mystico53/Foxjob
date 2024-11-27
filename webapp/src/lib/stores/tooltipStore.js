// src/lib/stores/tooltipStore.js
import { writable } from 'svelte/store';

const createTooltipStore = () => {
    const { subscribe, set, update } = writable({
        showNavbarTooltip: false,
        hasCompletedOnboarding: false
    });

    return {
        subscribe,
        showNavbarTooltip: () => {
            update(state => ({
                ...state,
                showNavbarTooltip: true
            }));
        },
        hideNavbarTooltip: () => {
            update(state => ({
                ...state,
                showNavbarTooltip: false,
                hasCompletedOnboarding: true
            }));
        }
    };
};

export const tooltipStore = createTooltipStore();