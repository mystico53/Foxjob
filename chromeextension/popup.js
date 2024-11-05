// popup.js

import Counter from './counter.js';

let statusDiv;
let popupContainer;
let collectedStatusDiv;
let libraryButton;

document.addEventListener('DOMContentLoaded', initializePopup);

function updateCounter() {
  console.log('updateCounter called');
  Counter.get().then(count => {
    console.log('Retrieved count:', count);
    const counterElement = document.getElementById('counterNumber');
    if (counterElement) {
      console.log('Updating counter element');
      counterElement.textContent = `${count}`;
    } else {
      console.error('Counter element not found');
    }
  }).catch(error => {
    console.error('Error getting counter:', error);
  });
}

function initializePopup() {
  statusDiv = document.getElementById('status');
  popupContainer = document.getElementById('popup-container');
  collectedStatusDiv = document.getElementById('collectedStatus');
  libraryButton = document.getElementById('libraryButton');

  // Initialize library button click handler
  if (libraryButton) {
    libraryButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://jobille-45494.web.app/' });
    });
  }

  const signInOutButton = document.getElementById('signInOutButton');
  if (signInOutButton) {
    signInOutButton.addEventListener('click', handleSignInOut);
  } else {
    console.error('Sign In/Out button not found');
  }

  // Check initial auth state from storage
  chrome.storage.local.get(['userId', 'userName'], function(result) {
    if (result.userId) {
      console.log('User is signed in');
      updateSignInButtonState(true, result.userName);
      updateStatus('Signed in. Processing text...');
      toggleLibraryButton(true);

      // Automatically trigger the main action
      injectContentScriptAndProcess();
    } else {
      console.log('User is signed out');
      updateSignInButtonState(false);
      updateStatus('Please sign in to process text');
      toggleLibraryButton(false);
    }
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
    if (request.action === 'updateCounter') {
      console.log('Updating counter with new count:', request.count);
      updateCounter();
    }
    
    if (request.action === 'updateStatus') {
      updateStatus(request.message, request.isLoading);
    } else if (request.action === 'authStateChanged') {
      if (request.user) {
        updateSignInButtonState(true, request.user.displayName);
        updateStatus('Signed in. Ready to process text.');
        toggleLibraryButton(true);
      } else {
        updateSignInButtonState(false);
        updateStatus('Please sign in to process text');
        toggleLibraryButton(false);
      }
    }
  });

  updateCounter();
}

function toggleLibraryButton(show) {
  if (libraryButton) {
    if (show) {
      libraryButton.classList.remove('hidden');
    } else {
      libraryButton.classList.add('hidden');
    }
  } else {
    console.error('Library button not found');
  }
}

function handleSignInOut() {
  const button = document.getElementById('signInOutButton');
  if (button.textContent.startsWith('Sign In')) {
    // Initiate sign-in via background.js
    chrome.runtime.sendMessage({ type: 'start-auth' }, (response) => {
      if (response.success) {
        console.log('Authentication initiated');
        updateStatus('Authentication in progress...');
      } else {
        console.error('Authentication initiation failed:', response.error);
        updateStatus('Error: ' + response.error);
      }
    });
  } else {
    // Initiate sign-out via background.js
    chrome.runtime.sendMessage({ type: 'sign-out' }, (response) => {
      if (response.success) {
        console.log('User signed out');
        updateSignInButtonState(false);
        updateStatus('Signed out successfully.');
      } else {
        console.error('Sign-out failed:', response.error);
        updateStatus('Error: ' + response.error);
      }
    });
  }
}

function injectContentScriptAndProcess() {
  chrome.windows.getAll({ windowTypes: ['normal'] }, function(windows) {
    let lastFocusedWindow = windows.find(w => w.focused);

    if (!lastFocusedWindow) {
      // If no window is focused, default to the first one
      lastFocusedWindow = windows[0];
    }

    chrome.tabs.query({ active: true, windowId: lastFocusedWindow.id }, function(tabs) {
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        console.error('No valid active tab found');
        updateStatus('Error: No valid active tab found');
        return;
      }

      // Proceed with your logic to inject content scripts and process
      chrome.tabs.sendMessage(activeTab.id, { action: "ping" }, function(response) {
        if (chrome.runtime.lastError || !response) {
          // Content script is not injected, inject it now
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              files: ['content.js']
            },
            function() {
              if (chrome.runtime.lastError) {
                updateStatus('Error injecting script: ' + chrome.runtime.lastError.message);
              } else {
                // Add a small delay before processing
                setTimeout(() => selectAllTextAndProcess(activeTab.id), 100);
              }
            }
          );
        } else {
          // Content script is already injected
          selectAllTextAndProcess(activeTab.id);
        }
      });
    });
  });
}

function selectAllTextAndProcess(tabId) {
  updateStatus('Processing text...', true);

  try {
    chrome.tabs.sendMessage(tabId, { action: "selectAllText" }, async function(response) {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        updateStatus('Error: ' + chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
          // Immediately set to 100% without animation
          progressBar.style.transition = 'none';
          progressBar.style.width = '100%';
        }
        if (statusDiv) {
          statusDiv.textContent = 'Completed';
        }
      } else if (response && response.error) {
        updateStatus('Error: ' + response.error);
        console.error('Processing error:', response.error);
      } else {
        updateStatus('Unexpected response from processing.');
        console.error('Unexpected response:', response);
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    updateStatus('Error: Unable to communicate with the page');
  }
}

function startProgress() {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'width 1500ms linear';
    progressBar.style.width = '0%';
    // Force a reflow
    progressBar.offsetHeight;
    progressBar.style.width = '100%';
  } else {
    console.error('Progress bar not found');
  }
}

function resetProgress() {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
  } else {
    console.error('Progress bar not found');
  }
}

// Updated updateStatus function
function updateStatus(message, isLoading = false) {
  if (statusDiv) {
    statusDiv.textContent = message;
    if (isLoading && message !== 'Completed') {
      startProgress();
    } else if (message !== 'Completed') {
      resetProgress();
    }
  } else {
    console.error('Status div not found');
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
  } else {
    console.error('Sign In/Out button not found');
  }
}