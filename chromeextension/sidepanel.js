
// sidepanel.js

import Counter from './counter.js';

let statusDiv;
let panelContainer;

document.addEventListener('DOMContentLoaded', initializePanel);

function updateCounters() {
    Counter.get().then(count => {
        ['miniCounter', 'expandedCounter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = count;
            }
        });
    }).catch(error => {
        console.error('Error getting counter:', error);
    });
}

function initializePanel() {
    statusDiv = document.getElementById('status');
    panelContainer = document.getElementById('panel-container');

    const signInOutButton = document.getElementById('signInOutButton');
    if (signInOutButton) {
        signInOutButton.addEventListener('click', handleSignInOut);
    }

    // Check initial auth state
    chrome.storage.local.get(['userId', 'userName'], function(result) {
        if (result.userId) {
            updateSignInButtonState(true, result.userName);
            updateStatus('Signed in. Ready to process text.');
        } else {
            updateSignInButtonState(false);
            updateStatus('Please sign in to process text');
        }
    });

    // Listen for messages
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateCounter') {
            updateCounters();
        } else if (request.action === 'updateStatus') {
            updateStatus(request.message, request.isLoading);
        } else if (request.action === 'authStateChanged') {
            if (request.user) {
                updateSignInButtonState(true, request.user.displayName);
                updateStatus('Signed in. Ready to process text.');
            } else {
                updateSignInButtonState(false);
                updateStatus('Please sign in to process text');
            }
        }
    });

    updateCounters();
}

function handleSignInOut() {
    const button = document.getElementById('signInOutButton');
    if (button.textContent.startsWith('Sign In')) {
        chrome.runtime.sendMessage({ type: 'start-auth' });
    } else {
        chrome.runtime.sendMessage({ type: 'sign-out' });
    }
}

function updateStatus(message, isLoading = false) {
    if (statusDiv) {
        statusDiv.textContent = message;
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = isLoading ? 'block' : 'none';
        }
    }
}

function updateSignInButtonState(isSignedIn, displayName = '') {
    const button = document.getElementById('signInOutButton');
    if (button) {
        if (isSignedIn) {
            button.textContent = `Sign Out (${displayName})`;
            button.title = `Signed in as ${displayName}`;
        } else {
            button.textContent = 'Sign In';
            button.title = '';
        }
    }
}