// src/lib/stores/tooltipStore.js
import { writable } from 'svelte/store';

const createTooltipStore = () => {
    const { subscribe, set, update } = writable({
        showNavbarTooltip: false,
        showThirdTooltip: false,  // Add this new state
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
                showThirdTooltip: true  // Show third tooltip when closing navbar tooltip
            }));
        },
        hideThirdTooltip: () => {
            update(state => ({
                ...state,
                showThirdTooltip: false,
                hasCompletedOnboarding: true
            }));
        }
    };
};

export const tooltipStore = createTooltipStore();